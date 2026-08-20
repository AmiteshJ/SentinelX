import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import Role, User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).options(selectinload(User.role)).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).options(selectinload(User.role)).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        full_name: str,
        email: str,
        contact_number: str,
        hashed_password: str,
        role_id: uuid.UUID | None,
    ) -> User:
        user = User(
            full_name=full_name,
            email=email,
            contact_number=contact_number,
            hashed_password=hashed_password,
            role_id=role_id,
            is_active=False,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def mark_verified(self, user: User) -> User:
        user.is_verified = True
        user.is_active = True
        await self.db.flush()
        # Ensure role is populated on return
        user = await self.get_by_id(user.id)
        return user
