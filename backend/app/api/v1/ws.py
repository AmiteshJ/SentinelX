"""
WebSocket relay: forwards messages published on the Redis pub/sub
`sentinelx:updates` channel (by the event worker) to every connected
dashboard, so new alerts/incidents appear without a page refresh (spec §37).
"""
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_token
from app.db.redis_client import UPDATES_CHANNEL, get_redis

router = APIRouter(tags=["realtime"])
logger = structlog.get_logger("ws")


@router.websocket("/ws/updates")
async def updates_socket(websocket: WebSocket, token: str | None = None):
    if token is None:
        await websocket.close(code=4401)
        return
    try:
        decode_token(token)
    except JWTError:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(UPDATES_CHANNEL)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(UPDATES_CHANNEL)
        await pubsub.close()
