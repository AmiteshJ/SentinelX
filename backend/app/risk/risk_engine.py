"""
Weighted risk-scoring engine (spec §14).

Risk = weighted sum of documented factors, normalized to 0-100:
  - severity_score       : from the matched rule's severity
  - correlation_strength : how many alerts are already grouped into the incident
  - ioc_reputation        : placeholder 0 until Phase 8-9 threat-intel enrichment
                             is implemented (never fabricated — see docs)
  - mitre_relevance       : 1.0 if the rule maps to a MITRE technique, else 0.5

Weights are named constants (not magic numbers) so they can be tuned/config-driven later.
"""

SEVERITY_SCORE = {"low": 20, "medium": 45, "high": 70, "critical": 90}

WEIGHT_SEVERITY = 0.55
WEIGHT_CORRELATION = 0.25
WEIGHT_IOC_REPUTATION = 0.10
WEIGHT_MITRE_RELEVANCE = 0.10

CATEGORY_THRESHOLDS = (
    (80, "critical"),
    (60, "high"),
    (30, "medium"),
    (0, "low"),
)


def categorize(score: float) -> str:
    for threshold, label in CATEGORY_THRESHOLDS:
        if score >= threshold:
            return label
    return "low"


def compute_risk_score(
    *,
    severity: str,
    alert_count_in_incident: int,
    ioc_reputation_score: float = 0.0,  # 0-100, only non-zero once real TI enrichment exists
    has_mitre_technique: bool = False,
) -> float:
    severity_component = SEVERITY_SCORE.get(severity, 20)
    # Diminishing-but-increasing contribution from correlation strength, capped at 100.
    correlation_component = min(100, alert_count_in_incident * 15)
    mitre_component = 100 if has_mitre_technique else 50

    score = (
        WEIGHT_SEVERITY * severity_component
        + WEIGHT_CORRELATION * correlation_component
        + WEIGHT_IOC_REPUTATION * ioc_reputation_score
        + WEIGHT_MITRE_RELEVANCE * mitre_component
    )
    return round(min(100.0, max(0.0, score)), 2)
