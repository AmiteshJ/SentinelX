"""Groq provider (spec §22), via the official groq SDK. Never exposed to the
frontend — the API key lives only in backend env vars (spec §22)."""
import structlog

from app.core.config import get_settings
from app.ai.providers.base import LLMProvider

logger = structlog.get_logger("ai.groq")
settings = get_settings()

DEFAULT_MODEL = "llama-3.3-70b-versatile"


class GroqProvider(LLMProvider):
    name = "Groq"

    async def is_available(self) -> bool:
        return bool(settings.groq_api_key)

    async def complete(self, *, system_prompt: str, user_prompt: str) -> str:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        from groq import AsyncGroq  # imported lazily so the package is optional until configured

        client = AsyncGroq(api_key=settings.groq_api_key)
        try:
            response = await client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=1024,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            logger.warning("groq_completion_failed", error=str(exc))
            raise
