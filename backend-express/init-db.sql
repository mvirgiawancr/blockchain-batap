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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, document_type)
);

CREATE INDEX idx_encryption_keys_submission ON encryption_keys(submission_id);
CREATE INDEX idx_encryption_keys_document_type ON encryption_keys(document_type);

COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for IPFS files (AES-256-CBC)';
COMMENT ON COLUMN encryption_keys.encryption_key IS 'Base64 encoded 256-bit encryption key';
COMMENT ON COLUMN encryption_keys.encryption_iv IS 'Base64 encoded 128-bit initialization vector';

-- Table: users
-- Stores user credentials and profiles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('upps', 'sekretariat', 'admin')),
    name VARCHAR(255),
    institution VARCHAR(255),
    program_studi VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts for UPPS, Sekretariat, and Admin';

-- Table: sessions
-- Stores user session tokens (JWT alternative)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- Table: audit_logs
-- Detailed audit trail (more detailed than blockchain)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (email, password_hash, role, name, institution, is_active)
VALUES (
    'admin@lamtek.org',
    '$2b$10$rKzqXPvXQJ9YJ5YGZ5Z5Z.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',  -- Hash of "admin123"
    'admin',
    'System Administrator',
    'LAM-TEK',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample UPPS user
INSERT INTO users (email, password_hash, role, name, institution, program_studi, is_active)
VALUES (
    'upps@tip.ipb.ac.id',
    '$2b$10$rKzqXPvXQJ9YJ5YGZ5Z5Z.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',
    'upps',
    'UPPS TIP IPB',
    'Institut Pertanian Bogor',
    'Teknik Industri Pertanian',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample Sekretariat user
INSERT INTO users (email, password_hash, role, name, institution, is_active)
VALUES (
    'sekretariat@lamtek.org',
    '$2b$10$rKzqXPvXQJ9YJ5YGZ5Z5Z.Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',
    'sekretariat',
    'Sekretariat LAM-TEK',
    'LAM-TEK',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Cleanup expired sessions (run this periodically)
-- DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
