"""
SentinelX backend entrypoint.

Phase 1-2 scope: architecture, auth/OTP/RBAC, database connectivity, and a
real (non-fabricated) dashboard health/overview endpoint. Detection,
threat intel, ML, and AI routers are added incrementally in later phases —
see docs/architecture.md for the full roadmap and app/api/v1/ for routers
that exist today.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    ai_assistant,
    alerts,
    audit,
    auth,
    cases,
    dashboard,
    datasets,
    detection,
    events,
    experiments,
    investigation,
    monitoring,
    reports,
    threat_intelligence,
    ws,
)
from app.core.config import get_settings
from app.db.mongodb import close_mongo, connect_mongo
from app.db.redis_client import close_redis, connect_redis

logger = structlog.get_logger("sentinelx")
settings = get_settings()

app = FastAPI(
    title="SentinelX API",
    description="AI-Assisted SOC for Advanced Threat Detection and Intelligent Incident Investigation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    connect_mongo()
    connect_redis()
    logger.info("sentinelx_backend_started", environment=settings.environment)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    close_mongo()
    await close_redis()
    logger.info("sentinelx_backend_stopped")


@app.get("/health")
async def health():
    return {"status": "ok"}


# Routers implemented in this phase
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(events.router)
app.include_router(monitoring.router)
app.include_router(alerts.router)
app.include_router(datasets.router)
app.include_router(ws.router)
app.include_router(threat_intelligence.router)
app.include_router(detection.router)
app.include_router(experiments.router)
app.include_router(ai_assistant.router)
app.include_router(cases.router)
app.include_router(investigation.router)
app.include_router(reports.router)

# Not yet implemented: /api/rules (CRUD for detection_rules — currently seed-only),
# /api/mitre, /api/vulnerabilities (NVD/CVE browsing UI beyond raw enrichment).
