from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.api.v1.investigation import get_investigation
from app.db.mongodb import get_mongo_db
from app.db.postgres import get_db
from app.services import audit_service
from app.services.report_service import generate_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate/{incident_id}")
async def generate(incident_id: str, db: AsyncSession = Depends(get_db), user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))):
    investigation = await get_investigation(incident_id, db=db, user=user)
    mongo_db = get_mongo_db()

    report = await generate_report(db, mongo_db, incident_id, investigation)

    await audit_service.log_action(db, user_id=user.id, action="report.generate", resource_type="incident", resource_id=incident_id)
    await db.commit()
    return report


@router.get("")
async def list_reports(limit: int = 20, user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))):
    mongo_db = get_mongo_db()
    cursor = mongo_db.reports.find({}).sort("generated_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(doc)
    return {"items": items}
