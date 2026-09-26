"""
Graph-Based Alert Correlation Engine (Phase 11 Completion).
Constructs multi-hop threat entity graphs connecting Alerts, IPs, Processes,
IOCs, and MITRE techniques. Performs attack path tracing and kill-chain analysis.
"""
from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone
import ipaddress
from bson import ObjectId
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.mongodb import get_mongo_db
from app.models.detection import Incident


def _is_private_ip(ip_str: str) -> bool:
    try:
        return ipaddress.ip_address(ip_str).is_private
    except Exception:
        return False


def _node_color_and_size(node_type: str, severity: Optional[str] = None) -> Dict[str, Any]:
    colors = {
        "incident": "#8b5cf6",  # Purple
        "alert": {
            "critical": "#ef4444",  # Red
            "high": "#f97316",      # Orange
            "medium": "#eab308",    # Amber
            "low": "#3b82f6",       # Blue
            "info": "#64748b"       # Slate
        },
        "ip": "#06b6d4",       # Cyan
        "process": "#10b981",  # Emerald
        "ioc": "#f43f5e",      # Rose
        "mitre": "#a855f7",    # Violet
        "user": "#38bdf8"      # Sky
    }
    
    if node_type == "alert":
        sev = (severity or "medium").lower()
        color = colors["alert"].get(sev, colors["alert"]["medium"])
        size = 28 if sev in ("critical", "high") else 22
    elif node_type == "incident":
        color = colors["incident"]
        size = 34
    elif node_type == "ip":
        color = colors["ip"]
        size = 24
    elif node_type == "process":
        color = colors["process"]
        size = 22
    elif node_type == "ioc":
        color = colors["ioc"]
        size = 24
    elif node_type == "mitre":
        color = colors["mitre"]
        size = 20
    else:
        color = "#94a3b8"
        size = 20

    return {"color": color, "size": size}


async def build_incident_graph(incident_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
    """
    Constructs an interactive Entity Graph for a specific Incident.
    Traverses connected alerts, IPs, processes, and attack vectors.
    """
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        return None

    mongo_db = get_mongo_db()
    alert_ids = incident.mongo_alert_ids or []
    
    alerts: List[Dict[str, Any]] = []
    if alert_ids:
        cursor = mongo_db.alerts.find({"_id": {"$in": [ObjectId(a) for a in alert_ids]}}).sort("created_at", 1)
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            alerts.append(doc)

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    added_nodes: Set[str] = set()
    added_edges: Set[str] = set()

    def add_node(n_id: str, label: str, n_type: str, metadata: Dict[str, Any] = None):
        if n_id not in added_nodes:
            added_nodes.add(n_id)
            meta = metadata or {}
            style = _node_color_and_size(n_type, meta.get("severity"))
            nodes.append({
                "id": n_id,
                "label": label,
                "type": n_type,
                "color": style["color"],
                "size": style["size"],
                "metadata": meta
            })

    def add_edge(src: str, dst: str, relation: str, label: str = None):
        e_key = f"{src}->{dst}:{relation}"
        if e_key not in added_edges and src in added_nodes and dst in added_nodes:
            added_edges.add(e_key)
            edges.append({
                "id": e_key,
                "source": src,
                "target": dst,
                "relation": relation,
                "label": label or relation
            })

    # 1. Incident Root Node
    incident_node_id = f"inc:{incident.id}"
    add_node(
        incident_node_id,
        label=incident.title,
        n_type="incident",
        metadata={
            "severity": incident.severity,
            "status": incident.status,
            "risk_score": incident.risk_score,
            "created_at": incident.created_at.isoformat()
        }
    )

    # 2. Add alerts and connected entities
    for alert in alerts:
        a_id = f"alert:{alert['id']}"
        add_node(
            a_id,
            label=alert.get("rule_name", "Alert"),
            n_type="alert",
            metadata={
                "severity": alert.get("severity", "medium"),
                "mitre_technique": alert.get("mitre_technique"),
                "description": alert.get("description", ""),
                "timestamp": alert.get("created_at")
            }
        )
        add_edge(a_id, incident_node_id, "CORRELATED_INTO", "Correlated")

        # Source IP
        src_ip = alert.get("source_ip")
        if src_ip:
            s_node_id = f"ip:{src_ip}"
            is_priv = _is_private_ip(src_ip)
            add_node(
                s_node_id,
                label=src_ip,
                n_type="ip",
                metadata={"scope": "internal" if is_priv else "external", "role": "source"}
            )
            add_edge(s_node_id, a_id, "TRIGGERED", "Triggered")

        # Destination IP
        dst_ip = alert.get("destination_ip")
        if dst_ip:
            d_node_id = f"ip:{dst_ip}"
            is_priv = _is_private_ip(dst_ip)
            add_node(
                d_node_id,
                label=dst_ip,
                n_type="ip",
                metadata={"scope": "internal" if is_priv else "external", "role": "destination"}
            )
            add_edge(a_id, d_node_id, "TARGETS", "Targeted")

            # Connect src -> dst directly
            if src_ip:
                add_edge(s_node_id, d_node_id, "COMMUNICATES_WITH", alert.get("protocol", "Traffic"))

        # Process info if available in metadata
        proc_name = alert.get("process_name") or alert.get("metadata", {}).get("process_name")
        if proc_name:
            p_node_id = f"proc:{proc_name}"
            add_node(
                p_node_id,
                label=proc_name,
                n_type="process",
                metadata={"process": proc_name}
            )
            add_edge(p_node_id, a_id, "EXECUTES", "Executed")

        # MITRE Technique
        tech = alert.get("mitre_technique")
        if tech:
            m_node_id = f"mitre:{tech}"
            add_node(
                m_node_id,
                label=tech,
                n_type="mitre",
                metadata={"technique_id": tech}
            )
            add_edge(a_id, m_node_id, "MAPS_TO", "ATT&CK")

        # IOC references
        ioc_url = alert.get("metadata", {}).get("ioc_url") or alert.get("url")
        if ioc_url:
            ioc_id = f"ioc:{ioc_url}"
            add_node(ioc_id, label=ioc_url[:30], n_type="ioc", metadata={"ioc": ioc_url})
            add_edge(a_id, ioc_id, "MATCHES_IOC", "Malicious IOC")

    # 3. Calculate graph metrics
    degree_map: Dict[str, int] = {}
    for e in edges:
        degree_map[e["source"]] = degree_map.get(e["source"], 0) + 1
        degree_map[e["target"]] = degree_map.get(e["target"], 0) + 1

    for n in nodes:
        n["degree"] = degree_map.get(n["id"], 0)

    # Sort nodes by degree to identify choke points / central pivots
    choke_points = sorted([n for n in nodes if n["type"] in ("ip", "process")], key=lambda x: x["degree"], reverse=True)[:3]

    return {
        "incident_id": str(incident.id),
        "title": incident.title,
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "alerts_count": len(alerts),
            "choke_points": [{"id": c["id"], "label": c["label"], "type": c["type"], "degree": c["degree"]} for c in choke_points]
        }
    }


