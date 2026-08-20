"""
Unit tests for the Sigma-inspired rule engine (backend/app/detection/rule_engine.py).
These use small in-memory event dicts constructed purely to exercise rule
logic — they are NOT shipped as a dataset and are never presented as real
telemetry anywhere in the product.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.detection.rule_engine import CompiledRule, evaluate, matches  # noqa: E402

MALICIOUS_PORT_RULE = CompiledRule(
    rule_id="TEST-001",
    name="Test malicious port rule",
    severity="high",
    mitre_technique="T1571",
    conditions={"any": [{"field": "destination_port", "operator": "in", "value": [4444, 31337]}]},
)

LARGE_TRANSFER_RULE = CompiledRule(
    rule_id="TEST-002",
    name="Test large transfer rule",
    severity="high",
    mitre_technique="T1041",
    conditions={"all": [{"field": "bytes_sent", "operator": "gte", "value": 50_000_000}]},
)

DNS_TLD_RULE = CompiledRule(
    rule_id="TEST-003",
    name="Test suspicious TLD rule",
    severity="low",
    mitre_technique=None,
    conditions={"any": [{"field": "dns_query", "operator": "endswith", "value": ".xyz"}]},
)


def test_malicious_port_match():
    event = {"source_ip": "10.0.0.5", "destination_port": 4444}
    assert matches(MALICIOUS_PORT_RULE, event) is True


def test_malicious_port_no_match():
    event = {"source_ip": "10.0.0.5", "destination_port": 443}
    assert matches(MALICIOUS_PORT_RULE, event) is False


def test_large_transfer_boundary():
    assert matches(LARGE_TRANSFER_RULE, {"bytes_sent": 50_000_000}) is True
    assert matches(LARGE_TRANSFER_RULE, {"bytes_sent": 49_999_999}) is False
    assert matches(LARGE_TRANSFER_RULE, {"bytes_sent": None}) is False


def test_dns_suspicious_tld():
    assert matches(DNS_TLD_RULE, {"dns_query": "malware-drop.xyz"}) is True
    assert matches(DNS_TLD_RULE, {"dns_query": "google.com"}) is False
    assert matches(DNS_TLD_RULE, {"dns_query": None}) is False


def test_evaluate_returns_all_matching_rules():
    event = {"destination_port": 31337, "bytes_sent": 60_000_000, "dns_query": "c2.xyz"}
    matched = evaluate([MALICIOUS_PORT_RULE, LARGE_TRANSFER_RULE, DNS_TLD_RULE], event)
    matched_ids = {r.rule_id for r in matched}
    assert matched_ids == {"TEST-001", "TEST-002", "TEST-003"}


def test_evaluate_returns_no_matches_for_benign_event():
    event = {"destination_port": 443, "bytes_sent": 1200, "dns_query": "example.com"}
    matched = evaluate([MALICIOUS_PORT_RULE, LARGE_TRANSFER_RULE, DNS_TLD_RULE], event)
    assert matched == []
