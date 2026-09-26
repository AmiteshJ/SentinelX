"""
MITRE ATT&CK Matrix & Coverage API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.services import mitre_service

router = APIRouter(prefix="/api/mitre", tags=["mitre"])


@router.get("/matrix")
async def get_matrix(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Fetch the full MITRE ATT&CK Enterprise Matrix with real-time coverage and alert states."""
    data = await mitre_service.get_mitre_matrix_data(db)
    return data


@router.get("/techniques/{technique_id}")
async def get_technique(
    technique_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get rich metadata, associated detection rules, and triggered alert history for a technique."""
    tech = await mitre_service.get_technique_details(technique_id, db)
    if not tech:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MITRE technique '{technique_id}' not found in catalog."
        )
    return tech


@router.get("/coverage")
async def get_coverage_summary(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """High-level coverage stats for dashboard and posture assessment."""
    matrix = await mitre_service.get_mitre_matrix_data(db)
    return matrix["summary"]
