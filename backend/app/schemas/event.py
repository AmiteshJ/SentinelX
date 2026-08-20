"""
Canonical event schema. This is the shape every telemetry source normalizes
to before entering the pipeline — whether it comes from the (future) live
SentinelX Agent, a CSV dataset row (CIC-IDS2017/CSE-CIC-IDS2018-style), or a
timestamped replay. Detection rules and the anomaly/graph modules are all
written against this shape, not against source-specific formats.
"""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class IngestMode(str, Enum):
    LIVE = "LIVE"
    DATASET = "DATASET"
    REPLAY = "REPLAY"


class EventIn(BaseModel):
    timestamp: datetime | None = None  # defaults to ingestion time if omitted (LIVE mode)
    source_ip: str
    destination_ip: str | None = None
    destination_port: int | None = None
    protocol: str | None = None
    duration_ms: float | None = None
    bytes_sent: float | None = None
    bytes_received: float | None = None
    dns_query: str | None = None
    label: str | None = None  # only present for DATASET/REPLAY rows (ground-truth class, not used by rules)
    raw: dict[str, Any] = Field(default_factory=dict)  # source-specific extra fields, preserved as-is


class IngestRequest(BaseModel):
    mode: IngestMode
    events: list[EventIn] = Field(min_length=1, max_length=500)


class IngestResponse(BaseModel):
    accepted: int
    mode: IngestMode
