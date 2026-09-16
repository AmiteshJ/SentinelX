import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.postgres import get_db
from app.models.detection import DetectionRule
from app.models.user import User

router = APIRouter(prefix="/api/rules", tags=["rules"])

class RuleBase(BaseModel):
    rule_id: str
    name: str
    description: str | None = None
    severity: str
    mitre_technique: str | None = None
    conditions: dict[str, Any]
    tags: list[str] | None = None
    status: str = "draft"

class RuleCreate(RuleBase):
    pass

class RuleUpdateStatus(BaseModel):
    status: str

@router.get("")
async def list_rules(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))
):
    result = await db.execute(select(DetectionRule).order_by(DetectionRule.created_at.desc()))
    return result.scalars().all()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_in: RuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if rule_id exists
    existing = await db.execute(select(DetectionRule).where(DetectionRule.rule_id == rule_in.rule_id))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Rule ID already exists")

    new_rule = DetectionRule(
        **rule_in.model_dump(),
        created_by=current_user.id
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@router.put("/{id}/status")
async def update_rule_status(
    id: uuid.UUID,
    status_update: RuleUpdateStatus,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin", "soc_analyst"))
):
    if status_update.status not in ["draft", "test", "active", "retired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    rule = await db.get(DetectionRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    rule.status = status_update.status
    await db.commit()
    return rule

@router.post("/test")
async def test_rule(
    rule_in: RuleCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin", "soc_analyst"))
):
    from app.db.mongodb import get_mongo_db
    from app.detection.rule_engine import CompiledRule, matches
    
    mongo_db = get_mongo_db()
    
    compiled = CompiledRule(
        rule_id=rule_in.rule_id,
        name=rule_in.name,
        severity=rule_in.severity,
        mitre_technique=rule_in.mitre_technique,
        conditions=rule_in.conditions
    )
    
    # naive test over last 1000 events
    events = await mongo_db.events.find({}).sort("ingested_at", -1).limit(1000).to_list(length=1000)
    matched = 0
    for ev in events:
        if matches(compiled, ev):
            matched += 1
            
    return {
        "scanned": len(events),
        "matches": matched
    }
