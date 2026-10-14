import asyncio
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

import asyncpg
from app.core.config import get_settings

async def migrate():
    settings = get_settings()
    url = settings.postgres_database_url.replace("postgresql+asyncpg://", "postgres://").replace("postgresql://", "postgres://")
    conn = await asyncpg.connect(url, ssl="require")
    try:
        print("Adding user_id and hostname columns to incidents and cases...")
        
        await conn.execute("""
            ALTER TABLE incidents 
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            
            ALTER TABLE incidents 
            ADD COLUMN IF NOT EXISTS hostname VARCHAR(100);
            
            ALTER TABLE cases 
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
            CREATE INDEX IF NOT EXISTS idx_incidents_hostname ON incidents(hostname);
            CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
        """)
        
        # Link existing 8 incidents to Amitesh's account so they don't remain orphaned
        amitesh = await conn.fetchrow("SELECT id FROM users WHERE email = 'amiteshj2703@gmail.com'")
        if amitesh:
            amitesh_id = amitesh["id"]
            updated = await conn.execute(
                "UPDATE incidents SET user_id = $1 WHERE user_id IS NULL",
                amitesh_id
            )
            print(f"Associated existing incidents with Amitesh ({amitesh_id}): {updated}")
            
        print("SUCCESS: Database schema upgraded with user and host isolation!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
