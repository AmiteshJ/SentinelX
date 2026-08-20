-- SentinelX PostgreSQL schema (Phase 1-2: system of record for auth/RBAC/audit)
-- Structured relational store. High-volume security data (events, alerts, IOCs)
-- lives in MongoDB per the polyglot architecture (see docs/database.md).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Roles & Permissions ----------

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------- Users & Auth ----------

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(30),
    hashed_password VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    consumed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(64),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    risk_score NUMERIC(5,2),
    assigned_analyst_id UUID REFERENCES users(id),
    mongo_alert_ids TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    assigned_analyst_id UUID REFERENCES users(id),
    related_incident_ids UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    mitre_technique VARCHAR(20),
    conditions JSONB NOT NULL,
    tags TEXT[],
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    metadata JSONB,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('soc_analyst', 'Investigation, alerts, intelligence, AI assistant'),
    ('security_manager', 'Dashboard, incidents, reports'),
    ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('incidents:read', 'View incidents'),
    ('incidents:write', 'Modify incidents'),
    ('rules:read', 'View detection rules'),
    ('rules:write', 'Modify detection rules'),
    ('ioc:read', 'View IOCs'),
    ('ioc:write', 'Add/modify IOCs'),
    ('reports:read', 'View reports'),
    ('reports:write', 'Generate reports'),
    ('audit:read', 'View audit logs'),
    ('users:manage', 'Manage users and roles')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'soc_analyst'
  AND p.code IN ('incidents:read','incidents:write','rules:read','ioc:read','ioc:write','reports:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'security_manager'
  AND p.code IN ('incidents:read','reports:read','reports:write','audit:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.code IN ('incidents:read','rules:read','ioc:read','reports:read')
ON CONFLICT DO NOTHING;

-- ---------- Vector store for RAG (spec §20, Phase 16) ----------

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_title VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,          -- mitre | nvd | internal_doc | incident_report | analyst_note
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),                 -- dimension matches app/ai/embeddings.py's default model
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
    ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------- Seed detection rules (Sigma-inspired, spec §9) ----------
-- Conditions are evaluated by backend/app/detection/rule_engine.py against the
-- canonical event shape in backend/app/schemas/event.py. Ports/thresholds below
-- are commonly-cited indicators (well-known reverse-shell / trojan ports,
-- excessive single-flow volume) — they are a reasonable, documented starting
-- point for a rule set, not fabricated statistics, and are meant to be tuned.

INSERT INTO detection_rules (rule_id, name, description, severity, mitre_technique, conditions, tags, enabled) VALUES
(
    'SIGMA-001',
    'Connection to Known Malicious Port',
    'Flags outbound connections to ports commonly associated with reverse shells, RATs, or known trojans (e.g. Metasploit default 4444, Back Orifice 31337).',
    'high',
    'T1571',
    '{"any": [
        {"field": "destination_port", "operator": "in", "value": [4444, 31337, 12345, 6666, 6667]}
    ]}'::jsonb,
    ARRAY['network', 'c2'],
    true
),
(
    'SIGMA-002',
    'Suspicious Remote Access Port Exposure',
    'Flags connections to remote administration ports (RDP/SSH/Telnet/VNC) that may indicate brute-force targeting or unauthorized remote access attempts.',
    'medium',
    'T1021',
    '{"any": [
        {"field": "destination_port", "operator": "in", "value": [22, 23, 3389, 5900]}
    ]}'::jsonb,
    ARRAY['network', 'remote-access'],
    true
),
(
    'SIGMA-003',
    'Abnormally Large Single-Flow Data Transfer',
    'Flags a single connection transferring an unusually large volume of bytes, which can indicate data exfiltration.',
    'high',
    'T1041',
    '{"all": [
        {"field": "bytes_sent", "operator": "gte", "value": 50000000}
    ]}'::jsonb,
    ARRAY['network', 'exfiltration'],
    true
),
(
    'SIGMA-004',
    'DNS Query to Suspicious TLD',
    'Flags DNS lookups to top-level domains frequently abused for malware distribution / C2 infrastructure due to low registration cost and scrutiny.',
    'low',
    'T1071.004',
    '{"any": [
        {"field": "dns_query", "operator": "endswith", "value": ".xyz"},
        {"field": "dns_query", "operator": "endswith", "value": ".top"},
        {"field": "dns_query", "operator": "endswith", "value": ".biz"}
    ]}'::jsonb,
    ARRAY['dns'],
    true
)
ON CONFLICT (rule_id) DO NOTHING;
