"""
Dashboard overview endpoint.

Phase 1-2 note: this genuinely returns real (mostly zero/default) state —
system health is a live check against Postgres/Mongo/Redis, and the
alert/incident counters are honest zeros because no ingestion or detection
pipeline exists yet (those arrive in Phase 4 and Phase 6+). This endpoint
must NOT be modified to return fabricated numbers to make the UI "look busy".
"""
import asyncio
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
    # Run DB health checks concurrently
    postgres_ok, mongo_ok, redis_ok = await asyncio.gather(
        check_postgres_health(),
        check_mongo_health(),
        check_redis_health(),
        return_exceptions=True,
    )
    postgres_ok = bool(postgres_ok) if not isinstance(postgres_ok, Exception) else False
    mongo_ok = bool(mongo_ok) if not isinstance(mongo_ok, Exception) else False
    redis_ok = bool(redis_ok) if not isinstance(redis_ok, Exception) else False

    async def fetch_incidents():
        if not postgres_ok:
            return 0
        try:
            result = await db.execute(text("SELECT count(*) FROM incidents WHERE status != 'closed'"))
            return result.scalar_one() or 0
        except Exception:
            return 0

    async def fetch_severity_counts():
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        if not mongo_ok:
            return counts
        try:
            mongo_db = get_mongo_db()
            results = await asyncio.gather(*[
                mongo_db.alerts.count_documents({"severity": s, "status": "open"})
                for s in ["critical", "high", "medium", "low"]
            ], return_exceptions=True)
            for idx, s in enumerate(["critical", "high", "medium", "low"]):
                val = results[idx]
                counts[s] = int(val) if isinstance(val, (int, float)) else 0
            return counts
        except Exception:
            return counts

    async def fetch_redis_info():
        mode = "OFFLINE"
        hb = False
        if redis_ok:
            try:
                redis = get_redis()
                m, h = await asyncio.gather(
                    redis.get(MODE_KEY),
                    redis.get("sentinelx:worker:heartbeat"),
                    return_exceptions=True,
                )
                mode = m if isinstance(m, str) else "OFFLINE"
                hb = bool(h) if not isinstance(h, Exception) else False
            except Exception:
                pass
        return mode, hb

    incidents_task, counts_task, redis_task = await asyncio.gather(
        fetch_incidents(),
        fetch_severity_counts(),
        fetch_redis_info(),
    )

    active_incidents_count = incidents_task
    severity_counts = counts_task
    monitoring_mode, detection_engine_reporting = redis_task

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
