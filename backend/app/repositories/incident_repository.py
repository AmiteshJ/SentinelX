from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.detection import Incident

SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


import uuid

async def find_correlatable_incident(
    db: AsyncSession,
    *,
    source_ip: str,
    user_id: uuid.UUID | str | None = None,
    hostname: str | None = None,
    window_minutes: int = 30
) -> Incident | None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    stmt = (
        select(Incident)
        .where(Incident.title.like(f"%{source_ip}%"), Incident.updated_at >= cutoff, Incident.status != "closed")
    )
    if user_id:
        uid = uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id
        stmt = stmt.where(Incident.user_id == uid)
    if hostname:
        stmt = stmt.where(Incident.hostname == hostname)

    stmt = stmt.order_by(Incident.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_incident(
    db: AsyncSession,
    *,
    source_ip: str,
    severity: str,
    alert_mongo_id: str,
    user_id: uuid.UUID | str | None = None,
    hostname: str | None = None
) -> Incident:
    uid = uuid.UUID(str(user_id)) if (user_id and isinstance(user_id, str)) else user_id
    incident = Incident(
        title=f"Correlated activity from {source_ip}",
        severity=severity,
        status="open",
        risk_score=None,
        mongo_alert_ids=[alert_mongo_id],
        user_id=uid,
        hostname=hostname,
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
