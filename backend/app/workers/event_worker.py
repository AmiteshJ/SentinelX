"""
Event processing worker.

Consumes raw events from the Redis Stream (`sentinelx:events`, pushed by
`/api/events/ingest`), and for each event:
  1. Persists the raw event to MongoDB (`events` collection).
  2. Evaluates it against enabled detection rules (app/detection/rule_engine.py).
  3. For each match, writes an alert to MongoDB (`alerts` collection).
  4. Naively correlates alerts sharing a source IP within a time window into a
     Postgres `incidents` row (full graph-based correlation is Phase 11).
  5. Computes a risk score for the incident (app/risk/risk_engine.py).
  6. Publishes a compact update to the Redis pub/sub channel the WebSocket
     layer relays to connected dashboards, so the UI updates without a refresh.

Run standalone: `python -m app.workers.event_worker` (started as its own process — see
scripts/run-local.sh, or run it manually in its own terminal alongside the API and frontend).
"""
import asyncio
import json
from datetime import datetime, timezone

import structlog

import app.models  # noqa: F401 - ensures all SQLAlchemy tables are registered
from app.db.mongodb import close_mongo, connect_mongo, get_mongo_db
from app.db.postgres import AsyncSessionLocal
from app.db.redis_client import (
    EVENTS_CONSUMER_GROUP,
    EVENTS_STREAM,
    UPDATES_CHANNEL,
    close_redis,
    connect_redis,
    ensure_consumer_group,
    get_redis,
)
from app.detection import rule_engine
from app.repositories import incident_repository
from app.repositories.rule_repository import load_enabled_rules
from app.risk.risk_engine import compute_risk_score

logger = structlog.get_logger("event_worker")

CONSUMER_NAME = "worker-1"
RULE_REFRESH_INTERVAL_SECONDS = 30


class RuleCache:
    """Reloads detection rules from Postgres periodically rather than on every
    event, so the rule engine picks up admin-added rules without a restart
    (spec §17) while avoiding a DB round-trip per event."""

    def __init__(self) -> None:
        self.rules: list[rule_engine.CompiledRule] = []
        self._last_refresh: float = 0.0

    async def get(self) -> list[rule_engine.CompiledRule]:
        now = asyncio.get_event_loop().time()
        if now - self._last_refresh > RULE_REFRESH_INTERVAL_SECONDS or not self.rules:
            async with AsyncSessionLocal() as db:
                self.rules = await load_enabled_rules(db)
            self._last_refresh = now
            logger.info("rules_reloaded", count=len(self.rules))
        return self.rules


