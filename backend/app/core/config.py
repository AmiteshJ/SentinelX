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

    # SMTP / Email Delivery
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_name: str = "SentinelX Security"
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    # Google OAuth 2.0
    google_client_id: str | None = None
    google_client_secret: str | None = None

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
