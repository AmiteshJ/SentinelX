# Mark 1: SentinelX Web App & Desktop Software Transition Plan

**Status:** Backlog / Idea on Hold  
**Reference Name:** Mark 1  
**Created:** October 26, 2026  

---

## 1. Executive Summary
The "Mark 1" initiative outlines the roadmap for evolving the SentinelX SOC platform from a local development environment into a production-grade **Cloud Web Application (SaaS SOC Platform)** coupled with a distributed **Native Desktop / Endpoint Agent Software (.exe / Daemon)**.

This aligns SentinelX directly with the deployment architecture of modern enterprise EDR/XDR platforms such as CrowdStrike Falcon, SentinelOne, and Wazuh.

---

## 2. Target Deployment Architecture

### Component A: Central Cloud Web Application (SOC Console)
- **Primary Audience:** Security Operations Center (SOC) Analysts, Incident Responders, and Administrators.
- **Access Model:** Web browser via custom domain (`https://sentinelx.app`) with HTTPS/TLS.
- **Stack & Infrastructure:**
  - **Frontend:** React + Vite single-page application built via `npm run build` and served via Vercel, Cloudflare Pages, or an NGINX reverse proxy.
  - **API & Ingestion:** FastAPI application containerized via Docker, deployed to cloud infrastructure (AWS EC2, DigitalOcean VPS, or Render/Railway).
  - **Telemetry Pipeline:** Redis Streams buffering high-frequency telemetry ingested from remote agents.
  - **Databases:** Cloud-hosted MongoDB Atlas (events & alerts) and Neon PostgreSQL (relational schema, auth, cases, playbooks with pgvector).

### Component B: Endpoint Agent Software (.exe / Background Daemon)
- **Primary Audience:** Endpoints and servers across enterprise networks requiring active monitoring and containment.
- **Packaging Strategy:**
  - Python agent (`agent/`) compiled into a single standalone Windows binary (`SentinelX-Agent.exe`) using **PyInstaller** or **Nuitka**.
  - Registered as a native **Windows Service** (or Linux `systemd` daemon) that launches silently at machine boot.
  - Optional GUI tray icon for local status/health indicators.
- **Responsibilities:**
  - Continuous telemetry harvesting (socket connections, process spawns, network flows).
  - Outbound telemetry transmission via authenticated REST API (`POST /api/events/ingest`).
  - Bidirectional polling for SOAR containment actions (e.g., local firewall IP blocking, process termination, isolation).

### Component C: Native Desktop SOC Dashboard (Optional)
- For analysts preferring a native desktop window over a browser tab.
- Built using **Tauri** (Rust + Webview) or **Electron** wrapping the React frontend into an installable desktop package (`.msi` / `.exe`).

---

## 3. Implementation Roadmap (When Reopened)

1. **Phase 1: Containerization & Environment Isolation**
   - Author `Dockerfile` and `docker-compose.yml` for backend API, event worker, and Redis.
   - Configure environment variables and production secrets management.

2. **Phase 2: Cloud Infrastructure & CI/CD**
   - Set up cloud server / VPS with NGINX reverse proxy and automated SSL certificates (Let's Encrypt / Certbot).
   - Configure GitHub Actions pipeline to automatically build and deploy frontend and backend upon merge.

3. **Phase 3: Agent Executable Compilation**
   - Create PyInstaller build spec for `agent/` with embedded SSL root certificates.
   - Package installer using Inno Setup or WiX for one-click installation on client machines.

4. **Phase 4: Agent Management & Multi-Tenancy**
   - Implement agent registration keys / enrollment tokens.
   - Add fleet health monitoring dashboard in the frontend.

---

*Note: This idea is cataloged for future implementation when the project is ready for production deployment.*
