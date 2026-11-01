"""
OTP and notification delivery service for SentinelX.

Supports real SMTP delivery (e.g. Gmail SMTP, AWS SES, SendGrid) when
credentials are provided in the environment. Falls back gracefully to console
logging if SMTP is not configured, ensuring development workflows remain testable.
"""
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import structlog

from app.core.config import get_settings

logger = structlog.get_logger("notifications")
settings = get_settings()


def _build_otp_email_html(to_email: str, code: str, purpose: str, expiry_minutes: int) -> tuple[str, str]:
    """Generates both text and rich HTML email bodies for the OTP."""
    purpose_label = "Account Verification" if purpose == "registration" else purpose.replace("_", " ").title()

    plain_text = f"""
SentinelX Security Verification Code
------------------------------------
Your one-time verification code is: {code}

This code was requested for {purpose_label} on {to_email}.
It is valid for {expiry_minutes} minutes.

If you did not initiate this request, someone may be trying to access your account.
SentinelX Cyber Defense Platform
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentinelX Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #05070a; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0b111e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.6);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: rgba(58, 160, 255, 0.12); border: 1px solid rgba(58, 160, 255, 0.3); border-radius: 10px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="color: #3aa0ff; font-size: 18px; font-weight: bold; line-height: 36px;">&#9939;</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Sentinel<span style="color: #3aa0ff;">X</span></span>
                    <span style="display: block; font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Security Command</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: -0.4px;">
                Confirm your identity
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Use the one-time verification code below to authorize your <strong style="color: #f1f5f9;">{purpose_label}</strong> request.
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(58, 160, 255, 0.3); border-radius: 14px; padding: 22px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 600; color: #3aa0ff; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">One-Time Verification Code</span>
                    <span style="font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 700; color: #ffffff; letter-spacing: 10px; text-shadow: 0 0 20px rgba(58, 160, 255, 0.4); display: block;">
                      {code}
                    </span>
                    <span style="display: block; margin-top: 10px; font-size: 12px; color: #64748b;">
                      &#9201; Valid for {expiry_minutes} minutes
                    </span>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                &#128274; <strong>Security Advisory:</strong> SentinelX staff will never ask for this code. If you did not make this request, please change your credentials immediately or contact your SOC administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">
                &copy; SentinelX Cyber Defense Platform &bull; Automated Identity Verification<br>
                This is an automated system email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return plain_text, html_content


def _send_smtp_sync(to_email: str, code: str, purpose: str) -> None:
    """Synchronous SMTP email delivery function executed in a background worker thread."""
    smtp_host = settings.smtp_host or "smtp.gmail.com"
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user
    smtp_password = settings.smtp_password
    from_email = settings.smtp_from_email or smtp_user or "sentinelx.hq@gmail.com"
    from_name = settings.smtp_from_name or "SentinelX Security"

    if not smtp_password:
        logger.warning(
            "smtp_password_missing_using_console_fallback",
            hint="Set SMTP_PASSWORD in backend/.env with your Google 16-character App Password to enable live emails.",
            to=to_email,
            code=code,
        )
        return

    plain_text, html_content = _build_otp_email_html(
        to_email=to_email,
        code=code,
        purpose=purpose,
        expiry_minutes=settings.otp_expiry_minutes,
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{code} is your SentinelX verification code"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if smtp_user and smtp_password:
            # Strip any spaces that might be copied from Google's 4-char spaced UI
            clean_pwd = smtp_password.replace(" ", "")
            server.login(smtp_user, clean_pwd)
        server.send_message(msg)

    logger.info("smtp_email_dispatched_successfully", to=to_email, purpose=purpose)


async def send_otp_email(to_email: str, code: str, purpose: str) -> None:
    """Dispatches the OTP email asynchronously without blocking the FastAPI event loop."""
    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, code, purpose)
    except Exception as exc:
        logger.error("smtp_dispatch_failed", to=to_email, error=str(exc))
        # Keep fallback logging in terminal so developer is never locked out
        logger.info("otp_console_fallback", to=to_email, purpose=purpose, code=code)
