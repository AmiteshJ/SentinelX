"""
Knowledge base ingestion + RAG retrieval (spec §20, §45). Documents are
chunked, embedded, and stored in pgvector; retrieval is cosine-similarity
search used by the AI SOC Assistant's context builder (spec §21-23) so the
LLM only ever sees real, retrieved SentinelX/security knowledge.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import _get_model, embed_batch, embed_text

CHUNK_SIZE_CHARS = 800
CHUNK_OVERLAP_CHARS = 100


def chunk_text(content: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(content):
        end = start + CHUNK_SIZE_CHARS
        chunks.append(content[start:end])
        start = end - CHUNK_OVERLAP_CHARS
        if start < 0 or end >= len(content):
            break
    return [c.strip() for c in chunks if c.strip()]


async def ingest_document(db: AsyncSession, *, title: str, source: str, content: str) -> int:
    chunks = chunk_text(content)
    if not chunks:
        return 0
    embeddings = embed_batch(chunks)

    # First delete existing document chunks with the same title to allow updating
    await db.execute(
        text("DELETE FROM knowledge_chunks WHERE document_title = :title"),
        {"title": title}
    )

    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        await db.execute(
            text(
                """
                INSERT INTO knowledge_chunks (document_title, source, chunk_index, content, embedding)
                VALUES (:title, :source, :idx, :content, :embedding)
                """
            ),
            {
                "title": title,
                "source": source,
                "idx": idx,
                "content": chunk,
                "embedding": str(embedding),  # pgvector accepts a text literal like "[0.1,0.2,...]"
            },
        )
    await db.commit()
    return len(chunks)


async def semantic_search(db: AsyncSession, query: str, *, top_k: int = 5) -> list[dict]:
    query_embedding = embed_text(query)
    result = await db.execute(
        text(
            """
            SELECT id, document_title, source, chunk_index, content, 
                   ROUND(CAST(1 - (embedding <=> :embedding) AS numeric), 4) AS similarity
            FROM knowledge_chunks
            ORDER BY embedding <=> :embedding
            LIMIT :top_k
            """
        ),
        {"embedding": str(query_embedding), "top_k": top_k},
    )
    rows = result.mappings().all()
    return [
        {
            "id": str(row["id"]),
            "document_title": row["document_title"],
            "source": row["source"],
            "chunk_index": int(row["chunk_index"]),
            "content": row["content"],
            "similarity": float(row["similarity"]) if row["similarity"] is not None else 0.0,
        }
        for row in rows
    ]


async def list_documents(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        text(
            """
            SELECT 
                document_title,
                source,
                COUNT(*) as chunk_count,
                MIN(created_at) as created_at
            FROM knowledge_chunks
            GROUP BY document_title, source
            ORDER BY MIN(created_at) DESC
            """
        )
    )
    rows = result.mappings().all()
    return [
        {
            "document_title": row["document_title"],
            "source": row["source"],
            "chunk_count": int(row["chunk_count"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else "",
        }
        for row in rows
    ]


async def get_document_chunks(db: AsyncSession, title: str) -> list[dict]:
    result = await db.execute(
        text(
            """
            SELECT id, document_title, source, chunk_index, content, created_at
            FROM knowledge_chunks
            WHERE document_title = :title
            ORDER BY chunk_index ASC
            """
        ),
        {"title": title}
    )
    rows = result.mappings().all()
    return [
        {
            "id": str(row["id"]),
            "document_title": row["document_title"],
            "source": row["source"],
            "chunk_index": int(row["chunk_index"]),
            "content": row["content"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else "",
        }
        for row in rows
    ]


async def delete_document(db: AsyncSession, title: str) -> int:
    result = await db.execute(
        text("DELETE FROM knowledge_chunks WHERE document_title = :title"),
        {"title": title}
    )
    await db.commit()
    return result.rowcount or 0


async def get_knowledge_stats(db: AsyncSession) -> dict:
    result = await db.execute(
        text(
            """
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(DISTINCT document_title) as total_documents,
                COUNT(DISTINCT source) as total_sources
            FROM knowledge_chunks
            """
        )
    )
    row = result.mappings().first() or {"total_chunks": 0, "total_documents": 0, "total_sources": 0}
    
    model = _get_model()
    model_name = "all-MiniLM-L6-v2 (384-dim)" if model is not None else "Deterministic Hashing Fallback (384-dim)"
    
    return {
        "total_chunks": int(row["total_chunks"]),
        "total_documents": int(row["total_documents"]),
        "total_sources": int(row["total_sources"]),
        "vector_dimension": 384,
        "embedding_model": model_name,
        "index_type": "IVFFlat (vector_cosine_ops)",
        "vector_store": "PostgreSQL (pgvector)"
    }


DEFAULT_SECURITY_PLAYBOOKS = [
    {
        "title": "MITRE ATT&CK T1059: Command and Scripting Interpreter SOP",
        "source": "mitre",
        "content": """MITRE ATT&CK Technique T1059: Command and Scripting Interpreter Playbook.
