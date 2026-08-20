# SentinelX Architecture

## Pipeline

```
REAL SECURITY TELEMETRY
  → DATA INGESTION
  → EVENT PROCESSING
  → DETECTION ENGINE (rules + Isolation Forest + GraphSAGE)
  → ALERT GENERATION
  → ALERT CORRELATION (graph-based)
  → INCIDENT CREATION
  → THREAT INTELLIGENCE ENRICHMENT
  → RISK SCORING
  → INVESTIGATION
  → AI-ASSISTED ANALYSIS (Groq + RAG)
  → SOC ANALYST
```

## System diagram (target, Phase 5+)

```
USER DEVICE → SentinelX Agent → Secure Ingestion API → Redis Streams
  → Detection Workers → MongoDB / PostgreSQL → WebSocket → React SOC Dashboard
```

## Operating modes

- **LIVE** — telemetry from the SentinelX Agent (requires explicit user consent).
- **DATASET** — CIC-IDS2017 / CSE-CIC-IDS2018 / BoT-IoT / ToN-IoT processed through the same
  pipeline as live telemetry.
- **REPLAY** — historical records from a dataset pushed through the pipeline according to their
  original timestamps.

The current mode is always shown in the UI (`● LIVE` / `● DATASET` / `● REPLAY` / `● OFFLINE`).
Replayed or dataset-derived data is never presented as live.

## No Mock Data Policy

SentinelX does not use `Math.random()`, fabricated alerts/incidents/IPs/traffic counts, or
placeholder ML metrics to make the UI look populated. Every value shown is either:

1. A real value from Postgres/Mongo/Redis/an external intelligence source, or
2. Explicitly marked as not-yet-implemented (see `ComingSoon` screens in the frontend, and the
   comments in `app/api/v1/dashboard.py`).

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Project architecture + UI foundation | ✅ done |
| 2 | Authentication + RBAC | ✅ done |
| 3 | PostgreSQL + MongoDB + Redis | ✅ done (connections + schema + pgvector) |
| 4 | Event ingestion | ✅ done (`/api/events/ingest`, `/api/datasets/upload`, Redis Streams) |
| 5 | Live monitoring agent | ⏳ not started — LIVE mode + consent UI exist end-to-end, but no agent produces real telemetry yet |
| 6 | Rule engine | ✅ done (`app/detection/rule_engine.py`, runs in `event_worker.py`) |
| 7 | Sigma-inspired rules | ✅ done (4 seed rules in `database/postgres/init.sql`; no rule-management UI/API yet — seed-only) |
| 8 | Threat intelligence | ✅ done (AbuseIPDB + URLhaus providers, local-first + graceful fallback, `/api/threat-intelligence`) |
| 9 | IOC database | ✅ done (`malicious_urls` Mongo collection, analyst-add flow, Redis write-through cache) |
| 10 | Risk scoring | ✅ done (`app/risk/risk_engine.py`, computed per incident) |
| 11 | Alert correlation (graph) | 🟡 partial — naive same-source-IP/time-window grouping; full node/edge graph traversal not yet built |
| 12 | Isolation Forest | ✅ done (`app/detection/anomaly_engine.py`, `/api/detection/anomaly/run`, trained on real ingested events) |
| 13 | ML comparison pipeline (RF/XGBoost/CNN/LSTM) | ✅ done (`ml/`, verified end-to-end for RF/XGBoost in this environment; CNN/LSTM syntax-verified, need `torch` installed to run) |
| 14 | Graph construction | ✅ done (`ml/graphsage/graph_construction.py`) |
| 15 | GraphSAGE zero-day research module | ✅ done (`ml/graphsage/`, `/api/experiments/run`; needs `torch-geometric` installed to run) |
| 16 | RAG + pgvector | ✅ done (`app/ai/embeddings.py` with graceful non-ML fallback, `app/services/knowledge_service.py`; no document-upload UI yet) |
| 17 | Groq AI Assistant | ✅ done (`app/ai/providers/`, Groq primary + Ollama fallback, `/api/ai/ask`) |
| 18 | Investigation + Cases | ✅ done (`/api/investigation/{id}`, `/api/cases`, both pages wired) |
| 19 | Reports | ✅ done (`/api/reports`, AI-drafted summary + real structured facts) |
| 20 | Testing + optimization | 🟡 ongoing — 11 unit tests for rule engine + dataset pipeline; integration/e2e tests not yet added |

## Backend module layout

```
backend/app/
├── api/v1/        # auth, dashboard, audit, events, monitoring, alerts (alerts+incidents
│                  #  read), datasets, ws, threat_intelligence, detection, experiments,
│                  #  ai_assistant, cases, investigation, reports — all implemented.
│                  #  Not yet implemented: dedicated rules-CRUD (rules are seed-only today),
│                  #  mitre, vulnerabilities browsing UI.
├── core/          # config, security (JWT/OTP/password hashing)
├── db/            # postgres.py, mongodb.py, redis_client.py (incl. Streams/pub-sub helpers)
├── models/        # SQLAlchemy ORM models (users/auth, detection_rules/incidents, cases)
├── schemas/       # Pydantic request/response models (auth, dashboard, event, alert, ioc, case)
├── repositories/  # DB access layer (user, rule, incident)
├── services/      # auth_service, otp_service, audit_service, notification_service,
│                  #  dataset_service (CSV pipeline), ioc_service, ml_service, report_service
├── workers/       # event_worker.py — consumes Redis Stream, runs detection,
│                  #  correlates, scores risk, publishes realtime updates
├── detection/     # rule_engine.py (Sigma-inspired), anomaly_engine.py (Isolation Forest)
├── intelligence/  # providers/ — AbuseIPDB, URLhaus clients; enrichment_service.py orchestrates
├── risk/          # risk_engine.py — weighted scoring
└── ai/            # providers/ (Groq, Ollama), embeddings.py (RAG), context_builder.py,
                   #  soc_assistant_service.py
```

The GraphSAGE zero-day research module, ML comparison pipelines (Random Forest, XGBoost, CNN,
LSTM), and shared preprocessing/evaluation code live at the repo root in `ml/` (per spec §56),
orchestrated from the backend via `app/services/ml_service.py` and exposed through
`/api/experiments`.

## Event pipeline (implemented, Phase 4/6/10/11 slice)

```
POST /api/events/ingest  or  POST /api/datasets/upload (CSV)
  → Redis Stream "sentinelx:events"
  → app/workers/event_worker.py (separate process — see scripts/run-local.sh)
      → store raw event in MongoDB "events"
      → app/detection/rule_engine.py evaluates enabled Postgres detection_rules
      → matched rule → MongoDB "alerts" document
      → naive same-source-IP/time-window correlation → Postgres "incidents" row
      → app/risk/risk_engine.py computes/updates incident.risk_score
      → publish to Redis pub/sub "sentinelx:updates"
          → GET /ws/updates relays to connected dashboards (no polling)
```

Nothing here is simulated: run the worker, POST a real event or upload a real CSV, and the
Security Operations page / dashboard counters / live feed update from that real write —
verified end-to-end with the included unit tests (`tests/test_rule_engine.py`,
`tests/test_dataset_service.py`).
