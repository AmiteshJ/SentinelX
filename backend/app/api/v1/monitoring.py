from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.db.redis_client import MODE_KEY, get_redis
from app.services.dataset_streamer import DatasetStreamer

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


class SetModeRequest(BaseModel):
    mode: str


@router.get("/mode")
async def get_mode(user=Depends(get_current_user)):
    """Real current mode, read from Redis (set by the last successful ingest
    call, or OFFLINE if nothing has been ingested yet in this deployment)."""
    redis = get_redis()
    mode = await redis.get(MODE_KEY)
    streamer = DatasetStreamer.get_instance()
    status_info = streamer.get_status()
    return {
        "mode": mode or "OFFLINE",
        "streamer": status_info,
    }


@router.post("/mode")
async def set_mode(payload: SetModeRequest, user=Depends(get_current_user)):
    streamer = DatasetStreamer.get_instance()
    status_info = await streamer.set_mode(payload.mode)
    return {
        "mode": status_info["active_mode"],
        "streamer": status_info,
    }
