"""
Context selection for the AI SOC Assistant (spec §21-23). Never sends raw
event floods to the LLM — pulls only the correlated incident, its alerts, and
top-k relevant knowledge chunks, and renders them into a compact, factual
context block. The system prompt explicitly instructs the model not to
invent facts beyond what's provided (spec §25, §44).
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.detection import Incident
from app.services.knowledge_service import semantic_search

SYSTEM_PROMPT = """You are the SentinelX AI SOC Assistant, embedded in a security operations \
platform. You help analysts understand incidents, alerts, and threats.

Rules you must follow:
- Only use the facts given to you in the CONTEXT section below. Do not invent IPs, \
  timestamps, users, hosts, or outcomes that are not present in the context.
- If the context does not contain enough information to answer, say so explicitly \
  rather than guessing.
- You are a decision-support tool. Recommend actions (e.g. "recommend isolating host X \
  for investigation") — never claim to have executed an action yourself.
- Be concise and analyst-facing: lead with the answer, then supporting detail.
"""


async def build_incident_context(db: AsyncSession, mongo_db, incident_id: str) -> str:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if incident is None:
        return "No incident found with this ID."

    alert_ids = incident.mongo_alert_ids or []
    alerts = []
    if alert_ids:
        from bson import ObjectId
        cursor = mongo_db.alerts.find({"_id": {"$in": [ObjectId(a) for a in alert_ids]}})
        async for doc in cursor:
            alerts.append(doc)

    lines = [
        f"INCIDENT: {incident.title}",
        f"Severity: {incident.severity} | Status: {incident.status} | Risk score: {incident.risk_score}",
        f"Alert count: {len(alerts)}",
        "",
        "ALERTS:",
    ]
    for a in alerts:
        lines.append(
            f"- [{a.get('severity')}] {a.get('rule_name')} (MITRE {a.get('mitre_technique') or 'n/a'}) "
            f"source={a.get('source_ip')} dest={a.get('destination_ip')} at {a.get('created_at')}"
        )

    return "\n".join(lines)


async def build_knowledge_context(db: AsyncSession, question: str, *, top_k: int = 3) -> str:
    try:
        chunks = await semantic_search(db, question, top_k=top_k)
    except Exception:
        return ""  # pgvector/knowledge base not yet populated — degrade gracefully, don't fail the request
    if not chunks:
        return ""
    lines = ["RELEVANT KNOWLEDGE:"]
    for c in chunks:
        lines.append(f"- ({c['source']} — {c['document_title']}): {c['content'][:300]}")
    return "\n".join(lines)
