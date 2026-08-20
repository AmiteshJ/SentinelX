"""Investigation workspace (spec §40): assembles an incident's full context —
alerts, timeline, threat intel already on file, and (optionally) an AI
explanation — from real data across Postgres + MongoDB."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.mongodb import get_mongo_db
from app.db.postgres import get_db
from app.models.detection import Incident

router = APIRouter(prefix="/api/investigation", tags=["investigation"])


@router.get("/{incident_id}")
async def get_investigation(incident_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    mongo_db = get_mongo_db()
    alert_ids = incident.mongo_alert_ids or []
    alerts = []
    if alert_ids:
        from bson import ObjectId
        cursor = mongo_db.alerts.find({"_id": {"$in": [ObjectId(a) for a in alert_ids]}}).sort("created_at", 1)
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            alerts.append(doc)

    affected_ips = sorted({a.get("source_ip") for a in alerts if a.get("source_ip")} | {a.get("destination_ip") for a in alerts if a.get("destination_ip")})
    mitre_techniques = sorted({a.get("mitre_technique") for a in alerts if a.get("mitre_technique")})

    return {
        "incident": {
            "id": str(incident.id),
            "title": incident.title,
            "severity": incident.severity,
            "status": incident.status,
            "risk_score": incident.risk_score,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
        },
        "timeline": [{"timestamp": a["created_at"], "event": f"{a['rule_name']} triggered"} for a in alerts],
        "alerts": alerts,
        "affected_assets": {"ips": affected_ips},
        "mitre_techniques": mitre_techniques,
    }
