import httpx
import structlog

from app.core.config import get_settings
from app.intelligence.providers.base import IntelResult, ThreatIntelProvider

logger = structlog.get_logger("intel.abuseipdb")
settings = get_settings()


class AbuseIPDBProvider(ThreatIntelProvider):
    name = "AbuseIPDB"

    async def is_configured(self) -> bool:
        return bool(settings.abuseipdb_api_key)

    async def lookup_ip(self, ip: str) -> IntelResult:
        if not await self.is_configured():
            return IntelResult(source=self.name, status="unavailable", fallback="cached")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://api.abuseipdb.com/api/v2/check",
                    params={"ipAddress": ip, "maxAgeInDays": 90},
                    headers={"Key": settings.abuseipdb_api_key, "Accept": "application/json"},
                )
                resp.raise_for_status()
                payload = resp.json().get("data", {})
                return IntelResult(
                    source=self.name,
                    status="ok",
                    data={
                        "abuse_confidence_score": payload.get("abuseConfidenceScore"),
                        "total_reports": payload.get("totalReports"),
                        "country_code": payload.get("countryCode"),
                        "is_public": payload.get("isPublic"),
                    },
                )
        except httpx.HTTPError as exc:
            logger.warning("abuseipdb_lookup_failed", ip=ip, error=str(exc))
            return IntelResult(source=self.name, status="unavailable", fallback="cached")
