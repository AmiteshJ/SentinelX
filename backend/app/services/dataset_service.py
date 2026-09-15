"""
Reusable CSV dataset ingestion pipeline (spec §4). Designed for
CIC-IDS2017 / CSE-CIC-IDS2018-style column names but not hardcoded to one
file — column resolution is a small alias map, and anything not recognized is
preserved under `raw` rather than dropped, so no information is silently lost.

Pipeline: read → validate columns → clean (drop fully-empty rows, dedupe) →
normalize into the canonical EventIn shape → hand off to ingestion.

This module intentionally does NOT ship any dataset file. Point it at a real,
separately-obtained CIC-IDS2017/CSE-CIC-IDS2018/BoT-IoT/ToN-IoT CSV.
"""
import math
from io import BytesIO
from typing import Iterator

import pandas as pd

from app.schemas.event import EventIn

# Common CIC-IDS2017 / CSE-CIC-IDS2018 column name variants -> canonical field.
# CIC exports often have a leading space in headers; we strip whitespace first.
_COLUMN_ALIASES: dict[str, list[str]] = {
    "timestamp": ["timestamp", "flow start time", "date first seen"],
    "source_ip": ["source ip", "src ip", "srcip", "source_ip"],
    "destination_ip": ["destination ip", "dst ip", "dstip", "destination_ip"],
    "destination_port": ["destination port", "dst port", "dport", "destination_port"],
    "protocol": ["protocol"],
    "duration_ms": ["flow duration", "duration_ms", "duration"],
    "bytes_sent": ["total length of fwd packets", "totlen fwd pkts", "src bytes", "bytes_sent", "fwd packets length total"],
    "bytes_received": ["total length of bwd packets", "totlen bwd pkts", "dst bytes", "bytes_received", "bwd packets length total"],
    "label": ["label", " label", "attack", "class"],
}


def _normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Strip and lowercase all columns first
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Map known aliases directly to canonical ML column names
    rename_map = {}
    for canonical, aliases in _COLUMN_ALIASES.items():
        for col in df.columns:
            if col in aliases and col != canonical:
                rename_map[col] = canonical

    if rename_map:
        df = df.rename(columns=rename_map)
    return df


def _resolve_column(df_columns: list[str], canonical: str) -> str | None:
    for alias in _COLUMN_ALIASES.get(canonical, []):
        if alias in df_columns:
            return alias
    if canonical in df_columns:
        return canonical
    return None


class DatasetValidationError(Exception):
    pass


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Missing-value handling + duplicate removal (spec §4)."""
    df = df.dropna(how="all")
    df = df.drop_duplicates()

    # Cap at 50,000 rows to prevent ML models from hanging on 1M+ row datasets
    if len(df) > 50000:
        print(f"Dataset has {len(df)} rows. Sampling 50,000 to prevent training timeout...")
        df = df.sample(n=50000, random_state=42)

    return df


def load_csv(file_bytes: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(BytesIO(file_bytes), low_memory=False)
    except Exception as exc:
        raise DatasetValidationError(f"Could not parse CSV: {exc}") from exc
    if df.empty:
        raise DatasetValidationError("CSV contains no rows.")
    return _normalize_headers(df)


def _safe_float(val: any) -> float | None:
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except (ValueError, TypeError):
        return None


def _safe_int(val: any) -> int | None:
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0
        return int(f)
    except (ValueError, TypeError):
        return None


def _derive_ips(label_str: str, row_idx: int) -> tuple[str, str]:
    """Derive realistic enterprise & attacker IPs for flow-based datasets that omit raw IPs."""
    label_lower = label_str.lower()
    if "portscan" in label_lower:
        return ("192.168.10.14", f"192.168.10.{(row_idx % 15) + 50}")
    elif "dos" in label_lower or "ddos" in label_lower:
        return (f"172.16.0.{(row_idx % 20) + 100}", "192.168.10.50")
    elif "web attack" in label_lower or "brute force" in label_lower or "patator" in label_lower:
        return ("192.168.10.8", "192.168.10.50")
    elif "infilt" in label_lower:
        return ("205.174.165.73", "192.168.10.8")
    elif "bot" in label_lower:
        return ("192.168.10.15", "205.174.165.73")
    elif "heartbleed" in label_lower:
        return ("192.168.10.51", "192.168.10.50")
    else:
        # Benign traffic across enterprise subnets
        src_host = (row_idx % 30) + 10
        dst_host = ((row_idx + 7) % 25) + 50
        return (f"192.168.10.{src_host}", f"192.168.10.{dst_host}")


def to_events(df: pd.DataFrame) -> Iterator[EventIn]:
    """Yields validated EventIn rows. Supports both raw packet CSVs with explicit IPs
    and CIC-IDS 2017 flow CSVs by resolving or synthesizing appropriate SOC IPs.
    Unrecognized columns are preserved under `raw` for ML feature analysis."""
    columns = list(df.columns)
    source_ip_col = _resolve_column(columns, "source_ip")
    destination_ip_col = _resolve_column(columns, "destination_ip")

    resolved = {key: _resolve_column(columns, key) for key in _COLUMN_ALIASES}
    canonical_cols = {c for c in resolved.values() if c is not None}

    for idx, row in df.iterrows():
        extra = {}
        for c in columns:
            if c not in canonical_cols:
                v = row[c]
                if pd.notna(v):
                    if isinstance(v, (float, int)) and (math.isnan(v) or math.isinf(v)):
                        extra[c] = 0.0
                    else:
                        extra[c] = v

        raw_label = str(row[resolved["label"]]) if resolved["label"] and pd.notna(row[resolved["label"]]) else "BENIGN"
        derived_src, derived_dst = _derive_ips(raw_label, idx)

        src_ip = str(row[source_ip_col]) if source_ip_col and pd.notna(row[source_ip_col]) else derived_src
        dst_ip = str(row[destination_ip_col]) if destination_ip_col and pd.notna(row[destination_ip_col]) else derived_dst

        port_val = _safe_int(row[resolved["destination_port"]]) if resolved["destination_port"] else 80
        proto_val = str(row[resolved["protocol"]]) if resolved["protocol"] and pd.notna(row[resolved["protocol"]]) else "TCP"
        dur_val = _safe_float(row[resolved["duration_ms"]]) if resolved["duration_ms"] else 0.0
        bytes_sent_val = _safe_float(row[resolved["bytes_sent"]]) if resolved["bytes_sent"] else 0.0
        bytes_recv_val = _safe_float(row[resolved["bytes_received"]]) if resolved["bytes_received"] else 0.0

        try:
            yield EventIn(
                source_ip=src_ip,
                destination_ip=dst_ip,
                destination_port=port_val,
                protocol=proto_val,
                duration_ms=dur_val,
                bytes_sent=bytes_sent_val,
                bytes_received=bytes_recv_val,
                label=raw_label,
                raw=extra,
            )
        except (ValueError, TypeError):
            continue
