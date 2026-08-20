"""
Redis client for real-time streams, caching, rate limiting, and temporary
state. Redis is NOT the source of truth — durable data lives in Postgres/Mongo.
"""
import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()

# Stream/key naming conventions used across ingestion, workers, and the API.
EVENTS_STREAM = "sentinelx:events"
EVENTS_CONSUMER_GROUP = "sentinelx:event-workers"
UPDATES_CHANNEL = "sentinelx:updates"  # pub/sub channel the WebSocket layer relays to clients
MODE_KEY = "sentinelx:monitoring:mode"

_redis: aioredis.Redis | None = None


def connect_redis() -> None:
    global _redis
    _redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_timeout=15.0,
        socket_keepalive=True,
    )


async def close_redis() -> None:
    if _redis:
        await _redis.aclose()


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis has not been initialized. Call connect_redis() on startup.")
    return _redis


async def ensure_consumer_group() -> None:
    """Idempotently create the Redis Streams consumer group used by event workers."""
    r = get_redis()
    try:
        await r.xgroup_create(name=EVENTS_STREAM, groupname=EVENTS_CONSUMER_GROUP, id="0", mkstream=True)
    except aioredis.ResponseError as exc:
        if "BUSYGROUP" not in str(exc):
            raise


async def check_redis_health() -> bool:
    try:
        if _redis is None:
            return False
        return await _redis.ping()
    except Exception:
        return False
