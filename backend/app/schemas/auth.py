import uuid

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    contact_number: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    message: str = "Registration successful. Check your email for a verification code."


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    purpose: str = "registration"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: str | None
    is_verified: bool

    model_config = {"from_attributes": True}
