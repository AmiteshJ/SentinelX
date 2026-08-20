import uuid
from datetime import datetime

from pydantic import BaseModel


class CaseIn(BaseModel):
    title: str
    description: str | None = None
    severity: str = "medium"
    related_incident_ids: list[uuid.UUID] = []


class CaseUpdate(BaseModel):
    status: str | None = None
    assigned_analyst_id: uuid.UUID | None = None
    description: str | None = None


class CaseOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    severity: str
    status: str
    assigned_analyst_id: uuid.UUID | None
    related_incident_ids: list[uuid.UUID] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
