"""Case management (spec §43)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.postgres import get_db
from app.models.case import Case
from app.schemas.case import CaseIn, CaseOut, CaseUpdate
from app.services import audit_service

router = APIRouter(prefix="/api/cases", tags=["cases"])

VALID_STATUSES = {"open", "investigating", "contained", "resolved", "closed"}


@router.get("", response_model=list[CaseOut])
async def list_cases(status_filter: str | None = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    stmt = select(Case).order_by(Case.updated_at.desc())
    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(payload: CaseIn, db: AsyncSession = Depends(get_db), user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))):
    case = Case(
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        related_incident_ids=payload.related_incident_ids,
        assigned_analyst_id=user.id,
    )
    db.add(case)
    await db.flush()
    await audit_service.log_action(db, user_id=user.id, action="case.create", resource_type="case", resource_id=str(case.id))
    await db.commit()
    await db.refresh(case)
    return case


@router.patch("/{case_id}", response_model=CaseOut)
async def update_case(case_id: str, payload: CaseUpdate, db: AsyncSession = Depends(get_db), user=Depends(require_role("admin", "soc_analyst", "security_manager", "viewer"))):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of {VALID_STATUSES}.")
        case.status = payload.status
    if payload.assigned_analyst_id is not None:
        case.assigned_analyst_id = payload.assigned_analyst_id
    if payload.description is not None:
        case.description = payload.description

    await audit_service.log_action(db, user_id=user.id, action="case.update", resource_type="case", resource_id=str(case.id))
    await db.commit()
    await db.refresh(case)
    return case
