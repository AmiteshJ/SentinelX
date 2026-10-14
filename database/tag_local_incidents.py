import asyncio
import os
import socket
import sys

# Ensure backend directory is in python search path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncpg  # type: ignore[import-not-found]
from app.core.config import get_settings  # type: ignore[import-not-found]
from app.db.mongodb import connect_mongo, get_mongo_db  # type: ignore[import-not-found]


async def main() -> None:
    settings = get_settings()
    url = (
        settings.postgres_database_url
        .replace("postgresql+asyncpg://", "postgres://")
        .replace("postgresql://", "postgres://")
    )
    hostname = socket.gethostname()

    print(f"Connecting to Postgres to verify incidents for host '{hostname}'...")
    conn = await asyncpg.connect(url, ssl="require")
    try:
        updated = await conn.execute(
            "UPDATE incidents SET hostname = $1 WHERE hostname IS NULL",
            hostname,
        )
        print(f"Incidents updated: {updated}")

        rows = await conn.fetch("SELECT id, title, hostname, user_id FROM incidents")
        for r in rows:
            print(f"  {r['title']} | Host: {r['hostname']} | User: {r['user_id']}")
    finally:
        await conn.close()

    # Tag MongoDB alerts
    connect_mongo()
    db = get_mongo_db()
    res = await db.alerts.update_many(
        {"hostname": None},
        {"$set": {"hostname": hostname}},
    )
    print(f"MongoDB alerts updated: {res.modified_count}")


if __name__ == "__main__":
    asyncio.run(main())
