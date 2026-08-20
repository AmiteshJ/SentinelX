# SentinelX

**An AI-Assisted SOC for Advanced Threat Detection and Intelligent Incident Investigation**

BE Computer Engineering major project. SentinelX ingests real security telemetry, runs
rule-based + ML-based detection, correlates alerts into incidents, enriches indicators with
threat intelligence, scores risk, and supports AI-assisted investigation — all backed by a
real-time SOC dashboard.

> **Current status: Phases 1-4, 6-20 implemented** (Phase 5 — the live agent — and full
> graph-based correlation in Phase 11 are the two remaining gaps). Architecture, database schema,
> auth/RBAC/OTP, real event ingestion (API + CSV dataset upload), a Sigma-inspired rule engine,
> alert correlation, weighted risk scoring, threat intelligence + custom IOC database, Isolation
> Forest anomaly detection, the full ML comparison pipeline (Random Forest, XGBoost, CNN, LSTM,
> GraphSAGE) with a real zero-day held-out-class experiment, RAG over pgvector, a Groq-backed AI
> SOC Assistant (with local Ollama fallback), case management, the investigation workspace, and
> AI-drafted incident reports are all implemented end-to-end and wired into the frontend. See
> `docs/architecture.md` for the full phase-by-phase status table, including what's honestly
> still a gap (no live agent yet; alert correlation is same-IP/time-window rather than full graph
> traversal; CNN/LSTM/GraphSAGE are syntax-verified but need `torch`/`torch-geometric` installed
> to execute).

## Architecture

```
SentinelX Agent → Secure Ingestion API → Redis Streams → Detection Workers
    → MongoDB / PostgreSQL → WebSocket → React SOC Dashboard
```

See `docs/architecture.md` for the full pipeline and phase roadmap.

