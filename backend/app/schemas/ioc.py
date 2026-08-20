from datetime import datetime

from pydantic import BaseModel, Field


class MaliciousUrlIn(BaseModel):
    url: str
    threat_type: str = Field(description="phishing | malware | c2 | spam | other")
    severity: str = "medium"
    confidence: int = Field(ge=0, le=100, default=70)
    tags: list[str] = Field(default_factory=list)
    notes: str | None = None


class MaliciousUrlOut(BaseModel):
    id: str
    url: str
    normalized_url: str
    domain: str
    threat_type: str
    severity: str
    confidence: int
    source: str
    status: str  # PENDING | VERIFIED | ACTIVE
    active: bool
    tags: list[str]
    analyst: str | None
    notes: str | None
    first_seen: datetime
    last_seen: datetime


class IocIn(BaseModel):
    ioc_type: str = Field(description="ip | domain | hash")
    value: str
    threat_type: str
    severity: str = "medium"
    confidence: int = Field(ge=0, le=100, default=70)
    notes: str | None = None
