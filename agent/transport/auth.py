import os
import httpx
from datetime import datetime, timedelta

class AgentAuth:
    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip('/')
        self.agent_token = os.getenv("SENTINELX_AGENT_TOKEN")
        self.email = os.getenv("SENTINELX_USER_EMAIL")
        self.password = os.getenv("SENTINELX_USER_PASSWORD")
        self.token = None
        self.token_expires_at = None

    async def get_token(self) -> str:
        """Get a valid token: directly returns agent enrollment token if present, or logs in via credentials."""
        # 1. Direct Agent Enrollment Token (Preferred, passwordless)
        if self.agent_token:
            return self.agent_token

        # Check again in case it was set dynamically after startup
        env_token = os.getenv("SENTINELX_AGENT_TOKEN")
        if env_token:
            self.agent_token = env_token
            return self.agent_token

        # 2. Email / Password credential fallback
        if not self.email or not self.password:
            raise ValueError(
                "Agent is not enrolled. Please pass an enrollment token with --token <token> "
                "or click 'Activate My Machine' in the SentinelX TopBar."
            )

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
            self.token_expires_at = datetime.utcnow() + timedelta(minutes=14)
            return self.token