## Tech stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand
- **Backend**: FastAPI + SQLAlchemy (async) + Motor (MongoDB) + Redis
- **Databases**: PostgreSQL ([Neon](https://neon.tech)), MongoDB ([Atlas](https://www.mongodb.com/atlas)), Redis ([Upstash](https://upstash.com)) — all cloud-hosted, no local database installs or containers required
- **ML (scoped, Phase 13-15)**: scikit-learn, XGBoost, PyTorch, PyTorch Geometric (GraphSAGE)
- **AI (scoped, Phase 16-17)**: Groq (primary), Ollama/local model (fallback), pgvector (RAG)

## Repository layout

```
sentinelx/
├── frontend/       React SOC dashboard
├── backend/        FastAPI application + event worker
├── agent/          SentinelX network telemetry agent (Phase 5, not yet implemented)
├── ml/             Model training pipelines (Random Forest, XGBoost, CNN, LSTM, GraphSAGE)
├── database/       SQL schema (run once against your Neon database)
├── docs/           Architecture, database, API, ML, security docs
└── scripts/        Dev tooling (run-local.sh)
```

## Setup — three cloud databases, no Docker

This project runs as plain local processes against cloud-hosted databases — no Docker, no local
Postgres/MongoDB/Redis installs.

### 1. Create the three databases (all have free tiers)

- **Postgres** → [neon.tech](https://neon.tech) → create a project → copy the connection string
- **MongoDB** → [mongodb.com/atlas](https://www.mongodb.com/atlas) → create a free cluster →
  Database → Connect → Drivers → copy the connection string
- **Redis** → [upstash.com](https://upstash.com) → create a database → **use the "Redis CLI" /
  TCP connection string (`rediss://...`), not the REST API URL** — Redis Streams and pub/sub
  (which the event worker and realtime dashboard depend on) only work over the real Redis
  protocol, not Upstash's HTTP REST API.

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and paste in your three connection strings (see the inline comments in
`.env.example` for the exact format each one needs — Neon in particular needs
`postgresql+asyncpg://...` with `ssl=require`, though the backend also auto-detects Neon hosts
and enables SSL even if you forget that part). Also generate a real `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Initialize the Postgres schema (one-time)

Run this once against your Neon database — it creates every table, the `pgvector` extension, and
seeds the RBAC roles/permissions + detection rules:

```bash
psql "<your Neon connection string — the plain psql one from Neon's dashboard, not the asyncpg one>" \
  -f database/postgres/init.sql
```
(No `psql` installed? Neon's dashboard has a built-in SQL editor — paste the contents of
`database/postgres/init.sql` there instead.)

MongoDB and Redis need no setup step — collections/keys are created automatically on first write.

### 4. Install dependencies

```bash
# backend
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..

# frontend
cd frontend && npm install && cd ..
```

Heads-up: `requirements.txt` includes `torch` + `torch-geometric` for the CNN/LSTM/GraphSAGE
zero-day module — that's a genuinely large install (~1GB+). Everything else in the app works
without them; only `/api/experiments/run` with `cnn`/`lstm`/`graphsage` selected needs them.

### 5. Run it

Easiest — one script starts all three processes (macOS/Linux):
```bash
./scripts/run-local.sh
```

Or manually in three terminals:
```bash
# Terminal 1 — backend API
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2 — event worker (detection, correlation, risk scoring)
cd backend && source .venv/bin/activate && python -m app.workers.event_worker

# Terminal 3 — frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Backend health: http://localhost:8000/health

## Auth flow (implemented)

1. `POST /api/auth/register` — full name, email, contact number, password.
2. Backend issues a hashed, expiring OTP and logs the plaintext code (dev mode — see
   `app/services/notification_service.py`) since no email/SMS provider is wired up yet.
3. `POST /api/auth/verify-otp` — activates the account.
4. `POST /api/auth/login` — returns a JWT access + refresh token pair.
5. `GET /api/auth/me` — current user, used by the frontend to populate the session.

New accounts default to the `viewer` role. Role elevation is an explicit admin action (not yet
exposed via UI — see `docs/architecture.md` Phase 2 hardening).

## Event ingestion (implemented)

Two ways to get real data flowing through the pipeline (see `docs/architecture.md` for the full
diagram):

```bash
# Direct event ingestion (LIVE/DATASET/REPLAY — you choose the mode)
curl -X POST http://localhost:8000/api/events/ingest \
  -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" \
  -d '{"mode": "LIVE", "events": [{"source_ip": "10.0.0.5", "destination_port": 4444}]}'

# CSV dataset upload (CIC-IDS2017/CSE-CIC-IDS2018-style columns; admin/soc_analyst only)
curl -X POST http://localhost:8000/api/datasets/upload \
  -H "Authorization: Bearer <access_token>" -F "file=@your_dataset.csv"
```

Both paths push onto the same Redis Stream; the event worker process (`python -m
app.workers.event_worker` — see §5 above) consumes it, runs the seeded detection rules,
correlates matches into incidents, scores risk, and publishes to `/ws/updates` — so the Security
Operations page and dashboard update live. **Make sure the worker process is actually running**,
or events will queue in Redis but nothing will ever process them.

## Running tests

```bash
python3 -m pytest tests/ -v
```

Covers the rule engine (`app/detection/rule_engine.py`) and the CSV dataset pipeline
(`app/services/dataset_service.py`) with in-memory fixtures — no real dataset file required.

## Environment variables

See `backend/.env.example` for the full list (Postgres/Mongo/Redis connection strings, OTP
settings, and optional keys for Groq / AbuseIPDB / VirusTotal / URLhaus / NVD that are not
required for this phase to run).

## Documentation

- `docs/architecture.md` — full system architecture + phase roadmap
- `docs/database.md` — polyglot database responsibilities (Postgres/Mongo/Redis/pgvector)
- `docs/security.md` — auth, RBAC, OTP, audit logging, secret management
- `docs/ml.md` — ML comparison pipeline plan (Phase 13+)
- `docs/zero-day-research.md` — GraphSAGE zero-day experiment design (Phase 15)

## No-mock-data policy

SentinelX never fabricates alerts, incidents, traffic counts, or ML results to make the UI look
populated. Every number displayed is either a real value from a connected database/service, or
the screen explicitly says the feature isn't built yet. See `docs/architecture.md` §"No Mock Data
Policy".
