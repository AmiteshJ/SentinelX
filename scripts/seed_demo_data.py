"""
SentinelX Example / Demo Data Generator & Ingestion Script.

This script feeds realistic synthetic security events into SentinelX.
Events flow through:
  Redis Stream -> Event Worker -> Mongo Events & Alerts -> Postgres Incidents -> Redis PubSub -> WebSocket -> Frontend Dashboard!

Usage:
  # From project root:
  python scripts/seed_demo_data.py

  # For continuous streaming traffic (simulates active SOC monitoring):
  python scripts/seed_demo_data.py --stream

  # To clear previous demo alerts and incidents:
  python scripts/seed_demo_data.py --clear
"""

import argparse
import asyncio
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
import os
BASE_DIR = Path(__file__).resolve().parents[1]
backend_dir = BASE_DIR / "backend"
os.chdir(backend_dir)
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.db.mongodb import close_mongo, connect_mongo, get_mongo_db
from app.db.postgres import AsyncSessionLocal, engine
from app.db.redis_client import (
    EVENTS_STREAM,
    MODE_KEY,
    close_redis,
    connect_redis,
    get_redis,
)
from app.models.user import User, Role, OtpCode, Session  # noqa: F401
from app.models.case import Case  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.detection import DetectionRule, Incident  # noqa: F401
from sqlalchemy import delete, select

# Realistic IP addresses
ATTACKER_IPS = [
    "185.220.101.5",
    "194.26.29.112",
    "45.154.255.89",
    "103.145.13.20",
    "89.248.165.74",
]

INTERNAL_IPS = [
    "10.0.1.15",
    "10.0.2.44",
    "10.0.3.102",
    "192.168.1.105",
    "172.16.0.50",
]

SAMPLE_SCENARIOS = [
    # 1. Critical Severity: Cobalt Strike / Known C2 Beacon
    {
        "source_ip": "185.220.101.5",
        "destination_ip": "10.0.1.15",
        "destination_port": 4444,
        "protocol": "TCP",
        "duration_ms": 1240.5,
        "bytes_sent": 85000000,
        "bytes_received": 14200,
        "dns_query": "c2-beacon-sync.xyz",
        "label": "C2_EXFILTRATION",
        "mode": "LIVE",
    },
    # 2. Critical / High: Ransomware Key Exchange & Data Staging
    {
        "source_ip": "194.26.29.112",
        "destination_ip": "10.0.2.44",
        "destination_port": 31337,
        "protocol": "TCP",
        "duration_ms": 320.0,
        "bytes_sent": 62000000,
        "bytes_received": 5400,
        "dns_query": "dark-vault-exfil.top",
        "label": "RANSOMWARE_STAGING",
        "mode": "LIVE",
    },
    # 3. High Severity: Metasploit Reverse Shell session
    {
        "source_ip": "45.154.255.89",
        "destination_ip": "10.0.3.102",
        "destination_port": 12345,
        "protocol": "TCP",
        "duration_ms": 4500.0,
        "bytes_sent": 45000,
        "bytes_received": 120000,
        "dns_query": None,
        "label": "REVERSE_SHELL",
        "mode": "LIVE",
    },
    # 4. Medium Severity: RDP / SSH Brute Force Exploration
    {
        "source_ip": "103.145.13.20",
        "destination_ip": "192.168.1.105",
        "destination_port": 3389,
        "protocol": "TCP",
        "duration_ms": 150.0,
        "bytes_sent": 2400,
        "bytes_received": 1800,
        "dns_query": None,
        "label": "RDP_BRUTE_FORCE",
        "mode": "LIVE",
    },
    # 5. Medium Severity: SSH Port probing
    {
        "source_ip": "89.248.165.74",
        "destination_ip": "172.16.0.50",
        "destination_port": 22,
        "protocol": "TCP",
        "duration_ms": 90.0,
        "bytes_sent": 1200,
        "bytes_received": 800,
        "dns_query": None,
        "label": "SSH_SCAN",
        "mode": "LIVE",
    },
    # 6. Low Severity: Suspicious Domain Lookup
    {
        "source_ip": "10.0.1.15",
        "destination_ip": "8.8.8.8",
        "destination_port": 53,
        "protocol": "UDP",
        "duration_ms": 15.0,
        "bytes_sent": 120,
        "bytes_received": 250,
        "dns_query": "update-check-service.xyz",
        "label": "SUSPICIOUS_DNS",
        "mode": "LIVE",
    },
    # 7. Low Severity: Suspicious TLD Lookup
    {
        "source_ip": "10.0.2.44",
        "destination_ip": "1.1.1.1",
        "destination_port": 53,
        "protocol": "UDP",
        "duration_ms": 12.0,
        "bytes_sent": 95,
        "bytes_received": 180,
        "dns_query": "telemetry-gate.top",
        "label": "SUSPICIOUS_DNS",
        "mode": "LIVE",
    },
    # 8. Benign normal web traffic
    {
        "source_ip": "10.0.1.15",
        "destination_ip": "142.250.190.46",
        "destination_port": 443,
        "protocol": "TCP",
        "duration_ms": 45.0,
        "bytes_sent": 3200,
        "bytes_received": 28400,
        "dns_query": "www.google.com",
        "label": "BENIGN",
        "mode": "LIVE",
    },
]

