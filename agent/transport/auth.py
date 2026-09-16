import os
import httpx
from datetime import datetime, timedelta

class AgentAuth:
    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip('/')
        self.email = os.getenv("SENTINELX_USER_EMAIL")
        self.password = os.getenv("SENTINELX_USER_PASSWORD")
        self.token = None
        self.token_expires_at = None

    async def get_token(self) -> str:
        """Get a valid JWT token, fetching a new one if necessary."""
        if not self.email or not self.password:
            raise ValueError("Email and password must be set in .env")

        if self.token and self.token_expires_at and datetime.utcnow() < self.token_expires_at:
            return self.token
            
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            payload = {
                "email": self.email,
                "password": self.password,
            }
            response = await client.post(f"{self.api_url}/api/auth/login", json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Failed to authenticate: {response.text}")
                
            json_response = response.json()
            self.token = json_response.get("access_token")
            # Assume token lasts for at least 15 minutes, refresh 1 min early
            self.token_expires_at = datetime.utcnow() + timedelta(minutes=14)
            return self.token
