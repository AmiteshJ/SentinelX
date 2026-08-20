"""
Embedding provider for RAG (spec §20). Primary: sentence-transformers
(all-MiniLM-L6-v2, 384-dim, matching the pgvector column in
database/postgres/init.sql). This model is downloaded on first use — if it
can't be (no internet in a locked-down deployment), we fall back to a
deterministic hashing-based embedding so the pipeline still runs end-to-end
for development/testing. The fallback is clearly inferior for real semantic
search and is logged loudly so it's never silently mistaken for the real thing.
"""
import hashlib

import numpy as np
import structlog

logger = structlog.get_logger("ai.embeddings")

EMBEDDING_DIM = 384
_model = None
_model_load_attempted = False


def _get_model():
    global _model, _model_load_attempted
    if _model is not None or _model_load_attempted:
        return _model
    _model_load_attempted = True
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("embedding_model_loaded", model="all-MiniLM-L6-v2")
    except Exception as exc:
        logger.warning("embedding_model_unavailable_using_fallback", error=str(exc))
        _model = None
    return _model


def _fallback_embedding(text: str) -> list[float]:
    """Deterministic, dependency-free embedding via hashed n-grams. NOT a
    substitute for real semantic embeddings — only for keeping the RAG
    pipeline testable when the real model can't be downloaded."""
    vec = np.zeros(EMBEDDING_DIM, dtype=float)
    tokens = text.lower().split()
    for token in tokens:
        digest = hashlib.sha256(token.encode()).digest()
        idx = int.from_bytes(digest[:4], "little") % EMBEDDING_DIM
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    return (vec / norm if norm > 0 else vec).tolist()


def embed_text(text: str) -> list[float]:
    model = _get_model()
    if model is not None:
        return model.encode(text, normalize_embeddings=True).tolist()
    return _fallback_embedding(text)


def embed_batch(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    if model is not None:
        return model.encode(texts, normalize_embeddings=True).tolist()
    return [_fallback_embedding(t) for t in texts]
