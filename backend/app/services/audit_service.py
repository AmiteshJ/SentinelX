from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id=None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> None:
    """Append a single audit event. Called from services/routers, never skipped for
    security-sensitive actions (login, OTP, rule/IOC changes, role/admin actions)."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        log_metadata=metadata,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