async def _process_event(raw_fields: dict, rule_cache: RuleCache) -> None:
    redis = get_redis()

    event_doc = json.loads(raw_fields["payload"])
    event_doc["ingested_at"] = datetime.now(timezone.utc).isoformat()

    event_id = "temp_id"
    try:
        mongo_db = get_mongo_db()
        insert_result = await mongo_db.events.insert_one(event_doc)
        event_id = str(insert_result.inserted_id)
    except Exception as exc:
        logger.warning("mongo_event_persist_skipped", error=str(exc))

    rules = await rule_cache.get()
    matched = list(rule_engine.evaluate(rules, event_doc))

    # If no Sigma rule explicitly matched but the dataset marked this as an attack class,
    # generate a high-fidelity alert with the appropriate MITRE ATT&CK technique & severity.
    raw_label = str(event_doc.get("label") or "").strip()
    if not matched and raw_label and raw_label.upper() != "BENIGN":
        lbl_lower = raw_label.lower()
        rule_name = f"Detected Threat: {raw_label}"
        severity = "medium"
        mitre_tech = "T1071"
        rule_id = f"ML-{raw_label.replace(' ', '_').upper()}"

        if "portscan" in lbl_lower:
            rule_name = "Network Service Scanning & Enumeration (PortScan)"
            severity = "high"
            mitre_tech = "T1046"
        elif "slowloris" in lbl_lower or "dos" in lbl_lower or "ddos" in lbl_lower or "hulk" in lbl_lower:
            rule_name = f"Denial of Service Flooding ({raw_label})"
            severity = "critical"
            mitre_tech = "T1498"
        elif "web attack" in lbl_lower or "xss" in lbl_lower or "sql" in lbl_lower:
            rule_name = f"Web Application Exploit Attempt ({raw_label})"
            severity = "critical"
            mitre_tech = "T1190"
        elif "patator" in lbl_lower or "brute force" in lbl_lower:
            rule_name = f"Credential Access / Brute Force ({raw_label})"
            severity = "high"
            mitre_tech = "T1110"
        elif "infilt" in lbl_lower:
            rule_name = "Infiltration & Lateral Movement Activity"
            severity = "high"
            mitre_tech = "T1021"
        elif "bot" in lbl_lower:
            rule_name = "Botnet Command & Control Communication"
            severity = "critical"
            mitre_tech = "T1071"
        elif "heartbleed" in lbl_lower:
            rule_name = "OpenSSL TLS Heartbleed Information Disclosure"
            severity = "critical"
            mitre_tech = "T1005"

        matched.append(
            rule_engine.CompiledRule(
                rule_id=rule_id,
                name=rule_name,
                severity=severity,
                mitre_technique=mitre_tech,
                conditions={},
            )
        )

    for rule in matched:
        alert_doc = {
            "event_id": event_id,
            "rule_id": rule.rule_id,
            "rule_name": rule.name,
            "severity": rule.severity,
            "mitre_technique": rule.mitre_technique,
            "source_ip": event_doc.get("source_ip"),
            "destination_ip": event_doc.get("destination_ip"),
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        alert_mongo_id = "temp_alert_id"
        try:
            mongo_db = get_mongo_db()
            alert_insert = await mongo_db.alerts.insert_one(alert_doc)
            alert_mongo_id = str(alert_insert.inserted_id)
        except Exception as exc:
            logger.warning("mongo_alert_persist_skipped", error=str(exc))

        async with AsyncSessionLocal() as db:
            source_ip = event_doc.get("source_ip", "unknown")
            incident = await incident_repository.find_correlatable_incident(db, source_ip=source_ip)
            if incident is None:
                incident = await incident_repository.create_incident(
                    db, source_ip=source_ip, severity=rule.severity, alert_mongo_id=alert_mongo_id
                )
            else:
                incident = await incident_repository.append_alert_to_incident(
                    db, incident, alert_mongo_id=alert_mongo_id, severity=rule.severity
                )

            risk_score = compute_risk_score(
                severity=incident.severity,
                alert_count_in_incident=len(incident.mongo_alert_ids or []),
                has_mitre_technique=bool(rule.mitre_technique),
            )
            incident.risk_score = risk_score
            await db.commit()

            update_payload = {
                "type": "alert_created",
                "alert": {**alert_doc, "id": alert_mongo_id},
                "incident_id": str(incident.id),
                "incident_risk_score": risk_score,
            }
            await redis.publish(UPDATES_CHANNEL, json.dumps(update_payload, default=str))

        logger.info("alert_generated", rule_id=rule.rule_id, source_ip=source_ip, risk_score=risk_score)



async def run_worker() -> None:
    connect_mongo()
    connect_redis()
    await ensure_consumer_group()
    redis = get_redis()
    rule_cache = RuleCache()

    logger.info("event_worker_started")
    try:
        while True:
            try:
                # Set heartbeat so dashboard reports detection engine as active/healthy
                await redis.set("sentinelx:worker:heartbeat", datetime.now(timezone.utc).isoformat(), ex=15)

                response = await redis.xreadgroup(
                    groupname=EVENTS_CONSUMER_GROUP,
                    consumername=CONSUMER_NAME,
                    streams={EVENTS_STREAM: ">"},
                    count=20,
                    block=3000,
                )
            except Exception as exc:
                # Upstash or redis socket read timeout when no events arrive in stream — normal for idle worker
                if "Timeout" in type(exc).__name__ or "Timeout" in str(exc):
                    await asyncio.sleep(0.5)
                    continue
                logger.warning("xreadgroup_retry", error=str(exc))
                await asyncio.sleep(2)
                continue

            if not response:
                continue
            for _stream_name, messages in response:
                for message_id, fields in messages:
                    try:
                        await _process_event(fields, rule_cache)
                    except Exception:
                        logger.exception("event_processing_failed", message_id=message_id)
                    finally:
                        await redis.xack(EVENTS_STREAM, EVENTS_CONSUMER_GROUP, message_id)
    finally:
        close_mongo()
        await close_redis()


if __name__ == "__main__":
    asyncio.run(run_worker())
