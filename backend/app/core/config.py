"""
Centralized application settings, loaded from environment variables.
See backend/.env.example for the full list of configurable values.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    environment: str = "development"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"

    # Postgres
    postgres_database_url: str

    # MongoDB
    mongodb_uri: str
    mongodb_db_name: str = "sentinelx"

    # Redis
    redis_url: str

    # OTP
    otp_expiry_minutes: int = 5
    otp_max_attempts: int = 5
    otp_length: int = 6

    # AI providers (optional — system must function without them)
    groq_api_key: str | None = None
    ollama_base_url: str | None = None

    # Threat intel (optional — system must function without them)
    abuseipdb_api_key: str | None = None
    virustotal_api_key: str | None = None
    urlhaus_api_key: str | None = None
    nvd_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
