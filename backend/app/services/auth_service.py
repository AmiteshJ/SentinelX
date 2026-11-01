import secrets
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services import audit_service, otp_service
from app.services.notification_service import send_otp_email

settings = get_settings()


class AuthError(Exception):
    pass


async def register_user(db: AsyncSession, *, full_name: str, email: str,
                         contact_number: str, password: str):
    repo = UserRepository(db)

    if await repo.get_by_email(email) is not None:
        raise AuthError("An account with this email already exists.")

    # Default role for self-registration is "viewer"; elevation is an explicit
    # admin action (see /api/users), never granted at signup.
    default_role = await repo.get_role_by_name("viewer")

    user = await repo.create(
        full_name=full_name,
        email=email,
        contact_number=contact_number,
        hashed_password=hash_password(password),
        role_id=default_role.id if default_role else None,
    )

    code = await otp_service.issue_otp(db, user.id, purpose="registration")
    await send_otp_email(user.email, code, purpose="registration")
    await audit_service.log_action(db, user_id=user.id, action="user.register", resource_type="user", resource_id=str(user.id))
    return user


async def verify_registration(db: AsyncSession, *, email: str, code: str):
    repo = UserRepository(db)
    user = await repo.get_by_email(email)
    if user is None:
        raise AuthError("No account found for this email.")

    try:
        await otp_service.verify_otp(db, user.id, purpose="registration", submitted_code=code)
    except otp_service.OtpError as exc:
        raise AuthError(str(exc)) from exc

    user = await repo.mark_verified(user)
    await audit_service.log_action(db, user_id=user.id, action="user.verify_otp", resource_type="user", resource_id=str(user.id))
    return user


async def authenticate(db: AsyncSession, *, email: str, password: str):
    repo = UserRepository(db)
    user = await repo.get_by_email(email)

    if user is None or not verify_password(password, user.hashed_password):
        raise AuthError("Incorrect email or password.")

    if not user.is_verified:
        raise AuthError("Account not verified. Complete OTP verification first.")

    await audit_service.log_action(db, user_id=user.id, action="user.login", resource_type="user", resource_id=str(user.id))

    role_name = user.role.name if user.role else None
    access_token = create_access_token(str(user.id), extra_claims={"role": role_name})
    refresh_token = create_refresh_token(str(user.id))
    return user, access_token, refresh_token


async def authenticate_with_google(db: AsyncSession, *, credential: str | None = None, access_token: str | None = None):
    """
    Verifies a Google OAuth ID token or OAuth access token using Google's services,
    automatically creates or links the account in PostgreSQL, and issues
    SentinelX JWT session tokens.
    """
    if not credential and not access_token:
        raise AuthError("Neither Google ID token nor access token was provided.")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if credential:
                resp = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": credential},
                )
            else:
                resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )

            if resp.status_code != 200:
                raise AuthError("Invalid or expired Google authentication credential.")
            info = resp.json()
    except Exception as exc:
        if isinstance(exc, AuthError):
            raise
        raise AuthError(f"Failed to communicate with Google authentication services: {exc}") from exc

    # If client ID is configured and this is an ID token, enforce audience check
    if credential and settings.google_client_id and info.get("aud") != settings.google_client_id:
        raise AuthError("Google token audience mismatch.")

    email = info.get("email")
    if not email:
        raise AuthError("Google account did not provide a valid email address.")

    email_verified = info.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        raise AuthError("Google account email is not verified.")

    full_name = info.get("name") or info.get("given_name") or email.split("@")[0]

    repo = UserRepository(db)
    user = await repo.get_by_email(email)

    if user is None:
        default_role = await repo.get_role_by_name("viewer")
        user = User(
            full_name=full_name,
            email=email,
            contact_number="",
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            role_id=default_role.id if default_role else None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        user = await repo.get_by_id(user.id)
        await audit_service.log_action(db, user_id=user.id, action="user.register_google", resource_type="user", resource_id=str(user.id))
    else:
        if not user.is_verified or not user.is_active:
            user = await repo.mark_verified(user)
        await audit_service.log_action(db, user_id=user.id, action="user.login_google", resource_type="user", resource_id=str(user.id))

    role_name = user.role.name if user.role else None
    access_token = create_access_token(str(user.id), extra_claims={"role": role_name})
    refresh_token = create_refresh_token(str(user.id))
    return user, access_token, refresh_token
