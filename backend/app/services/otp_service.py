from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import generate_otp, hash_otp, verify_otp_hash
from app.models.user import OtpCode

settings = get_settings()


class OtpError(Exception):
    pass


async def issue_otp(db: AsyncSession, user_id, purpose: str) -> str:
    """Generates and stores a hashed OTP. Returns the PLAINTEXT code exactly once,
    so the caller can deliver it (email/SMS). It is never persisted in plaintext
    and never logged."""
    code = generate_otp(settings.otp_length)
    otp = OtpCode(
        user_id=user_id,
        purpose=purpose,
        code_hash=hash_otp(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expiry_minutes),
        max_attempts=settings.otp_max_attempts,
    )
    db.add(otp)
    await db.flush()
    return code


async def verify_otp(db: AsyncSession, user_id, purpose: str, submitted_code: str) -> bool:
    result = await db.execute(
        select(OtpCode)
        .where(OtpCode.user_id == user_id, OtpCode.purpose == purpose, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
    )
    otp = result.scalars().first()

    if otp is None:
        raise OtpError("No pending verification code for this user.")

    if otp.expires_at < datetime.now(timezone.utc):
        raise OtpError("Verification code has expired. Request a new one.")

    if otp.attempt_count >= otp.max_attempts:
        raise OtpError("Too many attempts. Request a new verification code.")

    otp.attempt_count += 1

    if not verify_otp_hash(submitted_code, otp.code_hash):
        await db.flush()
        raise OtpError("Incorrect verification code.")

    otp.consumed = True
    await db.flush()
    return True
