from pydantic import BaseModel


class SystemHealth(BaseModel):
    postgres: bool
    mongodb: bool
    redis: bool
    detection_engine: bool = False  # true once Phase 6+ detection workers are running


class DashboardOverview(BaseModel):
    """
    All fields are derived from real backend/database state. In Phase 1-2 this
    will legitimately be all zeros / defaults until ingestion (Phase 4+) and
    detection (Phase 6+) exist — that is expected and correct, not a bug.
    """
    system_health: SystemHealth
    monitoring_mode: str = "OFFLINE"  # LIVE | DATASET | REPLAY | OFFLINE
    active_incidents: int = 0
    critical_alerts: int = 0
    high_alerts: int = 0
    medium_alerts: int = 0
    low_alerts: int = 0
    events_per_second: float = 0.0
