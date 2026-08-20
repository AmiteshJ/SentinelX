from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.detection.rule_engine import CompiledRule
from app.models.detection import DetectionRule


async def load_enabled_rules(db: AsyncSession) -> list[CompiledRule]:
    result = await db.execute(select(DetectionRule).where(DetectionRule.enabled.is_(True)))
    rows = result.scalars().all()
    return [
        CompiledRule(
            rule_id=r.rule_id,
            name=r.name,
            severity=r.severity,
            mitre_technique=r.mitre_technique,
            conditions=r.conditions,
        )
        for r in rows
    ]
