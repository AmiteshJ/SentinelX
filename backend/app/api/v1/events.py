"""
Secure ingestion API. Accepts normalized events (see app/schemas/event.py)
from any of the three legitimate sources — the future SentinelX Agent (LIVE),
a validated dataset upload (DATASET), or a timestamped historical replay
(REPLAY) — and pushes them onto the Redis Stream for the event worker to
process. This endpoint never accepts or synthesizes fake data; it only
validates and queues what the caller actually sends.
"""
import json

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.db.redis_client import EVENTS_STREAM, MODE_KEY, get_redis
from app.schemas.event import IngestRequest, IngestResponse

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_events(payload: IngestRequest, user=Depends(get_current_user)):
    redis = get_redis()

    for event in payload.events:
        event_dict = event.model_dump(mode="json")
        event_dict["mode"] = payload.mode.value
        await redis.xadd(EVENTS_STREAM, {"payload": json.dumps(event_dict)})

    # Record the most recent ingestion mode so the dashboard can reflect it honestly.
    await redis.set(MODE_KEY, payload.mode.value)

    return IngestResponse(accepted=len(payload.events), mode=payload.mode)