ADDITIONAL_RULES = [
    {
        "rule_id": "SIGMA-005",
        "name": "Cobalt Strike / C2 Beaconing Activity",
        "description": "Flags connections matching known C2 beaconing signatures or high-risk reverse payload communication.",
        "severity": "critical",
        "mitre_technique": "T1071",
        "conditions": {
            "any": [
                {"field": "destination_port", "operator": "in", "value": [4444, 8443, 8088]},
                {"field": "dns_query", "operator": "endswith", "value": ".xyz"}
            ]
        },
        "tags": ["c2", "cobalt-strike", "critical-threat"],
        "enabled": True,
    }
]


async def ensure_rules():
    """Ensure baseline and critical detection rules exist in PostgreSQL."""
    async with AsyncSessionLocal() as session:
        for rule_data in ADDITIONAL_RULES:
            stmt = select(DetectionRule).where(DetectionRule.rule_id == rule_data["rule_id"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                rule = DetectionRule(
                    rule_id=rule_data["rule_id"],
                    name=rule_data["name"],
                    description=rule_data["description"],
                    severity=rule_data["severity"],
                    mitre_technique=rule_data["mitre_technique"],
                    conditions=rule_data["conditions"],
                    tags=rule_data["tags"],
                    enabled=rule_data["enabled"],
                )
                session.add(rule)
                await session.commit()
                print(f"[+] Added rule: {rule_data['rule_id']} ({rule_data['name']}) [Severity: {rule_data['severity'].upper()}]")


async def clear_data():
    """Clear past alerts, incidents, and events to reset dashboard state."""
    print("[-] Clearing past demo data...")
    connect_mongo()
    mongo_db = get_mongo_db()
    await mongo_db.events.delete_many({})
    await mongo_db.alerts.delete_many({})
    
    from app.models.detection import Incident
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Incident))
        await session.commit()
    
    redis = get_redis()
    await redis.set(MODE_KEY, "LIVE")
    print("[OK] Cleared Mongo events & alerts, and Postgres incidents.")


async def emit_event(event_dict: dict, mode: str = "LIVE"):
    redis = get_redis()
    event_dict["mode"] = mode
    event_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    await redis.xadd(EVENTS_STREAM, {"payload": json.dumps(event_dict)})
    await redis.set(MODE_KEY, mode)


async def seed_batch():
    """Send a curated batch of security events to populate all dashboard cards."""
    await ensure_rules()
    print("[*] Ingesting demo security events into SentinelX...")

    redis = get_redis()
    await redis.set(MODE_KEY, "LIVE")

    for i, event in enumerate(SAMPLE_SCENARIOS, 1):
        await emit_event(event, mode="LIVE")
        print(f"  -> [{i}/{len(SAMPLE_SCENARIOS)}] Ingested event from {event['source_ip']} ({event.get('label', 'EVENT')})")
        # Brief pause between events so WebSocket updates pulse naturally
        await asyncio.sleep(0.4)

    print("\n[OK] Batch successfully ingested!")
    print("[i] The SentinelX event worker will evaluate detection rules, create incidents, and stream live updates to your Dashboard via WebSockets.")


async def stream_continuously(interval: float = 3.0):
    """Continuously stream randomized security events to keep dashboard animated and live."""
    await ensure_rules()
    print(f"[*] Starting continuous live telemetry stream (Interval: {interval}s). Press Ctrl+C to stop.\n")
    redis = get_redis()
    await redis.set(MODE_KEY, "LIVE")

    count = 0
    try:
        while True:
            scenario = random.choice(SAMPLE_SCENARIOS).copy()
            # Randomize IP variation slightly
            if random.random() > 0.5:
                scenario["source_ip"] = random.choice(ATTACKER_IPS)
            if random.random() > 0.5:
                scenario["destination_ip"] = random.choice(INTERNAL_IPS)
            
            await emit_event(scenario, mode="LIVE")
            count += 1
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Ingested #{count}: {scenario['source_ip']} -> {scenario.get('label', 'EVENT')}")
            await asyncio.sleep(interval)
    except (asyncio.CancelledError, KeyboardInterrupt):
        print("\n[*] Stopped telemetry streaming.")


async def main():
    parser = argparse.ArgumentParser(description="SentinelX Demo Data Generator")
    parser.add_argument("--clear", action="store_true", help="Clear past alerts and incidents")
    parser.add_argument("--stream", action="store_true", help="Stream live events continuously")
    parser.add_argument("--interval", type=float, default=2.5, help="Interval for streaming mode (seconds)")
    args = parser.parse_args()

    connect_mongo()
    connect_redis()

    try:
        if args.clear:
            await clear_data()
        elif args.stream:
            await stream_continuously(interval=args.interval)
        else:
            await seed_batch()
    finally:
        close_mongo()
        await close_redis()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
