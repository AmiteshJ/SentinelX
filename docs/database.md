# Database Architecture

SentinelX uses a polyglot architecture, all three cloud-hosted (no local database installs or
containers). Each database has one clear responsibility — data is **not** duplicated across all
three as a matter of course.

## PostgreSQL — [Neon](https://neon.tech)

Structured relational system of record:

- `roles`, `permissions`, `role_permissions` — RBAC
- `users`, `otp_codes`, `sessions` — auth
- `incidents`, `cases`, `detection_rules` — structured investigation records
  (raw events/alerts referenced by id, not duplicated, from MongoDB)
- `audit_logs` — append-only
- `knowledge_chunks` — pgvector embeddings for RAG (see below)

Schema: `database/postgres/init.sql`, run once against your Neon database (see README §3). ORM
models: `backend/app/models/`. Connection handling — including automatic SSL for Neon hosts —
lives in `backend/app/db/postgres.py`.

## MongoDB — [Atlas](https://www.mongodb.com/atlas)

High-volume, flexible security data. No setup step needed — collections are created
automatically on first write:

- `events` — raw security telemetry (written by `app/workers/event_worker.py`)
- `alerts` — individual detections
- `malicious_urls`, `malicious_ips` — custom + externally-enriched IOCs (spec §16)
- `intel_cache` — cached external threat-intel lookups (AbuseIPDB, etc.)
- `anomaly_scores` — Isolation Forest output
- `ml_experiments` — zero-day/ML comparison results
- `reports` — generated incident reports

Connection: `backend/app/db/mongodb.py`.

## Redis — [Upstash](https://upstash.com)

Real-time streams, cache, rate limiting, temporary state. **Not** a source of truth — nothing
here is durable that isn't also written to Postgres or Mongo. Use the TCP/`rediss://` connection
string, not Upstash's REST API — see README §1 for why.

- `sentinelx:events` — Redis Stream, the event ingestion backbone
- `sentinelx:updates` — pub/sub channel the WebSocket layer relays to the frontend
- `sentinelx:ioc:malicious_urls` — write-through cache for fast IOC matching
- `sentinelx:monitoring:mode` — current LIVE/DATASET/REPLAY/OFFLINE state

Connection: `backend/app/db/redis_client.py`.

## PostgreSQL + pgvector

`knowledge_chunks` (in the same Neon database, created by `database/postgres/init.sql`) stores
384-dim embeddings for MITRE ATT&CK knowledge, security documentation, incident reports, and
threat intel descriptions, used for RAG-backed AI assistant responses. Embedding + retrieval
logic: `backend/app/ai/embeddings.py`, `backend/app/services/knowledge_service.py`.
