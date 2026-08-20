"""
Dashboard overview endpoint.

Phase 1-2 note: this genuinely returns real (mostly zero/default) state —
system health is a live check against Postgres/Mongo/Redis, and the
alert/incident counters are honest zeros because no ingestion or detection
pipeline exists yet (those arrive in Phase 4 and Phase 6+). This endpoint
must NOT be modified to return fabricated numbers to make the UI "look busy".
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.mongodb import check_mongo_health, get_mongo_db
from app.db.postgres import check_postgres_health, get_db
from app.db.redis_client import MODE_KEY, check_redis_health, get_redis
from app.schemas.dashboard import DashboardOverview, SystemHealth

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
async def overview(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    postgres_ok = await check_postgres_health()
    mongo_ok = await check_mongo_health()
    redis_ok = await check_redis_health()

    active_incidents_count = 0
    if postgres_ok:
        try:
            result = await db.execute(text("SELECT count(*) FROM incidents WHERE status != 'closed'"))
            active_incidents_count = result.scalar_one() or 0
        except Exception:
            active_incidents_count = 0

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    if mongo_ok:
        try:
            mongo_db = get_mongo_db()
            for severity in severity_counts:
                severity_counts[severity] = await mongo_db.alerts.count_documents(
                    {"severity": severity, "status": "open"}
                )
        except Exception:
            pass  # leave honest zeros rather than fail the whole overview

    monitoring_mode = "OFFLINE"
    if redis_ok:
        try:
            redis = get_redis()
            monitoring_mode = await redis.get(MODE_KEY) or "OFFLINE"
        except Exception:
            monitoring_mode = "OFFLINE"

    # A rule engine exists (app/detection/rule_engine.py) and runs inside the
    # event worker process, which is a separate container — the API can't see
    # its liveness directly yet, so this stays false until a worker
    # heartbeat/health-check is added (tracked in docs/architecture.md).
    detection_engine_reporting = False

    return DashboardOverview(
        system_health=SystemHealth(
            postgres=postgres_ok,
            mongodb=mongo_ok,
            redis=redis_ok,
            detection_engine=detection_engine_reporting,
        ),
        monitoring_mode=monitoring_mode,
        active_incidents=active_incidents_count,
        critical_alerts=severity_counts["critical"],
        high_alerts=severity_counts["high"],
        medium_alerts=severity_counts["medium"],
        low_alerts=severity_counts["low"],
    )
