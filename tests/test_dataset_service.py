"""
Unit tests for the CSV dataset ingestion pipeline (spec §4). Uses a tiny
in-memory CSV constructed only to exercise column-resolution and cleaning
logic — not a real security dataset.
"""
import sys
from io import StringIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import pandas as pd  # noqa: E402

from app.services.dataset_service import (  # noqa: E402
    DatasetValidationError,
    clean_dataframe,
    load_csv,
    to_events,
)

SAMPLE_CSV = """Source IP, Destination IP, Destination Port, Protocol, Flow Duration, Label
10.0.0.1,203.0.113.5,4444,TCP,120,DoS
10.0.0.1,203.0.113.5,4444,TCP,120,DoS
10.0.0.2,203.0.113.9,443,TCP,55,BENIGN
"""


def test_load_csv_normalizes_headers():
    df = load_csv(SAMPLE_CSV.encode())
    assert "source ip" in df.columns
    assert "destination port" in df.columns


def test_clean_dataframe_drops_duplicates():
    df = load_csv(SAMPLE_CSV.encode())
    cleaned = clean_dataframe(df)
    assert len(cleaned) == 2  # the exact duplicate row is removed


def test_to_events_maps_known_columns():
    df = clean_dataframe(load_csv(SAMPLE_CSV.encode()))
    events = list(to_events(df))
    assert len(events) == 2
    first = next(e for e in events if e.destination_port == 4444)
    assert first.source_ip == "10.0.0.1"
    assert first.destination_ip == "203.0.113.5"
    assert first.label == "DoS"


def test_to_events_preserves_unrecognized_columns_in_raw():
    csv_with_extra = "Source IP,Weird Custom Field\n10.0.0.1,something\n"
    df = load_csv(csv_with_extra.encode())
    events = list(to_events(df))
    assert events[0].raw.get("weird custom field") == "something"


def test_missing_source_ip_column_raises():
    bad_csv = "Foo,Bar\n1,2\n"
    df = load_csv(bad_csv.encode())
    try:
        list(to_events(df))
        assert False, "expected DatasetValidationError"
    except DatasetValidationError:
        pass
