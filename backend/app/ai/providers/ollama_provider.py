"""Local LLM fallback (spec §24). Used when Groq is unavailable/unconfigured
and a local Ollama server is reachable, so the AI layer keeps functioning."""
import httpx
import structlog

from app.core.config import get_settings
from app.ai.providers.base import LLMProvider

logger = structlog.get_logger("ai.ollama")
settings = get_settings()

DEFAULT_MODEL = "llama3"


class OllamaProvider(LLMProvider):
    name = "Ollama"

    async def is_available(self) -> bool:
        if not settings.ollama_base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                return resp.status_code == 200
        except httpx.HTTPError:
            return False

    async def complete(self, *, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": DEFAULT_MODEL,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
