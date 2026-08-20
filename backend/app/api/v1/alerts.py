"""
Read APIs for alerts (MongoDB) and incidents (PostgreSQL) — spec §30 "Security
Operations" merges these into one page client-side; the backend keeps them as
separate resources per the polyglot database split (docs/database.md).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.mongodb import get_mongo_db
from app.db.postgres import get_db
from app.models.detection import Incident

router = APIRouter(prefix="/api", tags=["security-operations"])


@router.get("/alerts")
async def list_alerts(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    severity: str | None = None,
    status: str | None = None,
    user=Depends(get_current_user),
):
    query: dict = {}
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status

    alerts = []
    total = 0
    try:
        mongo_db = get_mongo_db()
        cursor = mongo_db.alerts.find(query).sort("created_at", -1).skip(offset).limit(limit)
        async for doc in cursor:
            alerts.append(
                {
                    "id": str(doc["_id"]),
                    "event_id": doc.get("event_id"),
                    "rule_id": doc.get("rule_id"),
                    "rule_name": doc.get("rule_name"),
                    "severity": doc.get("severity"),
                    "mitre_technique": doc.get("mitre_technique"),
                    "source_ip": doc.get("source_ip"),
                    "destination_ip": doc.get("destination_ip"),
                    "status": doc.get("status", "open"),
                    "created_at": doc.get("created_at"),
                }
            )
        total = await mongo_db.alerts.count_documents(query)
    except Exception:
        alerts = []
        total = 0

    return {"items": alerts, "total": total, "limit": limit, "offset": offset}



@router.get("/incidents")
async def list_incidents(
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    stmt = select(Incident).order_by(Incident.updated_at.desc()).offset(offset).limit(limit)
    if status:
        stmt = stmt.where(Incident.status == status)
    result = await db.execute(stmt)
    incidents = result.scalars().all()
    return {
        "items": [
            {
                "id": str(i.id),
                "title": i.title,
                "severity": i.severity,
                "status": i.status,
                "risk_score": i.risk_score,
                "alert_count": len(i.mongo_alert_ids or []),
                "created_at": i.created_at.isoformat(),
                "updated_at": i.updated_at.isoformat(),
            }
            for i in incidents
        ],
        "limit": limit,
        "offset": offset,
    }
