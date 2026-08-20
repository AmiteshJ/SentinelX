"""
Threat Intelligence & Risk (spec §15-19, merged per §31). Custom IOC CRUD,
malicious URL lookups, and IP enrichment — external providers optional,
always with local-first + graceful fallback.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_mongo_db
from app.intelligence.enrichment_service import enrich_ip
from app.schemas.ioc import MaliciousUrlIn
from app.services import audit_service
from app.services.ioc_service import add_malicious_url, check_url_against_cache, normalize_url

router = APIRouter(prefix="/api/threat-intelligence", tags=["threat-intelligence"])


@router.get("/overview")
async def overview(user=Depends(get_current_user)):
    try:
        mongo_db = get_mongo_db()
        return {
            "malicious_urls": await mongo_db.malicious_urls.count_documents({"active": True}),
            "malicious_ips": await mongo_db.malicious_ips.count_documents({"active": True}),
            "pending_verification": await mongo_db.malicious_urls.count_documents({"status": "PENDING"}),
        }
    except Exception:
        return {
            "malicious_urls": 0,
            "malicious_ips": 0,
            "pending_verification": 0,
        }


@router.get("/urls")
async def list_malicious_urls(limit: int = 50, offset: int = 0, user=Depends(get_current_user)):
    items = []
    total = 0
    try:
        mongo_db = get_mongo_db()
        cursor = mongo_db.malicious_urls.find({}).sort("first_seen", -1).skip(offset).limit(limit)
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            items.append(doc)
        total = await mongo_db.malicious_urls.count_documents({})
    except Exception:
        items = []
        total = 0
    return {"items": items, "total": total}



@router.post("/urls", status_code=status.HTTP_201_CREATED)
async def create_malicious_url(
    payload: MaliciousUrlIn,
    user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer")),
):
    from app.db.postgres import AsyncSessionLocal

    mongo_db = get_mongo_db()
    doc = await add_malicious_url(mongo_db, payload, analyst=user.email)

    async with AsyncSessionLocal() as db:
        await audit_service.log_action(
            db, user_id=user.id, action="ioc.create", resource_type="malicious_url", resource_id=doc["id"]
        )
        await db.commit()

    return doc


@router.get("/urls/check")
async def check_url(url: str, user=Depends(get_current_user)):
    """Real-time lookup used by the URL detection flow (spec §18)."""
    mongo_db = get_mongo_db()
    normalized, domain = normalize_url(url)

    doc = await mongo_db.malicious_urls.find_one({"normalized_url": normalized, "active": True})
    if doc:
        return {
            "match": True,
            "source": "Custom Threat Intelligence",
            "threat_type": doc.get("threat_type"),
            "confidence": doc.get("confidence"),
        }

    cache_hit = await check_url_against_cache(url)
    return {"match": cache_hit, "source": "Custom Threat Intelligence" if cache_hit else None}


@router.get("/ip/{ip}")
async def lookup_ip(ip: str, user=Depends(get_current_user)):
    mongo_db = get_mongo_db()
    return await enrich_ip(mongo_db, ip)
