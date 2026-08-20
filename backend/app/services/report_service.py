"""
Incident report generation (spec §44). Every factual field (severity,
timeline, MITRE techniques, affected assets, risk score) comes directly from
Postgres/MongoDB. Groq is used only to draft the narrative executive-summary
prose around those facts — the system prompt explicitly forbids introducing
new facts, and the structured `facts` block is stored alongside the prose so
the underlying data is always auditable independently of what the LLM wrote.
"""
from datetime import datetime, timezone

from app.ai import soc_assistant_service
from app.ai.context_builder import build_incident_context

REPORT_SYSTEM_PROMPT = """You are drafting an executive summary for a cybersecurity incident \
report. Use ONLY the facts provided in the context. Do not invent additional detail. Write \
2-4 sentences, professional tone, suitable for a SOC report's executive summary section."""


async def generate_report(db, mongo_db, incident_id: str, investigation: dict) -> dict:
    facts = {
        "incident": investigation["incident"],
        "timeline": investigation["timeline"],
        "affected_assets": investigation["affected_assets"],
        "mitre_techniques": investigation["mitre_techniques"],
        "alert_count": len(investigation["alerts"]),
    }

    context = await build_incident_context(db, mongo_db, incident_id)
    try:
        result = await soc_assistant_service.ask(
            question="Draft the executive summary for this incident report.",
            context=context,
        )
        executive_summary = result["answer"]
        summary_provider = result["provider"]
    except soc_assistant_service.NoProviderAvailableError:
        executive_summary = (
            "AI drafting unavailable (no Groq/Ollama provider configured). "
            "See the structured facts below for the incident details."
        )
        summary_provider = None

    report = {
        "incident_id": incident_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "executive_summary": executive_summary,
        "executive_summary_provider": summary_provider,
        "facts": facts,
    }
    await mongo_db.reports.insert_one({**report})
    return report
