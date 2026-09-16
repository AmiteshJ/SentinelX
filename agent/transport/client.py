import httpx
from typing import List, Dict, Any
from .auth import AgentAuth

class SentinelXClient:
    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip('/')
        self.auth = AgentAuth(api_url)
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            timeout = httpx.Timeout(30.0, connect=10.0)
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
            self._client = httpx.AsyncClient(timeout=timeout, limits=limits)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def send_events(self, events: List[Dict[str, Any]]):
        """Send a batch of events to the SentinelX ingestion API."""
        if not events:
            return

        token = await self.auth.get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        payload = {
            "mode": "LIVE",
            "events": events
        }

        client = self._get_client()
        response = await client.post(
            f"{self.api_url}/api/events/ingest",
            json=payload,
            headers=headers
        )
        if response.status_code != 200:
            print(f"Failed to send events: {response.status_code} - {response.text}")
                
    async def poll_commands(self) -> List[Dict[str, Any]]:
        """Poll the backend for pending commands."""
        token = await self.auth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        client = self._get_client()
        response = await client.get(f"{self.api_url}/api/agent/commands", headers=headers)
        if response.status_code == 200:
            return response.json().get("commands", [])
        return []

    async def send_command_result(self, command_id: str, status: str, output: str):
        """Report execution result back to backend."""
        token = await self.auth.get_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        payload = {
            "command_id": command_id,
            "status": status,
            "output": output
        }
        
        client = self._get_client()
        await client.post(f"{self.api_url}/api/agent/command-result", json=payload, headers=headers)
    async def send_heartbeat(self, hostname: str, os_name: str, connections_count: int) -> Dict[str, Any]:
        """Send heartbeat to backend and receive updated permission policies."""
        try:
            token = await self.auth.get_token()
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            payload = {
                "hostname": hostname,
                "os": os_name,
                "connections_count": connections_count
            }
            client = self._get_client()
            response = await client.post(f"{self.api_url}/api/agent/heartbeat", json=payload, headers=headers)
            if response.status_code == 200:
                return response.json().get("policy", {})
        except Exception as e:
            pass
        return {}
