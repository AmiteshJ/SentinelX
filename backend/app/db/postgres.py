"""
Async SQLAlchemy engine/session for PostgreSQL — Neon (cloud) by default, or
any standard Postgres. This is the structured system of record: users,
roles, permissions, sessions, incidents, cases, detection rules, audit logs.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


def _build_engine():
    """
    asyncpg wants SSL passed as a connect_args kwarg, not as a `sslmode=`/`ssl=`
    query string it will happily ignore (or error on, depending on version) —
    so we parse it out of the URL here rather than relying on the person's
    .env string being exactly right. Neon hosts are also auto-detected as a
    safety net in case `ssl=require` is left off the URL entirely.
    """
    url_obj = make_url(settings.postgres_database_url)
    query = dict(url_obj.query)
    ssl_requested = query.pop("ssl", None) or query.pop("sslmode", None)
    is_neon = "neon.tech" in (url_obj.host or "")

    connect_args = {}
    if ssl_requested or is_neon:
        connect_args["ssl"] = "require"

    url_obj = url_obj.set(query=query)
    return create_async_engine(url_obj, echo=False, pool_pre_ping=True, connect_args=connect_args)


engine = _build_engine()
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def check_postgres_health() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception:
        return False

