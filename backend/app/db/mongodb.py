"""
Motor (async) MongoDB client. Used for high-volume, flexible security data:
raw events, network telemetry, alerts, IOC intelligence, ML results.
Connection is established once at app startup and reused (see app/main.py).
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

settings = get_settings()

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def connect_mongo() -> None:
    global _client, _db
    kwargs = {
        "serverSelectionTimeoutMS": 3000,
        "connectTimeoutMS": 3000,
        "tlsAllowInvalidCertificates": True,
    }
    _client = AsyncIOMotorClient(settings.mongodb_uri, **kwargs)
    _db = _client[settings.mongodb_db_name]


def close_mongo() -> None:
    if _client:
        _client.close()


def get_mongo_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB has not been initialized. Call connect_mongo() on startup.")
    return _db


async def check_mongo_health() -> bool:
    try:
        if _client is None:
            return False
        await asyncio.wait_for(_client.admin.command("ping"), timeout=2.0)
        return True
    except Exception:
        return False

