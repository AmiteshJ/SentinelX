"""
Threat intelligence provider abstraction (spec §15, §51-53).

Every provider must degrade gracefully: on missing API key, timeout, or error,
return an "unavailable" result rather than raising, so SentinelX keeps working
off local/cached intelligence. No provider is ever required for core detection.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class IntelResult:
    source: str
    status: str  # "ok" | "unavailable" | "not_found"
    data: dict[str, Any] | None = None
    fallback: str | None = None  # e.g. "cached" when returning a stale local result


class ThreatIntelProvider(ABC):
    name: str

    @abstractmethod
    async def lookup_ip(self, ip: str) -> IntelResult: ...

    @abstractmethod
    async def is_configured(self) -> bool: ...
