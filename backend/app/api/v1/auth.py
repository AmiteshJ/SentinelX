from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, decode_token, verify_password
from app.db.postgres import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserOut,
    VerifyOtpRequest,
)
from app.services import auth_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.register_user(
            db,
            full_name=payload.full_name,
            email=payload.email,
            contact_number=payload.contact_number,
            password=payload.password,
        )
        await db.commit()
    except auth_service.AuthError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return RegisterResponse(user_id=user.id, email=user.email)


@router.post("/verify-otp", response_model=UserOut)
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.verify_registration(db, email=payload.email, code=payload.code)
        await db.commit()
    except auth_service.AuthError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return UserOut(id=user.id, full_name=user.full_name, email=user.email,
                    role=user.role.name if user.role else None, is_verified=user.is_verified)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        _, access_token, refresh_token = await auth_service.authenticate(
            db, email=payload.email, password=payload.password
        )
        await db.commit()
    except auth_service.AuthError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        _, access_token, refresh_token = await auth_service.authenticate_with_google(
            db, credential=payload.credential, access_token=payload.access_token
        )
        await db.commit()
    except auth_service.AuthError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        claims = decode_token(payload.refresh_token)
        if claims.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    repo = UserRepository(db)
    user = await repo.get_by_id(claims["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    role_name = user.role.name if user.role else None
    new_access_token = create_access_token(str(user.id), extra_claims={"role": role_name})
    return TokenResponse(access_token=new_access_token, refresh_token=payload.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.name if user.role else None,
        is_verified=user.is_verified,
        contact_number=user.contact_number,
        avatar_url=user.avatar_url,
    )


@router.put("/profile", response_model=UserOut)
@router.patch("/profile", response_model=UserOut)
@router.put("/me", response_model=UserOut)
@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.contact_number is not None:
        user.contact_number = payload.contact_number.strip()
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.name if user.role else None,
        is_verified=user.is_verified,
        contact_number=user.contact_number,
        avatar_url=user.avatar_url,
    )
