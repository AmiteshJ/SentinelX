"""
MITRE ATT&CK Matrix Service for SentinelX.
Provides comprehensive enterprise tactics & techniques mapping, real-time
coverage calculation across active Sigma detection rules, and live alert correlation.
"""
from typing import Dict, List, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.detection import DetectionRule
from app.db.mongodb import get_mongo_db

# 12 Core MITRE ATT&CK Enterprise Tactics
MITRE_TACTICS = [
    {"id": "TA0001", "name": "Initial Access", "short": "initial-access", "order": 1, "description": "Techniques that use various entry vectors to gain an initial foothold."},
    {"id": "TA0002", "name": "Execution", "short": "execution", "order": 2, "description": "Techniques that result in adversary-controlled code running on a local or remote system."},
    {"id": "TA0003", "name": "Persistence", "short": "persistence", "order": 3, "description": "Techniques that adversaries use to keep access to systems across restarts or changed credentials."},
    {"id": "TA0004", "name": "Privilege Escalation", "short": "privilege-escalation", "order": 4, "description": "Techniques that adversaries use to gain higher-level permissions on a system or network."},
    {"id": "TA0005", "name": "Defense Evasion", "short": "defense-evasion", "order": 5, "description": "Techniques that adversaries use to avoid detection throughout their compromise."},
    {"id": "TA0006", "name": "Credential Access", "short": "credential-access", "order": 6, "description": "Techniques for stealing credentials like account names and passwords."},
    {"id": "TA0007", "name": "Discovery", "short": "discovery", "order": 7, "description": "Techniques an adversary may use to gain knowledge about the system and internal network."},
    {"id": "TA0008", "name": "Lateral Movement", "short": "lateral-movement", "order": 8, "description": "Techniques that adversaries use to enter and control remote systems on a network."},
    {"id": "TA0009", "name": "Collection", "short": "collection", "order": 9, "description": "Techniques adversaries use to gather information and sources of information to follow their objectives."},
    {"id": "TA0011", "name": "Command & Control", "short": "command-and-control", "order": 10, "description": "Techniques that adversaries may use to communicate with systems under their control within a victim network."},
    {"id": "TA0010", "name": "Exfiltration", "short": "exfiltration", "order": 11, "description": "Techniques that adversaries may use to steal data from your network."},
    {"id": "TA0040", "name": "Impact", "short": "impact", "order": 12, "description": "Techniques that adversaries use to disrupt availability or compromise integrity by manipulating business and operational processes."},
]

