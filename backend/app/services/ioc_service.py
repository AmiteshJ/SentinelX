"""
Custom IOC management (spec §16-17). Writes to MongoDB and immediately mirrors
into a Redis set so the detection engine can use it without a restart —
matching spec §17's "MongoDB → Change Stream → Redis → Detection cache" flow.
(A full Mongo Change Stream listener is a natural next hardening step; for now
the write path itself pushes to Redis synchronously, which gives the same
"immediately usable" guarantee.)
"""
from datetime import datetime, timezone
from urllib.parse import urlparse

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.redis_client import get_redis
from app.schemas.ioc import MaliciousUrlIn

MALICIOUS_URL_CACHE_KEY = "sentinelx:ioc:malicious_urls"


def normalize_url(url: str) -> tuple[str, str]:
    parsed = urlparse(url if "://" in url else f"http://{url}")
    normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
    domain = parsed.netloc.lower()
    return normalized, domain


async def add_malicious_url(mongo_db: AsyncIOMotorDatabase, payload: MaliciousUrlIn, *, analyst: str) -> dict:
    normalized, domain = normalize_url(payload.url)
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "url": payload.url,
        "normalized_url": normalized,
        "domain": domain,
        "threat_type": payload.threat_type,
        "severity": payload.severity,
        "confidence": payload.confidence,
        "source": "Analyst",
        "status": "VERIFIED",  # analyst-entered IOCs are treated as verified at creation
        "active": True,
        "tags": payload.tags,
        "analyst": analyst,
        "notes": payload.notes,
        "first_seen": now,
        "last_seen": now,
    }
    result = await mongo_db.malicious_urls.insert_one(doc)
    doc["id"] = str(result.inserted_id)

    redis = get_redis()
    await redis.sadd(MALICIOUS_URL_CACHE_KEY, normalized)

    return doc


async def check_url_against_cache(url: str) -> bool:
    normalized, _ = normalize_url(url)
    redis = get_redis()
    return await redis.sismember(MALICIOUS_URL_CACHE_KEY, normalized)


async def warm_url_cache(mongo_db: AsyncIOMotorDatabase) -> int:
    """Called at worker/API startup so the Redis cache reflects Mongo state
    even after a restart (the synchronous write-through above handles the
    steady-state case)."""
    redis = get_redis()
    count = 0
    async for doc in mongo_db.malicious_urls.find({"active": True}):
        await redis.sadd(MALICIOUS_URL_CACHE_KEY, doc["normalized_url"])
        count += 1
    return count
