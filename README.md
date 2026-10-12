# SentinelX

**An AI-Assisted SOC Platform for Advanced Threat Detection, Zero-Day Research, and Intelligent Incident Investigation**

SentinelX is a modern, full-stack Security Operations Center (SOC) platform engineered for enterprise-grade threat detection, graph-based alert correlation, automated SOAR containment, and AI-assisted investigation. It continuously ingests real security telemetry, evaluates traffic against Sigma-inspired detection rules and machine learning models, correlates disparate alerts into multi-stage incidents, enriches indicators with threat intelligence, and empowers analysts with an interactive AI assistant grounded in RAG.

---

## Current Status: Comprehensive Implementation

All major milestones across the architecture roadmap (Phases 1–20) are implemented and operational across backend, frontend, agent, and ML research modules:

- [x] **Live Endpoint Telemetry & SOAR Agent (`agent/`)**: Python-based background daemon collecting real-time socket connections, process mapping, and host telemetry, with bidirectional command polling for remote SOAR containment (firewall IP blocking, process termination, remediation).
- [x] **High-Throughput Ingestion Pipeline**: Redis Streams event buffer supporting `LIVE`, `DATASET` (CIC-IDS2017 / CSE-CIC-IDS2018), and `REPLAY` telemetry modes.
- [x] **Multi-Tiered Detection Engine**:
  - **Rule-Based Engine**: Real-time Sigma-inspired condition evaluation over incoming telemetry with a dedicated Detection Engineering Studio (`/detection`).
  - **Anomaly Detection**: Unsupervised Isolation Forest model trained on dynamic traffic features.
  - **Zero-Day Research Module**: Graph Neural Network (GraphSAGE with k-NN graph construction) and benchmark comparison pipeline (Random Forest, XGBoost, CNN, LSTM) targeting held-out novel attack classes.
- [x] **Graph-Based Alert Correlation & Force-Directed Graph**: Temporal and entity-pivot correlation clustering alerts into unified security incidents with an interactive force-directed visualizer (`/correlation` & Investigation view).
- [x] **MITRE ATT&CK Matrix**: Dynamic coverage heatmap (`/mitre-matrix`) mapping detected tactics and techniques across the enterprise attack lifecycle.
- [x] **Threat Intelligence & IOC Hub**: Real-time indicator enrichment via AbuseIPDB, URLhaus, and NVD feeds, backed by local Redis caching and a persistent IOC database (`/threat-intelligence`).
- [x] **Malware Detonation Workbench**: Static and dynamic sandbox simulation workbench (`/malware-analysis`) featuring cryptographic hash verification, entropy analysis, simulated execution, and YARA-style heuristic scoring.
- [x] **Hypothesis-Driven Threat Hunting**: Interactive hunt query runner and telemetry search (`/hunting`) for proactive indicator pivoting, baseline comparisons, and hunt campaigns.
- [x] **RAG Knowledge Base**: Vector database integration (`/knowledge-base`) leveraging `pgvector` for indexing incident playbooks, security policies, and mitigation runbooks.
- [x] **AI SOC Assistant**: Conversational assistant (`/ai-assistant`) powered by Groq (Llama 3 / Mixtral) with local Ollama fallback, providing contextual triage, RAG retrieval, and remediation guidance.
- [x] **Case Management & Automated SOAR Actions**: End-to-end incident lifecycle tracking (`/cases`), timeline auditing, remote host containment actions, and AI-drafted incident executive reports (`/reports`).
- [x] **Enterprise Security**: JWT authentication with rotating refresh tokens, hashed OTP verification, Role-Based Access Control (RBAC), and immutable audit logs (`/audit-logs`).

---

## Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 TELEMETRY SOURCES                      │
                  │  • SentinelX Endpoint Agent (Host & Network)           │
                  │  • CSV Dataset Upload (CIC-IDS2017 / CSE-CIC-IDS2018)  │
                  │  • Replay Mode (Historical Replay)                     │
                  └───────────────────────────┬────────────────────────────┘
                                              │ POST /api/events/ingest
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │            FASTAPI INGESTION & REDIS STREAMS           │
                  │         Stream Buffer ("sentinelx:events")             │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Consumed by Background Worker
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │             DETECTION & CORRELATION WORKER             │
                  │  1. Sigma-Inspired Rule Engine                         │
                  │  2. Isolation Forest Anomaly Engine                    │
                  │  3. Graph Correlation & Incident Formation             │
                  │  4. Threat Intel Enrichment (AbuseIPDB, URLhaus, NVD)   │
                  │  5. Weighted Incident Risk Scoring                     │
                  └───────────────┬────────────────────────┬───────────────┘
                                  │ Write Raw & Alerts     │ State & Incidents
                                  ▼                        ▼
                       ┌────────────────────┐    ┌────────────────────┐
                       │   MongoDB Atlas    │    │    Neon Postgres   │
                       │ Events, Alerts,    │    │ Relational Schema, │
                       │ IOCs, Malware Logs │    │ Users, Incidents,  │
                       └────────────────────┘    │ Cases, pgvector    │
                                                 └─────────┬──────────┘
                                                           │
                                  ┌────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ANALYST SOC WORKSPACE                             │
│  • React Dashboard & Real-Time WebSocket Alerts (/ws/updates)                │
│  • Force-Directed Correlation Graph & MITRE ATT&CK Matrix                    │
│  • Malware Detonation Workbench & Threat Hunting Query Engine                │
│  • RAG Knowledge Base + Groq AI Assistant                                    │
│  • Remote SOAR Containment (Block IP, Terminate Process, Isolate Host)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Capabilities & Modules

### 1. Endpoint Agent & Active SOAR Containment (`agent/`)
- Lightweight Python service running as an endpoint collector or background Windows Service.
- Continuous network socket monitoring, remote IP extraction, and heartbeat telemetry.
- Secure command dispatch: The SOC analyst can issue immediate containment actions from the dashboard (`block_ip`, `unblock_ip`, `kill_process`, `isolate_host`) enforced by local agent execution and logged to backend audit trails.

### 2. Multi-Layer Threat Detection & Zero-Day Research (`ml/`)
- **Signature Detection**: High-performance Sigma rule matching supporting regex, field comparisons, and severity classifications.
- **Anomaly Scoring**: Unsupervised Isolation Forest for identifying statistically deviant network spikes and payload anomalies.
- **GraphSAGE Zero-Day Research**: Constructing k-NN similarity graphs over flow vectors to identify unclassified zero-day attack vectors using Graph Neural Networks, evaluated against traditional baselines (Random Forest, XGBoost, CNN, LSTM).

### 3. Graph Correlation & MITRE ATT&CK Framework
- Correlates isolated alerts across identical source/destination IPs and temporal proximity windows into structured incidents.
- Interactive force-directed correlation graph rendering nodes (Attacks, IPs, Targets, Rules) with pivot inspection.
- Enterprise MITRE ATT&CK Matrix mapping threats to tactics (Reconnaissance, Execution, Persistence, Privilege Escalation, Command & Control, Exfiltration).

### 4. Threat Intelligence & Malware Detonation
- Automated IOC lookup and threat reputation scoring using external feeds (AbuseIPDB, URLhaus, NVD).
- Built-in Malware Detonation Workbench: Compute file hashes (MD5, SHA-256), evaluate file entropy, simulate sandbox execution, extract suspicious behavior strings, and cross-reference known IOCs.

### 5. AI SOC Assistant & RAG Knowledge Base
- Grounded intelligence using Retrieval-Augmented Generation (RAG) over vector embeddings stored in PostgreSQL via `pgvector`.
- Ingest enterprise security documents, incident response runbooks, and SOPs.
- Dual-provider LLM support: Ultra-fast cloud inference with **Groq** (Llama 3 / Mixtral) with local **Ollama** fallback.