# Curated catalog of enterprise techniques covering the tactics
MITRE_TECHNIQUES_CATALOG = [
    # Initial Access
    {
        "id": "T1190",
        "name": "Exploit Public-Facing Application",
        "tactic_id": "TA0001",
        "description": "Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program using software, system, or service bugs to cause unintended behavior.",
        "platforms": ["Windows", "Linux", "Network"],
        "data_sources": ["Application Log", "Network Traffic"],
        "mitigations": ["Apply security patches", "Deploy WAF", "Network segmentation"]
    },
    {
        "id": "T1566",
        "name": "Phishing",
        "tactic_id": "TA0001",
        "description": "Adversaries may send phishing messages with malicious attachments or links to gain execution or steal credentials.",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["Email Gateway", "File analysis", "Network Traffic"],
        "mitigations": ["User training", "Email filtering", "Anti-spoofing protocols (DMARC)"]
    },
    {
        "id": "T1078",
        "name": "Valid Accounts",
        "tactic_id": "TA0001",
        "description": "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, or Privilege Escalation.",
        "platforms": ["Windows", "Linux", "Cloud", "Identity"],
        "data_sources": ["Logon Session", "User Account"],
        "mitigations": ["Multi-Factor Authentication", "Privileged access management", "Account monitoring"]
    },
    {
        "id": "T1133",
        "name": "External Remote Services",
        "tactic_id": "TA0001",
        "description": "Adversaries may leverage external-facing remote services such as VPNs, Citrix, and RDP to gain initial network access.",
        "platforms": ["Windows", "Linux", "Network"],
        "data_sources": ["Logon Session", "Network Traffic"],
        "mitigations": ["Enforce MFA", "Limit remote access", "IP allowlisting"]
    },

    # Execution
    {
        "id": "T1059",
        "name": "Command and Scripting Interpreter",
        "tactic_id": "TA0002",
        "description": "Adversaries may abuse command and script interpreters (e.g. PowerShell, Bash, Python, Cmd) to execute commands, scripts, or binaries.",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["Command Execution", "Process Creation", "Script Execution"],
        "mitigations": ["Script Block Logging", "Constrained Language Mode", "AppLocker / WDAC"]
    },
    {
        "id": "T1053",
        "name": "Scheduled Task / Job",
        "tactic_id": "TA0002",
        "description": "Adversaries may abuse task scheduling functionality to facilitate initial or recurring execution of malicious code.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Scheduled Task Creation", "Process Creation"],
        "mitigations": ["Audit scheduled tasks", "Restrict task creation privileges", "Monitor cron directories"]
    },
    {
        "id": "T1204",
        "name": "User Execution",
        "tactic_id": "TA0002",
        "description": "An adversary may rely upon specific actions by a user to gain execution (e.g. opening a malicious link or executable).",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["File Execution", "Process Creation"],
        "mitigations": ["Application Whitelisting", "Endpoint Protection (EDR)", "User awareness"]
    },
    {
        "id": "T1569",
        "name": "System Services Execution",
        "tactic_id": "TA0002",
        "description": "Adversaries may abuse system services or service control managers to execute malicious payloads.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Service Creation", "System Log"],
        "mitigations": ["Audit service installs", "Restrict sc.exe privileges", "EDR behavioral monitoring"]
    },

    # Persistence
    {
        "id": "T1543",
        "name": "Create or Modify System Process",
        "tactic_id": "TA0003",
        "description": "Adversaries may create or modify system-level processes or services to achieve persistence on endpoints.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Service Creation", "Registry Modifications"],
        "mitigations": ["Monitor systemd and Windows services", "Privilege separation", "File integrity monitoring"]
    },
    {
        "id": "T1547",
        "name": "Boot or Logon Autostart Execution",
        "tactic_id": "TA0003",
        "description": "Adversaries may configure system settings to automatically execute a program during system boot or logon (e.g. Registry Run keys, startup folder).",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["Windows Registry", "File Creation"],
        "mitigations": ["Monitor Run keys", "Read-only system directories", "Baseline startup programs"]
    },
    {
        "id": "T1136",
        "name": "Create Account",
        "tactic_id": "TA0003",
        "description": "Adversaries may create a local or domain account to maintain persistent access to victim systems.",
        "platforms": ["Windows", "Linux", "Cloud"],
        "data_sources": ["User Account Creation", "Authentication Log"],
        "mitigations": ["Audit account creations", "Alert on new administrative accounts", "Access reviews"]
    },

    # Privilege Escalation
    {
        "id": "T1068",
        "name": "Exploitation for Privilege Escalation",
        "tactic_id": "TA0004",
        "description": "Adversaries may exploit software vulnerabilities in elevated programs or the kernel to elevate privileges.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Process Creation", "Crash Logs"],
        "mitigations": ["Regular OS updates", "Kernel hardening", "Exploit mitigation guards (ASLR, DEP)"]
    },
    {
        "id": "T1548",
        "name": "Abuse Elevation Control Mechanism",
        "tactic_id": "TA0004",
        "description": "Adversaries may circumvent elevation control mechanisms like UAC or sudo rules to gain higher privileges.",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["Process Creation", "Command Execution"],
        "mitigations": ["Enforce UAC always notify", "Strict sudoers policy", "Avoid NOPASSWD in sudo"]
    },

    # Defense Evasion
    {
        "id": "T1070",
        "name": "Indicator Removal on Host",
        "tactic_id": "TA0005",
        "description": "Adversaries may delete or alter generated artifacts on a host system, such as event logs, shell histories, or security logs.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Log Deletion", "File Deletion"],
        "mitigations": ["Centralized log forwarding (Syslog/SIEM)", "Immutable audit trails", "Alert on wevtutil cl"]
    },
    {
        "id": "T1055",
        "name": "Process Injection",
        "tactic_id": "TA0005",
        "description": "Adversaries may inject code into running processes in order to evade process-based defenses and elevate privileges.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Process Access", "Process Memory"],
        "mitigations": ["Endpoint Detection and Response", "Memory integrity checks", "Block cross-process writes"]
    },
    {
        "id": "T1562",
        "name": "Impair Defenses",
        "tactic_id": "TA0005",
        "description": "Adversaries may disable security software, firewall rules, or logging agents to prevent detection.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Service State Change", "Process Termination"],
        "mitigations": ["Tamper protection on EDR", "Heartbeat liveness alerting", "Lockdown local firewall rules"]
    },
    {
        "id": "T1027",
        "name": "Obfuscated Files or Information",
        "tactic_id": "TA0005",
        "description": "Adversaries may attempt to make an executable or script difficult to discover or analyze (e.g. Base64 encoding, packing, XOR encryption).",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["File Metadata", "Script Analysis"],
        "mitigations": ["AMSI inspection", "Entropy analysis on uploaded files", "De-obfuscation pipeline"]
    },

    # Credential Access
    {
        "id": "T1110",
        "name": "Brute Force",
        "tactic_id": "TA0006",
        "description": "Adversaries may use brute force techniques (password guessing, spraying, credential stuffing) to gain access to valid accounts.",
        "platforms": ["Windows", "Linux", "Cloud", "Identity"],
        "data_sources": ["User Authentication", "Logon Session"],
        "mitigations": ["Account lockout policies", "Rate limiting on login endpoints", "MFA enforcement"]
    },
    {
        "id": "T1003",
        "name": "OS Credential Dumping",
        "tactic_id": "TA0006",
        "description": "Adversaries may dump credentials from the operating system to obtain account login secrets (e.g. LSASS memory, SAM database, /etc/shadow).",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Process Access", "Command Execution"],
        "mitigations": ["Credential Guard (VBS)", "Restrict debug privileges (SeDebugPrivilege)", "EDR LSASS protection"]
    },
    {
        "id": "T1555",
        "name": "Credentials from Password Stores",
        "tactic_id": "TA0006",
        "description": "Adversaries may search for common password storage locations such as web browser credential stores or vaults.",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["File Access", "Registry Access"],
        "mitigations": ["Enterprise password manager with master key", "Encrypt local vaults", "Least privilege"]
    },

    # Discovery
    {
        "id": "T1046",
        "name": "Network Service Discovery",
        "tactic_id": "TA0007",
        "description": "Adversaries may attempt to get a listing of services running on remote hosts (port scanning, banner grabbing) to identify targets.",
        "platforms": ["Network", "Windows", "Linux"],
        "data_sources": ["Network Traffic", "Packet Inspection"],
        "mitigations": ["Network IDS/IPS", "Host-based firewall blocking unauthorized scans", "Segmentation"]
    },
    {
        "id": "T1082",
        "name": "System Information Discovery",
        "tactic_id": "TA0007",
        "description": "An adversary may attempt to get detailed information about the operating system and hardware (systeminfo, uname, hostname).",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Command Execution", "Process Creation"],
        "mitigations": ["Baseline legitimate admin tools", "Alert on rapid discovery commands"]
    },
    {
        "id": "T1087",
        "name": "Account Discovery",
        "tactic_id": "TA0007",
        "description": "Adversaries may attempt to get a listing of local system or domain accounts (net user, whoami, /etc/passwd).",
        "platforms": ["Windows", "Linux", "Identity"],
        "data_sources": ["Command Execution", "Active Directory Queries"],
        "mitigations": ["Restrict LDAP query permissions", "Alert on mass enumeration"]
    },
    {
        "id": "T1018",
        "name": "Remote System Discovery",
        "tactic_id": "TA0007",
        "description": "Adversaries may attempt to get a listing of other systems by IP address, hostname, or other logical identifier on a network.",
        "platforms": ["Windows", "Linux", "Network"],
        "data_sources": ["Network Traffic", "Command Execution"],
        "mitigations": ["Internal network monitoring", "Zero Trust network architecture"]
    },

    # Lateral Movement
    {
        "id": "T1021",
        "name": "Remote Services",
        "tactic_id": "TA0008",
        "description": "Adversaries may use valid credentials to log into remote services such as SSH, RDP, SMB, and WinRM to move laterally.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Logon Session", "Network Traffic"],
        "mitigations": ["Disable unused remote protocols", "Host firewall blocking SMB/RDP between workstations", "Privileged workstations"]
    },
    {
        "id": "T1570",
        "name": "Lateral Tool Transfer",
        "tactic_id": "TA0008",
        "description": "Adversaries may transfer tools or other files between systems in a compromised network to support lateral movement.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["File Creation", "Network Traffic"],
        "mitigations": ["Internal East-West traffic inspection", "Endpoint file auditing"]
    },

    # Collection
    {
        "id": "T1005",
        "name": "Data from Local System",
        "tactic_id": "TA0009",
        "description": "Adversaries may search for and gather sensitive files and data from local storage, shared drives, or databases.",
        "platforms": ["Windows", "Linux", "macOS"],
        "data_sources": ["File Access", "Process Creation"],
        "mitigations": ["Data Loss Prevention (DLP)", "Access control lists (ACLs)", "Encryption at rest"]
    },
    {
        "id": "T1560",
        "name": "Archive Collected Data",
        "tactic_id": "TA0009",
        "description": "An adversary may compress and encrypt collected data prior to exfiltration using utilities like zip, tar, or 7z.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Command Execution", "File Creation"],
        "mitigations": ["Monitor archiving utility executions on sensitive file stores"]
    },

    # Command and Control
    {
        "id": "T1071",
        "name": "Application Layer Protocol",
        "tactic_id": "TA0011",
        "description": "Adversaries may communicate using application layer protocols (e.g. HTTP, HTTPS, DNS) to blend in with normal network traffic.",
        "platforms": ["Network", "Windows", "Linux"],
        "data_sources": ["Network Traffic", "DNS Queries", "Web Proxy"],
        "mitigations": ["Network proxy inspection", "TLS decryption", "Threat intel domain feeds (URLhaus/AbuseIPDB)"]
    },
    {
        "id": "T1571",
        "name": "Non-Standard Port",
        "tactic_id": "TA0011",
        "description": "Adversaries may communicate using a protocol on a non-standard port to evade basic perimeter firewalls.",
        "platforms": ["Network"],
        "data_sources": ["Network Traffic", "Firewall Logs"],
        "mitigations": ["Strict egress filtering", "Next-Gen Firewall (NGFW) protocol validation"]
    },
    {
        "id": "T1572",
        "name": "Protocol Tunneling",
        "tactic_id": "TA0011",
        "description": "Adversaries may tunnel network communications through standard protocols like DNS or ICMP to bypass firewalls.",
        "platforms": ["Network"],
        "data_sources": ["Network Traffic", "DNS Logs"],
        "mitigations": ["DNS sinkholing", "Inspect payload sizes for ICMP/DNS tunneling"]
    },
    {
        "id": "T1105",
        "name": "Ingress Tool Transfer",
        "tactic_id": "TA0011",
        "description": "Adversaries may transfer tools or other files from an external system (e.g. curl, certutil, wget) into a compromised network.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["File Creation", "Process Creation", "Network Traffic"],
        "mitigations": ["Restrict outbound internet from servers", "Monitor certutil / curl usage on endpoints"]
    },

    # Exfiltration
    {
        "id": "T1041",
        "name": "Exfiltration Over C2 Channel",
        "tactic_id": "TA0010",
        "description": "Adversaries may steal data by sending it over an established Command and Control communication channel.",
        "platforms": ["Network", "Windows", "Linux"],
        "data_sources": ["Network Traffic", "Process Creation"],
        "mitigations": ["Egress rate limits", "Anomaly detection on outbound bandwidth", "DLP inspection"]
    },
    {
        "id": "T1048",
        "name": "Exfiltration Over Alternative Protocol",
        "tactic_id": "TA0010",
        "description": "Adversaries may steal data by sending it over a different protocol or channel than the main C2 channel (e.g. FTP, cloud storage, SMTP).",
        "platforms": ["Network"],
        "data_sources": ["Network Traffic"],
        "mitigations": ["Block unauthorized cloud storage uploading", "CASB enforcement"]
    },

    # Impact
    {
        "id": "T1486",
        "name": "Data Encrypted for Impact",
        "tactic_id": "TA0040",
        "description": "Adversaries may encrypt data on target systems or within storage to interrupt availability to system and network resources (Ransomware).",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["File Modification", "Process Creation"],
        "mitigations": ["Offline backups (3-2-1 rule)", "Ransomware canary files", "EDR mass file modification blocks"]
    },
    {
        "id": "T1498",
        "name": "Network Denial of Service",
        "tactic_id": "TA0040",
        "description": "Adversaries may perform Network Denial of Service (DoS) attacks to degrade or disrupt the availability of targeted services.",
        "platforms": ["Network"],
        "data_sources": ["Network Traffic", "Packet Rate"],
        "mitigations": ["DDoS mitigation scrubbing", "Rate limiting on edge firewalls", "SYN flood protection"]
    },
    {
        "id": "T1489",
        "name": "Service Stop",
        "tactic_id": "TA0040",
        "description": "Adversaries may stop or disable services on a system to render those services unavailable or disable protections.",
        "platforms": ["Windows", "Linux"],
        "data_sources": ["Service State Change", "Process Termination"],
        "mitigations": ["Restrict access to sc.exe, systemctl", "Alert on core security/database service stops"]
    },
]


