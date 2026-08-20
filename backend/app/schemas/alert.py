from datetime import datetime

from pydantic import BaseModel


class AlertOut(BaseModel):
    id: str
    event_id: str
    rule_id: str
    rule_name: str
    severity: str
    mitre_technique: str | None = None
    source_ip: str | None = None
    destination_ip: str | None = None
    status: str = "open"  # open | investigating | resolved
    created_at: datetime


class EventOut(BaseModel):
    id: str
    timestamp: datetime
    source_ip: str
    destination_ip: str | None = None
    destination_port: int | None = None
    protocol: str | None = None
    mode: str


class IncidentOut(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    risk_score: float | None = None
    alert_count: int
    created_at: datetime
    updated_at: datetime