### 6. Case Management & Executive Reporting
- Comprehensive case tracking (severity, assigned analyst, status, audit trail).
- Automated generation of structured executive and technical incident reports with AI-curated summaries and timeline forensics.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Zustand |
| **Backend API** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy (asyncpg), Motor (MongoDB async), Structlog |
| **Worker & Messaging** | Python background worker, Redis Streams, Redis Pub/Sub, WebSockets |
| **Primary Relational DB** | PostgreSQL ([Neon](https://neon.tech)) with `pgvector` extension |
| **Document & Log DB** | MongoDB ([Atlas](https://www.mongodb.com/atlas)) |
| **Cache & Message Broker** | Redis ([Upstash](https://upstash.com) or local TCP Redis) |
| **Machine Learning** | PyTorch, PyTorch Geometric, scikit-learn, XGBoost, NetworkX, Pandas, NumPy |
| **LLM & Semantic Search** | Groq API, Ollama (fallback), `pgvector` cosine similarity embeddings |
| **Endpoint Agent** | Python, `psutil`, `httpx`, Windows Batch automation |

---

## Repository Structure

```
SentinelX/
├── agent/                      # SentinelX endpoint telemetry collector & SOAR executor
│   ├── collectors/             # Network connection and socket collectors
│   ├── transport/              # Backend HTTP/WebSocket communication client
│   ├── executor.py             # SOAR command executor (firewall blocking, process kill)
│   ├── main.py                 # Agent daemon entrypoint
│   ├── install_service.bat     # Windows background service installation script
│   └── run.bat                 # Quick-start script for Windows
├── backend/                    # FastAPI core backend service
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (auth, dashboard, events, agent, rules,
│   │   │                       #  hunting, malware, mitre, correlation, ai, cases, etc.)
│   │   ├── ai/                 # Groq & Ollama providers, RAG context builder, embeddings
│   │   ├── core/               # Security, JWT tokens, OTP hashing, configuration
│   │   ├── db/                 # Async PostgreSQL, MongoDB Motor, and Redis clients
│   │   ├── detection/          # Sigma rule engine & Isolation Forest anomaly engine
│   │   ├── intelligence/       # Threat intel providers (AbuseIPDB, URLhaus, NVD)
│   │   ├── models/             # SQLAlchemy ORM models (users, incidents, cases, etc.)
│   │   ├── repositories/       # Database access layer
│   │   ├── risk/               # Dynamic risk scoring engine
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic & external orchestrations
│   │   └── workers/            # event_worker.py — background Redis Stream consumer
│   ├── requirements.txt        # Python backend dependencies
│   └── .env.example            # Backend environment template
├── database/                   # Database schemas
│   └── postgres/
│       └── init.sql            # PostgreSQL schema, pgvector, RBAC seed, and detection rules
├── datasets/                   # Sample network attack datasets (e.g., CIC-IDS)
├── docs/                       # Architecture, database, ML research, and security docs
├── frontend/                   # Modern React + Vite SOC dashboard
│   ├── src/
│   │   ├── components/         # Reusable UI components, navigation, modals, force graph
│   │   ├── pages/              # Dashboard, SecurityOperations, ThreatHunting, MitreMatrix,
│   │   │                       #  MalwareAnalysis, KnowledgeBase, ZeroDayDetection, Cases, etc.
│   │   ├── services/           # Frontend API client modules
│   │   ├── store/              # Zustand state stores (auth, stream, UI)
│   │   └── App.tsx             # Route definitions and application layout
│   └── package.json            # Frontend dependencies
├── ml/                         # ML comparison & zero-day research pipelines
│   ├── cnn/                    # 1D Convolutional Neural Network detector
│   ├── lstm/                   # Long Short-Term Memory sequence model
│   ├── random_forest/          # Random Forest baseline
│   ├── xgboost/                # XGBoost baseline
│   ├── graphsage/              # GraphSAGE model & k-NN graph construction
│   └── preprocessing/          # Dataset cleaning and normalizers
├── scripts/                    # Development automation scripts
├── tests/                      # Pytest test suite
└── System Run Guide.txt        # Quick reference guide for local execution
```

---

## Getting Started

SentinelX is designed to run against cloud-managed database tiers (Neon, MongoDB Atlas, Upstash Redis), eliminating the need for complex local database container setups.

### 1. Prerequisites

- **Python**: 3.11+
- **Node.js**: 18+ and npm
- **Databases** (Free cloud tiers or local instances):
  - **PostgreSQL with `pgvector`**: [Neon](https://neon.tech)
  - **MongoDB**: [MongoDB Atlas](https://www.mongodb.com/atlas)
  - **Redis**: [Upstash](https://upstash.com) *(Use the standard TCP `rediss://...` connection string)*

### 2. Backend Configuration

Create your `.env` configuration in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database URIs, API keys, and secret token:
```ini
# Core Configuration
SECRET_KEY=<generate-with-python-secrets-token-hex-32>
ENVIRONMENT=development

# Cloud Databases
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<database>?ssl=require
MONGODB_URI=mongodb+srv://<user>:<password>@<host>/?retryWrites=true&w=majority
REDIS_URL=rediss://default:<password>@<host>:<port>

# Threat Intelligence & AI (Optional but recommended)
GROQ_API_KEY=<your_groq_api_key>
ABUSEIPDB_API_KEY=<your_abuseipdb_api_key>
URLHAUS_API_KEY=<your_urlhaus_api_key>
```

### 3. Database Schema Initialization (One-Time)

Execute the initialization script against your PostgreSQL instance to create tables, enable the `pgvector` extension, and seed the default RBAC roles and detection rules:

```bash
# Using psql:
psql "<your-postgres-psql-connection-string>" -f database/postgres/init.sql
```
*(Alternatively, copy and paste the contents of `database/postgres/init.sql` directly into the Neon SQL Editor in your web console).*

MongoDB and Redis collections are initialized automatically on first run.

---

## Running the Application

To run the complete SOC environment locally, open separate terminal windows for each component:

### Terminal 1: Backend API Server
```powershell
# Windows (PowerShell)
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000

# macOS / Linux
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### Terminal 2: Detection & Correlation Event Worker
```powershell
# Windows (PowerShell)
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.workers.event_worker

# macOS / Linux
cd backend
source .venv/bin/activate
python -m app.workers.event_worker
```
> **Note**: The event worker consumes the Redis Stream, executes the detection rules and anomaly engine, correlates alerts into incidents, updates risk scores, and emits live WebSocket notifications.

### Terminal 3: Frontend SOC Dashboard
```bash
cd frontend
npm install
npm run dev
```
- **Access the Dashboard**: [http://localhost:5173](http://localhost:5173)

### Terminal 4 (Optional): Live Endpoint Agent
```powershell
# Windows
cd agent
.\run.bat

# Or run directly:
python -m pip install -r requirements.txt
python main.py
```

---

## Authentication & Initial Access

1. Open [http://localhost:5173](http://localhost:5173) and navigate to **Register**.
2. Complete the registration form with your email and password.
3. SentinelX issues an expiring OTP code. In development mode, check your backend terminal console for the logged OTP code (issued by `notification_service`).
4. Enter the OTP code on the verification screen to activate your account and log in.
5. Once authenticated, the real-time WebSocket connection establishes automatically, streaming live telemetry and security alerts to the dashboard.

---

## Telemetry Ingestion Options

You can inject real security telemetry into the pipeline in multiple ways:

1. **Live Agent**: Run the SentinelX agent (`agent/main.py`) on your host machine to push live connection telemetry and receive real-time SOAR commands.
2. **CSV Dataset Upload**: Navigate to the **Floating Ingestion Controller** on the dashboard or use the REST API:
   ```bash
   curl -X POST http://localhost:8000/api/datasets/upload \
     -H "Authorization: Bearer <your_jwt_token>" \
     -F "file=@datasets/Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv"
   ```
3. **Direct Event Ingestion API**:
   ```bash
   curl -X POST http://localhost:8000/api/events/ingest \
     -H "Authorization: Bearer <your_jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{"mode": "LIVE", "events": [{"source_ip": "192.168.1.100", "destination_ip": "10.0.0.5", "destination_port": 4444, "protocol": "TCP"}]}'
   ```

---

## Running Automated Tests

Run the test suite to verify the rule engine, dataset pipelines, and schemas:

```bash
cd backend
python -m pytest ../tests/ -v
```

---

## Zero-Mock-Data Policy

SentinelX strictly follows a **Zero-Mock-Data Policy**:
- No synthetic random number generators (`Math.random()`), fabricated IPs, or simulated chart statistics are used to populate the UI.
- All numbers, charts, and metrics displayed across the dashboard reflect genuine records stored in PostgreSQL, MongoDB, or real-time Redis telemetry streams.
- Any features in progress explicitly state their implementation state rather than presenting dummy data.

---

## License

This project is developed as part of a BE Computer Engineering Major Project. All rights reserved.
