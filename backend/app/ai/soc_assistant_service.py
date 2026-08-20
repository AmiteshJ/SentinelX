"""
AI SOC Assistant orchestration (spec §21-25). Provider selection: Groq
first, Ollama fallback (spec §24) — if neither is configured/reachable, this
raises a clear error rather than fabricating a response.
"""
import structlog

from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.ollama_provider import OllamaProvider
from app.ai.context_builder import SYSTEM_PROMPT

logger = structlog.get_logger("ai.soc_assistant")

_groq = GroqProvider()
_ollama = OllamaProvider()


class NoProviderAvailableError(Exception):
    pass


async def ask(*, question: str, context: str) -> dict:
    user_prompt = f"CONTEXT:\n{context}\n\nANALYST QUESTION:\n{question}"

    if await _groq.is_available():
        try:
            answer = await _groq.complete(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt)
            return {"answer": answer, "provider": _groq.name}
        except Exception as exc:
            logger.warning("groq_failed_falling_back", error=str(exc))

    if await _ollama.is_available():
        answer = await _ollama.complete(system_prompt=SYSTEM_PROMPT, user_prompt=user_prompt)
        return {"answer": answer, "provider": _ollama.name}

    raise NoProviderAvailableError(
        "No AI provider is configured/reachable. Set GROQ_API_KEY or run a local Ollama server "
        "and set OLLAMA_BASE_URL."
    )
