import io
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.services import knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge-base"])


class IngestRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    source: str = Field(default="internal_doc", max_length=100)
    content: str = Field(..., min_length=10)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    top_k: int = Field(default=5, ge=1, le=20)


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Retrieve vector store and knowledge base statistics."""
    try:
        return await knowledge_service.get_knowledge_stats(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch knowledge base stats: {str(exc)}"
        )


@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """List all ingested documents in the RAG knowledge store."""
    try:
        return await knowledge_service.list_documents(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(exc)}"
        )


@router.get("/documents/{title}/chunks")
async def get_chunks(
    title: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Inspect all vectorized chunks for a specific document."""
    try:
        return await knowledge_service.get_document_chunks(db, title)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch document chunks: {str(exc)}"
        )


@router.post("/ingest")
async def ingest_manual(
    payload: IngestRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Vectorize and store a document into pgvector."""
    try:
        chunks_count = await knowledge_service.ingest_document(
            db,
            title=payload.title.strip(),
            source=payload.source.strip(),
            content=payload.content.strip()
        )
        return {
            "status": "success",
            "document_title": payload.title.strip(),
            "source": payload.source.strip(),
            "chunks_ingested": chunks_count,
            "message": f"Successfully vectorized and indexed {chunks_count} chunks into pgvector."
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(exc)}"
        )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: str = Form("internal_doc"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Upload and vectorize a document file (.txt, .md, .json, .csv, .pdf)."""
    filename = file.filename or "uploaded_document.txt"
    doc_title = title.strip() if title and title.strip() else filename
    
    try:
        raw_bytes = await file.read()
        content = ""
        
        # Check if PDF
        if filename.lower().endswith(".pdf"):
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
                extracted_pages = []
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        extracted_pages.append(f"--- Page {idx + 1} ---\n{text.strip()}")
                content = "\n\n".join(extracted_pages)
            except Exception:
                # Basic string fallback for PDF streams
                ascii_text = re.sub(r'[^\x20-\x7E\n\t]', ' ', raw_bytes.decode('latin-1', errors='ignore'))
                cleaned = re.sub(r'\s+', ' ', ascii_text)
                if len(cleaned.strip()) > 50:
                    content = cleaned
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Unable to extract readable text from PDF. Please upload as TXT or Markdown."
                    )
        else:
            # Standard plain text / markdown / csv / json
            try:
                content = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = raw_bytes.decode("latin-1", errors="replace")

        if not content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file appears to be empty or contains no readable text."
            )

        chunks_count = await knowledge_service.ingest_document(
            db,
            title=doc_title,
            source=source,
            content=content
        )

        return {
            "status": "success",
            "document_title": doc_title,
            "filename": filename,
            "source": source,
            "chunks_ingested": chunks_count,
            "message": f"Successfully parsed '{filename}' and indexed {chunks_count} vector chunks."
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File processing error: {str(exc)}"
        )


@router.delete("/documents/{title}")
async def delete_document(
    title: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete a document and all its vector embeddings from pgvector."""
    try:
        deleted_count = await knowledge_service.delete_document(db, title)
        return {
            "status": "success",
            "document_title": title,
            "chunks_deleted": deleted_count,
            "message": f"Removed document '{title}' ({deleted_count} chunks deleted)."
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(exc)}"
        )


@router.post("/search")
async def search_knowledge(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Perform vector similarity search against the knowledge base."""
    try:
        results = await knowledge_service.semantic_search(db, payload.query, top_k=payload.top_k)
        return {
            "query": payload.query,
            "top_k": payload.top_k,
            "results_count": len(results),
            "results": results
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(exc)}"
        )


@router.post("/seed-defaults")
async def seed_defaults(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Seed default SOC playbooks into pgvector."""
    try:
        chunks_count = await knowledge_service.seed_default_playbooks(db)
        return {
            "status": "success",
            "chunks_ingested": chunks_count,
            "playbooks_count": len(knowledge_service.DEFAULT_SECURITY_PLAYBOOKS),
            "message": f"Successfully seeded {len(knowledge_service.DEFAULT_SECURITY_PLAYBOOKS)} SOC playbooks into pgvector ({chunks_count} total chunks)."
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed security playbooks: {str(exc)}"
        )
