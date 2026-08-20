"""
Knowledge base ingestion + RAG retrieval (spec §20, §45). Documents are
chunked, embedded, and stored in pgvector; retrieval is cosine-similarity
search used by the AI SOC Assistant's context builder (spec §21-23) so the
LLM only ever sees real, retrieved SentinelX/security knowledge.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import embed_batch, embed_text

CHUNK_SIZE_CHARS = 800
CHUNK_OVERLAP_CHARS = 100


def chunk_text(content: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(content):
        end = start + CHUNK_SIZE_CHARS
        chunks.append(content[start:end])
        start = end - CHUNK_OVERLAP_CHARS
        if start < 0 or end >= len(content):
            break
    return [c.strip() for c in chunks if c.strip()]


async def ingest_document(db: AsyncSession, *, title: str, source: str, content: str) -> int:
    chunks = chunk_text(content)
    if not chunks:
        return 0
    embeddings = embed_batch(chunks)

    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        await db.execute(
            text(
                """
                INSERT INTO knowledge_chunks (document_title, source, chunk_index, content, embedding)
                VALUES (:title, :source, :idx, :content, :embedding)
                """
            ),
            {
                "title": title,
                "source": source,
                "idx": idx,
                "content": chunk,
                "embedding": str(embedding),  # pgvector accepts a text literal like "[0.1,0.2,...]"
            },
        )
    await db.commit()
    return len(chunks)


async def semantic_search(db: AsyncSession, query: str, *, top_k: int = 5) -> list[dict]:
    query_embedding = embed_text(query)
    result = await db.execute(
        text(
            """
            SELECT document_title, source, content, 1 - (embedding <=> :embedding) AS similarity
            FROM knowledge_chunks
            ORDER BY embedding <=> :embedding
            LIMIT :top_k
            """
        ),
        {"embedding": str(query_embedding), "top_k": top_k},
    )
    rows = result.mappings().all()
    return [dict(row) for row in rows]
