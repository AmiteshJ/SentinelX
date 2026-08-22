"""
SQLAlchemy ORM models registry for SentinelX.
Importing this package ensures all model classes and tables are registered
with Base.metadata so foreign keys resolve across models properly.
"""

from app.models.user import User, Role, OtpCode, Session
from app.models.detection import DetectionRule, Incident
from app.models.case import Case
from app.models.audit import AuditLog

__all__ = [
    "User",
    "Role",
    "OtpCode",
    "Session",
    "DetectionRule",
    "Incident",
    "Case",
    "AuditLog",
]