Adversaries abuse command and script interpreters to execute arbitrary commands, scripts, or binaries. This includes PowerShell, Unix Shells (sh, bash), Windows Command Shell (cmd.exe), Python, and Visual Basic Script (VBScript).
Detection Indicators:
1. Suspicious command line arguments such as '-EncodedCommand', '-ExecutionPolicy Bypass', '-nop -w hidden', or curl piped to bash ('curl ... | bash').
2. Spawn of cmd.exe or powershell.exe from unexpected parent processes like w3wp.exe, excel.exe, winword.exe, or nginx.
3. Network connections initiated immediately after an interpreter is spawned to untrusted public IP addresses.
Triage & Containment:
- Immediate Action: If execution is confirmed unauthorized, isolate the host agent using firewall containment or terminate the parent process PID.
- Forensic Steps: Collect process command-line history, examine Event ID 4688 / Sysmon Event ID 1 (Process Creation), and capture script block logs (Event ID 4104).
- Containment: Block the destination C2 IP at network boundary and quarantine the dropped payload."""
    },
    {
        "title": "Reverse Shell and C2 Beaconing Containment Playbook",
        "source": "playbook",
        "content": """SentinelX SOC Playbook: Reverse Shell and C2 Beaconing Containment.
Incident Trigger: Detection of interactive network telemetry targeting common reverse-shell ports (4444, 1337, 8888, 9001) or regular beacon intervals to untrusted external addresses.
Indicators of Compromise (IOC):
- External IP with low or malicious AbuseIPDB reputation.
- Inbound connection to an internal service immediately followed by persistent outbound TCP connection.
- Interactive TTY shell spawned in memory without a standard desktop terminal session.
Response Workflow:
1. Host Isolation: Execute automated host containment (SOAR block_ip on the agent endpoint) to cut off attacker interactive access.
2. Process Remediation: Identify the PID owning the socket (via netstat / SentinelX live network collector) and execute taskkill or kill -9.
3. Persistence Audit: Check scheduled tasks (Windows Task Scheduler, cron jobs), registry run keys (HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run), and authorized_keys files.
4. Threat Intel Enrichment: Submit the remote destination IP and observed domain to AbuseIPDB and URLhaus for full cluster correlation."""
    },
    {
        "title": "Ransomware Defense and Rapid Containment SOP",
        "source": "playbook",
        "content": """SentinelX SOC Playbook: Ransomware Rapid Containment and Evidence Preservation.
Overview: Ransomware attacks involve rapid file encryption, shadow copy deletion, and lateral movement via SMB/RDP. Time-to-containment is critical.
Early Indicators:
- Mass file modification or renaming with high entropy.
- Execution of 'vssadmin delete shadows /all /quiet' or 'wbadmin delete catalog'.
- Multiple failed SMB login attempts followed by administrative share access (ADMIN$, C$).
Containment Protocol:
1. Immediate Isolation: Sever host network connection via SentinelX agent firewall containment rule to prevent lateral spread across the subnet.
2. DO NOT power off immediately if memory forensics are required; instead, suspend the malicious process to keep encryption keys in RAM.
3. Identity Lockdown: Disable compromised Active Directory / LDAP user credentials immediately.
4. Volume Shadow and Backup Verification: Confirm immutable offline backup status before initiating any recovery procedures."""
    },
    {
        "title": "Zero-Day Vulnerability Triage and Anomaly Escalation",
        "source": "playbook",
        "content": """SentinelX SOC Playbook: Zero-Day Vulnerability Triage and Anomaly Escalation.
Scope: Unclassified threats detected via Isolation Forest anomaly scoring or GraphSAGE graph neural network embeddings where no known Sigma rule or CVE matches.
Triage Steps:
1. Statistical Outlier Confirmation: Review Isolation Forest score (> 0.75). Check packet length distributions, flow duration, and protocol anomalies.
2. Graph Topology Inspection: In the GraphSAGE view, examine whether the entity node is bridging disparate subnets or forming unexpected k-NN similarity clusters with known malware nodes.
3. Payload Inspection: Extract raw PCAP telemetry for deep packet inspection. Check for unknown shellcode, NOP sleds, or buffer overflow return address overwrites.
4. Virtual Patching: Formulate an interim Sigma rule in the Detection Engineering studio to immediately monitor for the specific packet sequence or port behavior while vendor patches are pending."""
    },
    {
        "title": "Brute Force and Credential Stuffing Response SOP",
        "source": "playbook",
        "content": """SentinelX SOC Playbook: Brute Force & Credential Access Triage.
Trigger: High frequency of HTTP 401/403 responses, SSH failed login attempts (Linux /var/log/auth.log), or Windows Security Event ID 4625 (An account failed to log on).
Analysis:
- Verify whether the attack is distributed (credential stuffing from hundreds of rotating IPs) or targeted (single IP attempting thousands of passwords against one account).
- Check Geo-velocity: Did the user account successfully authenticate from New York, then 5 minutes later from Frankfurt?
Containment Actions:
1. Block attacking source IP address or IP CIDR range.
2. Force password reset and revoke all active JWT / OAuth sessions for the targeted user accounts.
3. Verify Multi-Factor Authentication (MFA) enforcement on the affected portal."""
    }
]


async def seed_default_playbooks(db: AsyncSession) -> int:
    total_chunks = 0
    for pb in DEFAULT_SECURITY_PLAYBOOKS:
        chunks_added = await ingest_document(
            db,
            title=pb["title"],
            source=pb["source"],
            content=pb["content"]
        )
        total_chunks += chunks_added
    return total_chunks

