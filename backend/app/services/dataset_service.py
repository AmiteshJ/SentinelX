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
from io import BytesIO
from typing import Iterator

import pandas as pd

from app.schemas.event import EventIn

# Common CIC-IDS2017 / CSE-CIC-IDS2018 column name variants -> canonical field.
# CIC exports often have a leading space in headers; we strip whitespace first.
_COLUMN_ALIASES: dict[str, list[str]] = {
    "timestamp": ["timestamp", "flow start time", "date first seen"],
    "source_ip": ["source ip", "src ip", "srcip"],
    "destination_ip": ["destination ip", "dst ip", "dstip"],
    "destination_port": ["destination port", "dst port", "dport"],
    "protocol": ["protocol"],
    "duration_ms": ["flow duration"],
    "bytes_sent": ["total length of fwd packets", "totlen fwd pkts", "src bytes"],
    "bytes_received": ["total length of bwd packets", "totlen bwd pkts", "dst bytes"],
    "label": ["label", " label"],
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


def to_events(df: pd.DataFrame) -> Iterator[EventIn]:
    """Yields validated EventIn rows. A source_ip column is required; every
    other canonical field is optional and simply omitted if not present.
    Unrecognized columns are preserved under `raw` for later analysis (e.g. by
    the ML pipelines in ml/) rather than discarded."""
    columns = list(df.columns)
    source_ip_col = _resolve_column(columns, "source_ip")
    if source_ip_col is None:
        raise DatasetValidationError(
            "CSV must contain a source IP column (e.g. 'Source IP', 'Src IP')."
        )

    resolved = {key: _resolve_column(columns, key) for key in _COLUMN_ALIASES}
    canonical_cols = {c for c in resolved.values() if c is not None}

    for _, row in df.iterrows():
        extra = {c: row[c] for c in columns if c not in canonical_cols and pd.notna(row[c])}
        try:
            yield EventIn(
                source_ip=str(row[source_ip_col]),
                destination_ip=str(row[resolved["destination_ip"]]) if resolved["destination_ip"] and pd.notna(row[resolved["destination_ip"]]) else None,
                destination_port=int(row[resolved["destination_port"]]) if resolved["destination_port"] and pd.notna(row[resolved["destination_port"]]) else None,
                protocol=str(row[resolved["protocol"]]) if resolved["protocol"] and pd.notna(row[resolved["protocol"]]) else None,
                duration_ms=float(row[resolved["duration_ms"]]) if resolved["duration_ms"] and pd.notna(row[resolved["duration_ms"]]) else None,
                bytes_sent=float(row[resolved["bytes_sent"]]) if resolved["bytes_sent"] and pd.notna(row[resolved["bytes_sent"]]) else None,
                bytes_received=float(row[resolved["bytes_received"]]) if resolved["bytes_received"] and pd.notna(row[resolved["bytes_received"]]) else None,
                label=str(row[resolved["label"]]) if resolved["label"] and pd.notna(row[resolved["label"]]) else None,
                raw=extra,
            )
        except (ValueError, TypeError):
            continue  # skip malformed row rather than crash the whole ingest
