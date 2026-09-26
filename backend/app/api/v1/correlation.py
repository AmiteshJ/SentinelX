"""
Graph-Based Alert Correlation API endpoints (Phase 11 Completion).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.services import correlation_service

router = APIRouter(prefix="/api/correlation", tags=["correlation"])


@router.get("/graph")
async def get_global_graph(limit: int = 15, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Fetch global multi-incident entity correlation graph."""
    return await correlation_service.build_global_correlation_graph(db, limit=limit)


@router.get("/incident/{incident_id}")
async def get_incident_graph(incident_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Fetch entity attack graph for a specific incident."""
    graph = await correlation_service.build_incident_graph(incident_id, db)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return graph
