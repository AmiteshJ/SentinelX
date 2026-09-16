from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.db.mongodb import get_mongo_db
from app.hunting.parser import ParseError, parse_thql
from app.models.user import User

router = APIRouter(prefix="/api/hunting", tags=["hunting"])

class HuntingResponse(BaseModel):
    events: list[dict[str, Any]]
    total: int
    page: int
    page_size: int

def _parse_time_range(time_range: str) -> datetime | None:
    now = datetime.now(timezone.utc)
    if time_range == "15m":
        return now - timedelta(minutes=15)
    elif time_range == "1h":
        return now - timedelta(hours=1)
    elif time_range == "6h":
        return now - timedelta(hours=6)
    elif time_range == "24h":
        return now - timedelta(hours=24)
    elif time_range == "7d":
        return now - timedelta(days=7)
    # custom or all-time handled by returning None if "all"
    return None

@router.get("/events", response_model=HuntingResponse)
async def hunt_events(
    query: str = Query("", description="THQL query string"),
    time_range: str = Query("24h", description="15m, 1h, 6h, 24h, 7d, all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    try:
        mongo_query = parse_thql(query)
    except ParseError as e:
        raise HTTPException(status_code=400, detail=f"THQL Parse Error: {str(e)}")

    start_time = _parse_time_range(time_range)
    if start_time:
        # If there's an existing $and, we append to it, otherwise we wrap or add
        time_cond = {"ingested_at": {"$gte": start_time.isoformat()}}
        if not mongo_query:
            mongo_query = time_cond
        elif "$and" in mongo_query:
            mongo_query["$and"].append(time_cond)
        else:
            mongo_query = {"$and": [mongo_query, time_cond]}

    db = get_mongo_db()
    skip = (page - 1) * page_size
    
    # We shouldn't use count_documents on huge collections without filters, 
    # but with time_range it should be okay. A strict limit could also apply.
    total = await db.events.count_documents(mongo_query)
    
    cursor = db.events.find(mongo_query).sort("ingested_at", -1).skip(skip).limit(page_size)
    events = await cursor.to_list(length=page_size)
    
    # Convert ObjectId to string for JSON serialization
    for ev in events:
        ev["_id"] = str(ev["_id"])
        
    return HuntingResponse(
        events=events,
        total=total,
        page=page,
        page_size=page_size
    )

class CustomIOC(BaseModel):
    type: str
    value: str
    description: str | None = None
    severity: str | None = None

@router.post("/ioc")
async def add_custom_ioc(
    ioc: CustomIOC,
    current_user: User = Depends(get_current_user)
):
    from app.db.postgres import AsyncSessionLocal
    from app.models.detection import CustomIOC as CustomIOCModel
    
    async with AsyncSessionLocal() as db:
        new_ioc = CustomIOCModel(**ioc.model_dump(), created_by=current_user.id)
        db.add(new_ioc)
        await db.commit()
        await db.refresh(new_ioc)
        return new_ioc

@router.get("/enrich")
async def enrich_entity(
    type: str,
    value: str,
    current_user: User = Depends(get_current_user)
):
    # Dummy integration for now to satisfy SOC workflow
    return {
        "type": type,
        "value": value,
        "threat_intel": {
            "score": 85 if type == "ip" else 0,
            "provider": "AbuseIPDB",
            "tags": ["malicious"] if type == "ip" else []
        }
    }