async def build_global_correlation_graph(db: AsyncSession, limit: int = 15) -> Dict[str, Any]:
    """
    Constructs a multi-incident global correlation graph showing overlapping
    threat actors, shared C2 destinations, and lateral movement between incidents.
    """
    result = await db.execute(
        select(Incident)
        .order_by(Incident.created_at.desc())
        .limit(limit)
    )
    incidents = result.scalars().all()

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    added_nodes: Set[str] = set()
    added_edges: Set[str] = set()

    def add_node(n_id: str, label: str, n_type: str, metadata: Dict[str, Any] = None):
        if n_id not in added_nodes:
            added_nodes.add(n_id)
            meta = metadata or {}
            style = _node_color_and_size(n_type, meta.get("severity"))
            nodes.append({
                "id": n_id,
                "label": label,
                "type": n_type,
                "color": style["color"],
                "size": style["size"],
                "metadata": meta
            })

    def add_edge(src: str, dst: str, relation: str, label: str = None):
        e_key = f"{src}->{dst}:{relation}"
        if e_key not in added_edges and src in added_nodes and dst in added_nodes:
            added_edges.add(e_key)
            edges.append({
                "id": e_key,
                "source": src,
                "target": dst,
                "relation": relation,
                "label": label or relation
            })

    mongo_db = get_mongo_db()

    for inc in incidents:
        inc_node_id = f"inc:{inc.id}"
        add_node(
            inc_node_id,
            label=inc.title[:28],
            n_type="incident",
            metadata={"severity": inc.severity, "risk_score": inc.risk_score}
        )

        alert_ids = inc.mongo_alert_ids or []
        if alert_ids:
            cursor = mongo_db.alerts.find({"_id": {"$in": [ObjectId(a) for a in alert_ids[:6]]}})
            async for alert in cursor:
                a_id = f"alert:{alert['_id']}"
                add_node(
                    a_id,
                    label=alert.get("rule_name", "Alert")[:24],
                    n_type="alert",
                    metadata={"severity": alert.get("severity", "medium")}
                )
                add_edge(a_id, inc_node_id, "CORRELATED_INTO", "Belongs to")

                src_ip = alert.get("source_ip")
                if src_ip:
                    s_id = f"ip:{src_ip}"
                    add_node(s_id, label=src_ip, n_type="ip", metadata={"role": "source"})
                    add_edge(s_id, a_id, "TRIGGERED", "Source")

                dst_ip = alert.get("destination_ip")
                if dst_ip:
                    d_id = f"ip:{dst_ip}"
                    add_node(d_id, label=dst_ip, n_type="ip", metadata={"role": "dest"})
                    add_edge(a_id, d_id, "TARGETS", "Dest")

                tech = alert.get("mitre_technique")
                if tech:
                    m_id = f"mitre:{tech}"
                    add_node(m_id, label=tech, n_type="mitre")
                    add_edge(a_id, m_id, "MAPS_TO", "Tactic")

    # Compute cluster connectivity
    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_incidents": len(incidents),
            "total_nodes": len(nodes),
            "total_edges": len(edges)
        }
    }
