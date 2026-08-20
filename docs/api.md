# API Reference

Base URL (local): `http://localhost:8000`. Interactive docs: `/docs` (Swagger UI).

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | none | Create account (full name, email, contact number, password) |
| POST | `/verify-otp` | none | Verify the 6-digit code sent at registration |
| POST | `/login` | none | Exchange email+password for access/refresh JWTs |
| POST | `/refresh` | none | Exchange a refresh token for a new access token |
| GET | `/me` | Bearer | Current authenticated user |

## Dashboard & realtime

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/overview` | Bearer | Real system health + alert/incident counters |
| GET | `/api/monitoring/mode` | Bearer | Current ingestion mode (LIVE/DATASET/REPLAY/OFFLINE) |
| WS | `/ws/updates?token=<access_token>` | token query param | Realtime alert/incident push (pub/sub relay) |

## Event ingestion

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/events/ingest` | Bearer | Push normalized events (LIVE/DATASET/REPLAY) onto the Redis Stream |
| POST | `/api/datasets/upload` | admin/soc_analyst | CSV upload → cleaned → normalized → ingested as DATASET |

## Security Operations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/alerts` | Bearer | Paginated alerts (MongoDB), filterable by severity/status |
| GET | `/api/incidents` | Bearer | Paginated incidents (PostgreSQL), filterable by status |
| POST | `/api/detection/anomaly/run` | admin/soc_analyst | Trains + scores Isolation Forest on real recent events |

## Threat Intelligence & Risk

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/threat-intelligence/overview` | Bearer | IOC counts |
| GET | `/api/threat-intelligence/urls` | Bearer | List malicious URLs |
| POST | `/api/threat-intelligence/urls` | admin/soc_analyst | Add a custom malicious URL (immediately cached in Redis) |
| GET | `/api/threat-intelligence/urls/check?url=` | Bearer | Real-time URL match check (local-first) |
| GET | `/api/threat-intelligence/ip/{ip}` | Bearer | IP enrichment (local IOC → cache → AbuseIPDB, graceful fallback) |

## Zero-Day / ML Experiments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/experiments/run` | admin/soc_analyst | Upload labeled CSV, run RF/XGBoost/CNN/LSTM/GraphSAGE (optionally with a held-out class) |
| GET | `/api/experiments/history` | admin/soc_analyst/security_manager | Past experiment results |

## AI SOC Assistant

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/ask` | Bearer | Context-grounded Q&A (Groq primary, Ollama fallback); optional `incident_id` |

## Investigation, Cases, Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/investigation/{incident_id}` | Bearer | Full incident workspace: alerts, timeline, assets, MITRE mapping |
| GET / POST | `/api/cases` | Bearer / admin,soc_analyst,security_manager | List / create cases |
| PATCH | `/api/cases/{case_id}` | admin/soc_analyst/security_manager | Update case status/assignment |
| POST | `/api/reports/generate/{incident_id}` | admin/soc_analyst/security_manager | AI-drafted executive summary + real structured facts |
| GET | `/api/reports` | admin/soc_analyst/security_manager | List generated reports |

## Audit

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/audit/logs` | admin | Paginated append-only audit log |

## Not yet implemented

Dedicated rule-management CRUD (`detection_rules` is seed-only today), `/api/mitre` and
`/api/vulnerabilities` browsing endpoints, and a document-upload endpoint for the Knowledge Base
(the RAG ingestion service itself — `app/services/knowledge_service.py` — is implemented and
callable, just not yet exposed via a dedicated route + UI).
