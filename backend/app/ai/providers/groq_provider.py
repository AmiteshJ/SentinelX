"""Groq provider (spec §22), via the official groq SDK. Never exposed to the
frontend — the API key lives only in backend env vars (spec §22)."""
import structlog

from app.core.config import get_settings
from app.ai.providers.base import LLMProvider

logger = structlog.get_logger("ai.groq")
settings = get_settings()

CANDIDATE_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
]


class GroqProvider(LLMProvider):
    name = "Groq"

    async def is_available(self) -> bool:
        return bool(settings.groq_api_key)

    async def complete(self, *, system_prompt: str, user_prompt: str) -> str:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.groq_api_key)
        last_exc = None

        for model_name in CANDIDATE_MODELS:
            try:
                response = await client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    max_tokens=1024,
                )
                return response.choices[0].message.content or ""
            except Exception as exc:
                err_str = str(exc)
                # Catch any decommissioned, not found, or deprecation error and continue to the next candidate
                if any(x in err_str.lower() for x in ["model_not_found", "model_decommissioned", "does not exist", "404", "decommissioned", "deprecated", "not supported"]):
                    logger.info("groq_model_unavailable_trying_next", model=model_name)
                    last_exc = exc
                    continue
                logger.warning("groq_completion_failed", model=model_name, error=err_str)
                raise exc

        if last_exc:
            raise last_exc
        raise RuntimeError("No Groq models could be queried.")

