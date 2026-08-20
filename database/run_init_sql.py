import asyncio
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

import asyncpg
from app.core.config import get_settings

async def init_db():
    settings = get_settings()
    # Strip asyncpg+ prefix if present
    db_url = settings.postgres_database_url.replace("postgresql+asyncpg://", "postgres://").replace("postgresql://", "postgres://")
    
    sql_path = os.path.join(os.path.dirname(__file__), "postgres", "init.sql")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_script = f.read()

    print("Connecting directly to Neon PostgreSQL...")
    conn = await asyncpg.connect(db_url, ssl="require")
    try:
        print("Executing init.sql DDL & seed data...")
        await conn.execute(sql_script)
        print("SUCCESS: PostgreSQL schema and seed data initialized successfully!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(init_db())
