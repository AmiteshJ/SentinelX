"""
IOC enrichment orchestration (spec §18 "URL detection flow" / §51 external-API
principle): local Mongo lookup first, then cache, then external provider only
if necessary. External failures degrade to a structured "unavailable"
response and never break the caller.
"""
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.intelligence.providers.abuseipdb import AbuseIPDBProvider
from app.intelligence.providers.base import IntelResult

_abuseipdb = AbuseIPDBProvider()


async def enrich_ip(mongo_db: AsyncIOMotorDatabase, ip: str) -> dict:
    # 1. Local custom/analyst-entered intel first (spec §16-18)
    local = await mongo_db.malicious_ips.find_one({"ip": ip, "active": True})
    if local:
        return {
            "ip": ip,
            "match": True,
            "source": "Custom Threat Intelligence",
            "threat_type": local.get("threat_type"),
            "confidence": local.get("confidence"),
        }

    # 2. Cached external result (avoid re-querying rate-limited APIs)
    cached = await mongo_db.intel_cache.find_one({"key": f"ip:{ip}"})
    if cached and cached.get("result", {}).get("status") == "ok":
        return {"ip": ip, "match": False, "source": cached["result"]["source"], "cached": True, **cached["result"]}

    # 3. External provider, with graceful fallback
    result: IntelResult = await _abuseipdb.lookup_ip(ip)
    if result.status == "ok":
        await mongo_db.intel_cache.update_one(
            {"key": f"ip:{ip}"},
            {"$set": {"key": f"ip:{ip}", "result": result.__dict__, "cached_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    return {"ip": ip, "match": False, "source": result.source, "status": result.status, "data": result.data}
