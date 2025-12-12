-- Database initialization for Blockchain-based Accreditation System
-- LAM-TEK 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: encryption_keys
-- Stores AES-256-CBC encryption keys for IPFS files
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    encryption_key TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    cid TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, document_type)
);

CREATE INDEX idx_encryption_keys_submission ON encryption_keys(submission_id);
CREATE INDEX idx_encryption_keys_document_type ON encryption_keys(document_type);

COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for IPFS files (AES-256-CBC)';
COMMENT ON COLUMN encryption_keys.encryption_key IS 'Base64 encoded 256-bit encryption key';
COMMENT ON COLUMN encryption_keys.encryption_iv IS 'Base64 encoded 128-bit initialization vector';
COMMENT ON COLUMN encryption_keys.cid IS 'IPFS CID for the encrypted document';

-- Table: users (MUST BE CREATED BEFORE submission_assignments due to foreign keys)
-- Stores user credentials and profiles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('upps', 'sekretariat', 'assessor', 'kea', 'asesor', 'admin')),
    name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    program_studi VARCHAR(255),
    phone VARCHAR(50),
    msp_org VARCHAR(50) NOT NULL, -- UPPSMSP, SekretariatMSP, AssessorMSP
    msp_credentials JSONB, -- Encrypted MSP credentials (cert, private key)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_msp_org ON users(msp_org);

COMMENT ON TABLE users IS 'User accounts for UPPS, Sekretariat, Assessor, and Admin';
COMMENT ON COLUMN users.msp_credentials IS 'Encrypted Fabric MSP credentials (certificate + private key in JSON)';

-- Table: sessions
-- Stores user session tokens (JWT alternative)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

COMMENT ON TABLE sessions IS 'Active user sessions';

-- Table: submission_assignments
-- Maps submissions to assigned assessor with traceability
CREATE TABLE IF NOT EXISTS submission_assignments (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    assessor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    decision_notes TEXT,
    decided_at TIMESTAMP,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submission_assignments_submission_id ON submission_assignments(submission_id);
CREATE INDEX idx_submission_assignments_assessor_user_id ON submission_assignments(assessor_user_id);

COMMENT ON TABLE submission_assignments IS 'Assignments of submissions to assessor (traceable)';

-- Table: audit_logs
-- Detailed audit trail (more detailed than blockchain)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

COMMENT ON TABLE audit_logs IS 'Detailed audit trail for all system activities';

-- Table: submission_metadata
-- Extended metadata not stored on blockchain
CREATE TABLE IF NOT EXISTS submission_metadata (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    upload_ip VARCHAR(50),
    upload_user_agent TEXT,
    file_metadata JSONB,
    processing_logs JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submission_metadata_submission_id ON submission_metadata(submission_id);
CREATE INDEX idx_submission_metadata_user_id ON submission_metadata(user_id);

COMMENT ON TABLE submission_metadata IS 'Extended submission metadata not stored on blockchain';
COMMENT ON COLUMN submission_metadata.file_metadata IS 'Original file info: size, mimetype, checksums';
COMMENT ON COLUMN submission_metadata.processing_logs IS 'Upload/encryption/IPFS processing logs';

-- Table: analytics
-- System usage statistics
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    submission_id VARCHAR(255),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created_at ON analytics(created_at);

COMMENT ON TABLE analytics IS 'System usage analytics and metrics';

-- Table: notifications
-- User notifications (not on blockchain)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_submission_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

COMMENT ON TABLE notifications IS 'User notifications';

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_encryption_keys_updated_at BEFORE UPDATE ON encryption_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_metadata_updated_at BEFORE UPDATE ON submission_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default users (password: password123 for all - CHANGE IN PRODUCTION!)
-- Password hash for 'password123' using bcrypt rounds=10
-- Hash: $2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm

-- 1. Admin user
INSERT INTO users (username, password_hash, role, name, institution, msp_org, is_active)
VALUES (
    'admin',
    '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
    'admin',
    'System Administrator',
    'LAM-TEK',
    'OrdererMSP',
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- 2. UPPS users (multiple institutions)
INSERT INTO users (username, password_hash, role, name, institution, program_studi, msp_org, is_active)
VALUES 
    (
        'upps_tip',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'upps',
        'UPPS TIP IPB',
        'Institut Pertanian Bogor',
        'Teknik Industri Pertanian',
        'UPPSMSP',
        TRUE
    ),
    (
        'upps_ti',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'upps',
        'UPPS Teknik Informatika UI',
        'Universitas Indonesia',
        'Teknik Informatika',
        'UPPSMSP',
        TRUE
    ),
    (
        'upps_te',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'upps',
        'UPPS Teknik Elektro ITB',
        'Institut Teknologi Bandung',
        'Teknik Elektro',
        'UPPSMSP',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- 3. Sekretariat users
INSERT INTO users (username, password_hash, role, name, institution, msp_org, is_active)
VALUES 
    (
        'sekretariat',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'sekretariat',
        'Sekretariat LAM-TEK',
        'LAM-TEK',
        'SekretariatMSP',
        TRUE
    ),
    (
        'sekretariat_admin',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'sekretariat',
        'Admin Sekretariat',
        'LAM-TEK',
        'SekretariatMSP',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- 4. KEA users (Ketua Evaluasi Akreditasi)
INSERT INTO users (username, password_hash, role, name, institution, msp_org, is_active)
VALUES 
    (
        'kea',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'kea',
        'Ketua Evaluasi Akreditasi',
        'LAM-TEK',
        'SekretariatMSP',
        TRUE
    ),
    (
        'kea_backup',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'kea',
        'Wakil KEA',
        'LAM-TEK',
        'SekretariatMSP',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- 5. Asesor users (multiple assessors with expertise/program_studi)
INSERT INTO users (username, password_hash, role, name, institution, program_studi, phone, msp_org, is_active)
VALUES 
    (
        'asesor_001',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'asesor',
        'Prof. Dr. Ahmad Fauzi, M.T.',
        'Universitas Indonesia',
        'Teknik Informatika',
        '081234567801',
        'SekretariatMSP',
        TRUE
    ),
    (
        'asesor_002',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'asesor',
        'Dr. Ir. Budi Santoso, M.Eng.',
        'Institut Teknologi Bandung',
        'Teknik Elektro',
        '081234567802',
        'SekretariatMSP',
        TRUE
    ),
    (
        'asesor_003',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'asesor',
        'Prof. Dr. Citra Dewi, M.T.',
        'Institut Pertanian Bogor',
        'Sistem Informasi',
        '081234567803',
        'SekretariatMSP',
        TRUE
    ),
    (
        'asesor_004',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'asesor',
        'Dr. Dedi Rahman, S.T., M.T.',
        'Universitas Gadjah Mada',
        'Teknik Komputer',
        '081234567804',
        'SekretariatMSP',
        TRUE
    ),
    (
        'asesor_005',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'asesor',
        'Prof. Ir. Eka Putri, Ph.D.',
        'Institut Teknologi Sepuluh Nopember',
        'Teknik Mesin',
        '081234567805',
        'SekretariatMSP',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- Cleanup expired sessions (run this periodically)
-- DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