async def get_mitre_matrix_data(db: AsyncSession) -> Dict[str, Any]:
    """
    Computes real-time MITRE ATT&CK enterprise matrix coverage.
    Maps Sigma detection rules and live alerts to each technique.
    """
    # 1. Fetch all detection rules from Postgres
    result = await db.execute(select(DetectionRule))
    rules = result.scalars().all()
    
    rules_by_tech: Dict[str, List[Dict[str, Any]]] = {}
    for r in rules:
        if r.mitre_technique:
            t_id = r.mitre_technique.upper().strip()
            if t_id not in rules_by_tech:
                rules_by_tech[t_id] = []
            rules_by_tech[t_id].append({
                "rule_id": r.rule_id,
                "name": r.name,
                "severity": r.severity,
                "status": r.status
            })

    # 2. Fetch alert counts from MongoDB grouped by mitre_technique
    mongo_db = get_mongo_db()
    alerts_by_tech: Dict[str, int] = {}
    try:
        pipeline = [
            {"$match": {"mitre_technique": {"$ne": None}}},
            {"$group": {"_id": "$mitre_technique", "count": {"$sum": 1}}}
        ]
        cursor = mongo_db.alerts.aggregate(pipeline)
        async for doc in cursor:
            if doc.get("_id"):
                tech = str(doc["_id"]).upper().strip()
                alerts_by_tech[tech] = doc.get("count", 0)
    except Exception:
        pass

    # 3. Assemble matrix columns
    tactics_map: Dict[str, Dict[str, Any]] = {
        t["id"]: {**t, "techniques": []} for t in MITRE_TACTICS
    }

    covered_count = 0
    detected_count = 0
    total_techniques = len(MITRE_TECHNIQUES_CATALOG)

    for tech in MITRE_TECHNIQUES_CATALOG:
        t_id = tech["id"]
        mapped_rules = rules_by_tech.get(t_id, [])
        alert_count = alerts_by_tech.get(t_id, 0)

        # Status classification
        if alert_count > 0:
            status = "active_alerts"
            heatmap_score = min(100, 50 + alert_count * 10)
        elif len(mapped_rules) > 0:
            status = "covered"
            heatmap_score = 40
        else:
            status = "uncovered_gap"
            heatmap_score = 0

        if len(mapped_rules) > 0:
            covered_count += 1
        if alert_count > 0:
            detected_count += 1

        tech_payload = {
            **tech,
            "rules": mapped_rules,
            "rules_count": len(mapped_rules),
            "alert_count": alert_count,
            "status": status,
            "heatmap_score": heatmap_score
        }

        if tech["tactic_id"] in tactics_map:
            tactics_map[tech["tactic_id"]]["techniques"].append(tech_payload)

    sorted_tactics = sorted(tactics_map.values(), key=lambda x: x["order"])
    coverage_pct = round((covered_count / total_techniques * 100), 1) if total_techniques > 0 else 0

    return {
        "tactics": sorted_tactics,
        "summary": {
            "total_techniques": total_techniques,
            "covered_techniques": covered_count,
            "coverage_percentage": coverage_pct,
            "active_alerts_techniques": detected_count,
            "uncovered_gaps": total_techniques - covered_count,
            "total_active_rules": len(rules)
        }
    }


async def get_technique_details(technique_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
    """Get rich metadata, rules, and recent alerts for a single technique."""
    target_id = technique_id.upper().strip()
    match = next((t for t in MITRE_TECHNIQUES_CATALOG if t["id"] == target_id), None)
    if not match:
        return None

    # Find rules
    result = await db.execute(select(DetectionRule).where(DetectionRule.mitre_technique == target_id))
    rules = result.scalars().all()

    # Find recent alerts in Mongo
    mongo_db = get_mongo_db()
    recent_alerts = []
    try:
        cursor = mongo_db.alerts.find({"mitre_technique": target_id}).sort("created_at", -1).limit(10)
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            recent_alerts.append(doc)
    except Exception:
        pass

    # Find tactic info
    tactic = next((t for t in MITRE_TACTICS if t["id"] == match["tactic_id"]), None)

    return {
        **match,
        "tactic": tactic,
        "rules": [
            {
                "rule_id": r.rule_id,
                "name": r.name,
                "description": r.description,
                "severity": r.severity,
                "status": r.status,
                "conditions": r.conditions
            } for r in rules
        ],
        "recent_alerts": recent_alerts,
        "total_alerts": len(recent_alerts),
        "coverage_status": "covered" if rules else "gap"
    }
