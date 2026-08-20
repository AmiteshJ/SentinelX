from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.db.postgres import get_db
from app.models.audit import AuditLog

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs")
async def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
