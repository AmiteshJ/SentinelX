ALTER TABLE detection_rules DROP COLUMN IF EXISTS enabled;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES detection_rules(id);

CREATE TABLE IF NOT EXISTS saved_hunts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query TEXT NOT NULL,
    time_range VARCHAR(50) NOT NULL,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_iocs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    severity VARCHAR(20),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
