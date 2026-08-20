"""
OTP/notification delivery abstraction.

Phase 1-2 implementation point: no SMTP/SMS provider is configured yet, so this
deliberately does NOT pretend to send a real email/SMS. In development it logs
the OTP server-side (visible in the `uvicorn` terminal / log output) so the auth
flow is fully testable end-to-end. Wire a real provider (SES, Twilio, etc.)
here before production — see docs/security.md.
"""
import structlog

logger = structlog.get_logger("notifications")


async def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    # TODO(production): replace with a real transactional email provider.
    logger.info("otp_issued_dev_mode", to=to_email, purpose=purpose, code=code)
