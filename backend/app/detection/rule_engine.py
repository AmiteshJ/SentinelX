"""
Sigma-inspired rule-based detection engine.

Rules are stored in Postgres (`detection_rules` table, seeded in
database/postgres/init.sql) as: rule_id, name, severity, mitre_technique,
conditions (JSONB), tags, enabled. This module does NOT claim official Sigma
format compatibility — it borrows the "field / operator / value" idea for
portability and readability, matching spec §9.

Condition shape (JSONB `conditions` column):
    {"all": [ {"field": "destination_port", "operator": "in", "value": [4444, 31337]} ]}
  or with OR semantics:
    {"any": [ {...}, {...} ]}
"""
from dataclasses import dataclass
from typing import Any

_OPERATORS = {
    "eq": lambda field_val, value: field_val == value,
    "neq": lambda field_val, value: field_val != value,
    "in": lambda field_val, value: field_val in value,
    "not_in": lambda field_val, value: field_val not in value,
    "gt": lambda field_val, value: field_val is not None and field_val > value,
    "gte": lambda field_val, value: field_val is not None and field_val >= value,
    "lt": lambda field_val, value: field_val is not None and field_val < value,
    "lte": lambda field_val, value: field_val is not None and field_val <= value,
    "contains": lambda field_val, value: isinstance(field_val, str) and value.lower() in field_val.lower(),
    "endswith": lambda field_val, value: isinstance(field_val, str) and field_val.lower().endswith(value.lower()),
}


@dataclass
class CompiledRule:
    rule_id: str
    name: str
    severity: str
    mitre_technique: str | None
    conditions: dict[str, Any]


def _resolve_field(event: dict[str, Any], field: str) -> Any:
    """Supports dotted access into event['raw'] for source-specific fields,
    e.g. field='raw.flow_duration'."""
    if field.startswith("raw."):
        return event.get("raw", {}).get(field[len("raw."):])
    return event.get(field)


def _eval_condition(event: dict[str, Any], condition: dict[str, Any]) -> bool:
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")
    if field is None or operator not in _OPERATORS:
        return False
    field_val = _resolve_field(event, field)
    try:
        return _OPERATORS[operator](field_val, value)
    except TypeError:
        return False


def matches(rule: CompiledRule, event: dict[str, Any]) -> bool:
    conditions = rule.conditions or {}
    if "all" in conditions:
        return all(_eval_condition(event, c) for c in conditions["all"])
    if "any" in conditions:
        return any(_eval_condition(event, c) for c in conditions["any"])
    return False


def evaluate(rules: list[CompiledRule], event: dict[str, Any]) -> list[CompiledRule]:
    """Returns every enabled rule that matches this event. Callers are
    responsible for filtering to enabled=true before passing rules in."""
    return [rule for rule in rules if matches(rule, event)]
