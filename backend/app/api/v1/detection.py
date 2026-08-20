"""
On-demand anomaly detection over real ingested events (spec §10). Training is
triggered explicitly (not on a fake schedule) so the response always reflects
actual data volume — including honestly reporting when there isn't enough yet.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_role
from app.db.mongodb import get_mongo_db
from app.detection.anomaly_engine import NotEnoughDataError, train_and_score

router = APIRouter(prefix="/api/detection", tags=["detection"])


@router.post("/anomaly/run")
async def run_anomaly_detection(
    limit: int = 2000,
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    mongo_db = get_mongo_db()
    events = await mongo_db.events.find({}).sort("ingested_at", -1).limit(limit).to_list(length=limit)

    try:
        results = train_and_score(events)
    except NotEnoughDataError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    anomalies = [r for r in results if r.is_anomaly]
    if anomalies:
        docs = [
            {
                "event_id": r.event_id,
                "anomaly_score": r.anomaly_score,
                "features": r.features,
                "scored_at": datetime.now(timezone.utc).isoformat(),
            }
            for r in anomalies
        ]
        await mongo_db.anomaly_scores.insert_many(docs)

    return {
        "events_scored": len(results),
        "anomalies_found": len(anomalies),
        "top_anomalies": sorted(
            [{"event_id": r.event_id, "anomaly_score": r.anomaly_score} for r in anomalies],
            key=lambda x: x["anomaly_score"],
            reverse=True,
        )[:20],
    }
