import httpx
import structlog

from app.intelligence.providers.base import IntelResult, ThreatIntelProvider

logger = structlog.get_logger("intel.urlhaus")


class URLhausProvider(ThreatIntelProvider):
    """URLhaus's core lookup API is free/keyless, so this is 'configured' by default;
    it still degrades gracefully on network failure."""

    name = "URLhaus"

    async def is_configured(self) -> bool:
        return True

    async def lookup_ip(self, ip: str) -> IntelResult:
        # URLhaus is URL/host-oriented; IP lookups aren't its primary use case,
        # so this provider is invoked from the URL lookup path instead — see
        # lookup_url below. Kept here to satisfy the common interface.
        return IntelResult(source=self.name, status="unavailable", fallback="cached")

    async def lookup_url(self, url: str) -> IntelResult:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post("https://urlhaus-api.abuse.ch/v1/url/", data={"url": url})
                resp.raise_for_status()
                payload = resp.json()
                if payload.get("query_status") != "ok":
                    return IntelResult(source=self.name, status="not_found")
                return IntelResult(
                    source=self.name,
                    status="ok",
                    data={
                        "threat": payload.get("threat"),
                        "url_status": payload.get("url_status"),
                        "tags": payload.get("tags"),
                    },
                )
        except httpx.HTTPError as exc:
            logger.warning("urlhaus_lookup_failed", url=url, error=str(exc))
            return IntelResult(source=self.name, status="unavailable", fallback="cached")
