from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import soc_assistant_service
from app.ai.context_builder import build_incident_context, build_knowledge_context
from app.api.deps import get_current_user
from app.db.mongodb import get_mongo_db
from app.db.postgres import get_db

router = APIRouter(prefix="/api/ai", tags=["ai-assistant"])


class AskRequest(BaseModel):
    question: str
    incident_id: str | None = None


@router.post("/ask")
async def ask(payload: AskRequest, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    context_parts = []
    if payload.incident_id:
        try:
            mongo_db = get_mongo_db()
            context_parts.append(await build_incident_context(db, mongo_db, payload.incident_id))
        except Exception as exc:
            context_parts.append(f"Could not load incident context: {exc}")

    try:
        knowledge_context = await build_knowledge_context(db, payload.question)
        if knowledge_context:
            context_parts.append(knowledge_context)
    except Exception:
        pass

    context = "\n\n".join(context_parts) if context_parts else "No incident or knowledge context available."

    try:
        result = await soc_assistant_service.ask(question=payload.question, context=context)
    except soc_assistant_service.NoProviderAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI service error: {exc}") from exc

    return result

