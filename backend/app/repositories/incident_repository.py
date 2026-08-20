from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.detection import Incident

SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


async def find_correlatable_incident(db: AsyncSession, *, source_ip: str, window_minutes: int = 30) -> Incident | None:
    """Naive graph-correlation stand-in (spec §11 full graph traversal is a
    later-phase enhancement): group alerts sharing a source IP within a
    rolling time window into the same incident, rather than a full
    node/edge attack-chain graph. This is intentionally simple and
    documented as such — see docs/architecture.md Phase 11."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    result = await db.execute(
        select(Incident)
        .where(Incident.title.like(f"%{source_ip}%"), Incident.updated_at >= cutoff, Incident.status != "closed")
        .order_by(Incident.updated_at.desc())
    )
    return result.scalars().first()


async def create_incident(db: AsyncSession, *, source_ip: str, severity: str, alert_mongo_id: str) -> Incident:
    incident = Incident(
        title=f"Correlated activity from {source_ip}",
        severity=severity,
        status="open",
        risk_score=None,
        mongo_alert_ids=[alert_mongo_id],
    )
    db.add(incident)
    await db.flush()
    return incident


async def append_alert_to_incident(db: AsyncSession, incident: Incident, *, alert_mongo_id: str, severity: str) -> Incident:
    ids = list(incident.mongo_alert_ids or [])
    if alert_mongo_id not in ids:
        ids.append(alert_mongo_id)
    incident.mongo_alert_ids = ids
    if SEVERITY_RANK.get(severity, 0) > SEVERITY_RANK.get(incident.severity, 0):
        incident.severity = severity
    await db.flush()
    return incident
