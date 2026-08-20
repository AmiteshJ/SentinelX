from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.db.redis_client import MODE_KEY, get_redis

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/mode")
async def get_mode(user=Depends(get_current_user)):
    """Real current mode, read from Redis (set by the last successful ingest
    call, or OFFLINE if nothing has been ingested yet in this deployment)."""
    redis = get_redis()
    mode = await redis.get(MODE_KEY)
    return {"mode": mode or "OFFLINE"}
