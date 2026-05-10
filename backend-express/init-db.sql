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
    role VARCHAR(50) NOT NULL CHECK (role IN ('upps', 'sekretariat', 'assessor', 'kea', 'asesor', 'admin', 'majelis')),
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

-- 5a. Majelis Akreditasi users
INSERT INTO users (username, password_hash, role, name, institution, msp_org, is_active)
VALUES 
    (
        'majelis_ketua',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'majelis',
        'Ketua Majelis Akreditasi',
        'LAM-TEK',
        'MajelisMSP',
        TRUE
    ),
    (
        'majelis_anggota1',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'majelis',
        'Anggota Majelis 1',
        'LAM-TEK',
        'MajelisMSP',
        TRUE
    ),
    (
        'majelis_anggota2',
        '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm',
        'majelis',
        'Anggota Majelis 2',
        'LAM-TEK',
        'MajelisMSP',
        TRUE
    )
ON CONFLICT (username) DO NOTHING;

-- 5b. Asesor users from TIN Faculty (Real data from profiling)
INSERT INTO users (username, password_hash, role, name, institution, program_studi, phone, msp_org, is_active)
VALUES 
    ('asesor_001', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Marimin, M.Sc', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567801', 'AsesorMSP', TRUE),
    ('asesor_002', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Nastiti Siswi Indrasti', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567802', 'AsesorMSP', TRUE),
    ('asesor_003', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Khaswar Syamsu, M.Sc,ST', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567803', 'AsesorMSP', TRUE),
    ('asesor_004', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Suprihatin', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567804', 'AsesorMSP', TRUE),
    ('asesor_005', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Erliza, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567805', 'AsesorMSP', TRUE),
    ('asesor_006', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Erliza Noor', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567806', 'AsesorMSP', TRUE),
    ('asesor_007', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Muhammad Romli, M.Sc,ST', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567807', 'AsesorMSP', TRUE),
    ('asesor_008', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Anas Miftah Fauzi, M.Eng', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567808', 'AsesorMSP', TRUE),
    ('asesor_009', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr. Ono Suparno, S.TP,MT', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567809', 'AsesorMSP', TRUE),
    ('asesor_010', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Yandra, M.Eng', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567810', 'AsesorMSP', TRUE),
    ('asesor_011', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Illah Sailah, MS', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567811', 'AsesorMSP', TRUE),
    ('asesor_012', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Tajuddin Bantacut, M.Sc', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567812', 'AsesorMSP', TRUE),
    ('asesor_013', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr. Endang Warsiki, S.TP,M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567813', 'AsesorMSP', TRUE),
    ('asesor_014', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Hartrisari Hardjomidjojo, DEA', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567814', 'AsesorMSP', TRUE),
    ('asesor_015', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr. Taufik, S.TP,M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567815', 'AsesorMSP', TRUE),
    ('asesor_016', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Titi Candra Sunarti, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567816', 'AsesorMSP', TRUE),
    ('asesor_017', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Indah Yuliasih S.TP, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567817', 'AsesorMSP', TRUE),
    ('asesor_018', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr.Ir. Moh. Yani, M.Eng', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567818', 'AsesorMSP', TRUE),
    ('asesor_019', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr.Ir. Sapta Raharja, DEA', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567819', 'AsesorMSP', TRUE),
    ('asesor_020', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr. Ika Amalia Kartika, S.TP,M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567820', 'AsesorMSP', TRUE),
    ('asesor_021', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Dwi Setyaningsih, S.TP,M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567821', 'AsesorMSP', TRUE),
    ('asesor_022', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Prof.Dr. Farah Fahma, S.TP,MT', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567822', 'AsesorMSP', TRUE),
    ('asesor_023', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Andes Ismayana, S.TP,MT', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567823', 'AsesorMSP', TRUE),
    ('asesor_024', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr.Ir. Sugiarto, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567824', 'AsesorMSP', TRUE),
    ('asesor_025', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Elisa Anggraeni, S.TP,M.Sc', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567825', 'AsesorMSP', TRUE),
    ('asesor_026', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Deasy Kartika Rahayu Kuncoro, ST.,M.T', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567826', 'AsesorMSP', TRUE),
    ('asesor_027', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr.Ir. Muslich, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567827', 'AsesorMSP', TRUE),
    ('asesor_028', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr.Ir. Meika Syahbana Rusli, M.Sc,A.gr', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567828', 'AsesorMSP', TRUE),
    ('asesor_029', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Prayoga Suryadarma, S.TP,MT', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567829', 'AsesorMSP', TRUE),
    ('asesor_030', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr.Ir. Mulyorini Rahayuningsih, M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567830', 'AsesorMSP', TRUE),
    ('asesor_031', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Muhammad Arif Darmawan, S.TP,MT', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567831', 'AsesorMSP', TRUE),
    ('asesor_032', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Niken Ayu Permatasari, S.TP,M.Si', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567832', 'AsesorMSP', TRUE),
    ('asesor_033', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Rini Purnawati, S.TP. MSc', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567833', 'AsesorMSP', TRUE),
    ('asesor_034', '$2b$10$ey3io1twhYpoFUsiXo9hlO9IP7E.3cDiaMKbWlAnsVVYUFu9DbPMm', 'asesor', 'Dr. Muhammad Syukur Sarfat, M.Si.', 'Institut Pertanian Bogor', 'Teknologi Industri Pertanian', '081234567834', 'AsesorMSP', TRUE)
ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    program_studi = EXCLUDED.program_studi,
    msp_org = EXCLUDED.msp_org;

-- 6. Assessor Profiles (Scholar/Scopus links)
CREATE TABLE IF NOT EXISTS assessor_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    google_scholar_url TEXT,
    scopus_url TEXT,
    department VARCHAR(50),
    research_areas TEXT[],
    h_index INTEGER,
    publication_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessor_profiles_user_id ON assessor_profiles(user_id);

-- Insert assessor profiles with Scholar/Scopus links
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=dDtbqMwAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=7409682197', 'TIN'
FROM users WHERE username = 'asesor_001'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=PcWqLxkAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=22234206800', 'TIN'
FROM users WHERE username = 'asesor_002'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=Rt2PiqwAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=6507451876', 'TIN'
FROM users WHERE username = 'asesor_003'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=YPYaUJgAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=56085767200', 'TIN'
FROM users WHERE username = 'asesor_004'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=eZ_TRJ0AAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=35503184700', 'TIN'
FROM users WHERE username = 'asesor_005'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=2DYsY9sAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55977772800', 'TIN'
FROM users WHERE username = 'asesor_006'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=rpHkx4sAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55574122275', 'TIN'
FROM users WHERE username = 'asesor_007'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=C-SWorgAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55951561800', 'TIN'
FROM users WHERE username = 'asesor_008'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=IWKZrZ4AAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=8957558300', 'TIN'
FROM users WHERE username = 'asesor_009'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=LDf7YzkAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55946558300', 'TIN'
FROM users WHERE username = 'asesor_010'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=8jBjsUsAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57207302968', 'TIN'
FROM users WHERE username = 'asesor_011'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=3ipxV_kAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57188582609', 'TIN'
FROM users WHERE username = 'asesor_012'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=jJcdHGIAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57190938204', 'TIN'
FROM users WHERE username = 'asesor_013'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=99E94dsAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57211267581', 'TIN'
FROM users WHERE username = 'asesor_014'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=jUH0gdkAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55014499000', 'TIN'
FROM users WHERE username = 'asesor_015'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=ozwwVywAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=8636326000', 'TIN'
FROM users WHERE username = 'asesor_016'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=UtbK-ugAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=55322289600', 'TIN'
FROM users WHERE username = 'asesor_017'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=wDmm5HUAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=6603321602', 'TIN'
FROM users WHERE username = 'asesor_018'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=fq1iDw0AAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=15049768000', 'TIN'
FROM users WHERE username = 'asesor_019'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=FN1erhEAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=34971533400', 'TIN'
FROM users WHERE username = 'asesor_020'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=ukUaIpEAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=6508356816', 'TIN'
FROM users WHERE username = 'asesor_021'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=-_vHVywAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=36536701900', 'TIN'
FROM users WHERE username = 'asesor_022'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=80SKJQYAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57204938013', 'TIN'
FROM users WHERE username = 'asesor_023'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=Quoqo3EAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57193761907', 'TIN'
FROM users WHERE username = 'asesor_024'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=8Z1PPZUAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57195592356', 'TIN'
FROM users WHERE username = 'asesor_025'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=LylBITYAAAAJ', NULL, 'TIN'
FROM users WHERE username = 'asesor_026'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=Znm63xwAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=34971614400', 'TIN'
FROM users WHERE username = 'asesor_027'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=nJFAefAAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57200723971', 'TIN'
FROM users WHERE username = 'asesor_028'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=8rEa3g4AAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=54879446100', 'TIN'
FROM users WHERE username = 'asesor_029'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=HFQMq7QAAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57204219216', 'TIN'
FROM users WHERE username = 'asesor_030'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=FSxvtbAAAAAJ', NULL, 'TIN'
FROM users WHERE username = 'asesor_031'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=Rg4EaxYAAAAJ', NULL, 'TIN'
FROM users WHERE username = 'asesor_032'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, NULL, 'https://www.scopus.com/authid/detail.uri?authorId=57193923546', 'TIN'
FROM users WHERE username = 'asesor_033'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO assessor_profiles (user_id, google_scholar_url, scopus_url, department)
SELECT id, 'https://scholar.google.com/citations?hl=id&user=OjoTm88AAAAJ', 'https://www.scopus.com/authid/detail.uri?authorId=57224196281', 'TIN'
FROM users WHERE username = 'asesor_034'
ON CONFLICT (user_id) DO NOTHING;

-- 7. AL Schedules (Asesmen Lapangan - Phase 3B)
CREATE TABLE IF NOT EXISTS al_schedules (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    proposed_date TIMESTAMP NOT NULL,
    proposed_end_date TIMESTAMP,
    proposed_venue TEXT NOT NULL,
    proposed_by UUID REFERENCES users(id),
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'completed', 'verified', 'accredited', 'released')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    -- Flow synchronization status
    flow_a_completed BOOLEAN DEFAULT FALSE,
    flow_a_completed_at TIMESTAMP,
    flow_b_completed BOOLEAN DEFAULT FALSE,
    flow_b_completed_at TIMESTAMP,
    sync_completed BOOLEAN DEFAULT FALSE,
    sync_completed_at TIMESTAMP,
    ready_for_al BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_al_schedules_submission_id ON al_schedules(submission_id);
CREATE INDEX IF NOT EXISTS idx_al_schedules_status ON al_schedules(status);
CREATE INDEX IF NOT EXISTS idx_al_schedules_proposed_date ON al_schedules(proposed_date);

CREATE TRIGGER update_al_schedules_updated_at BEFORE UPDATE ON al_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE al_schedules IS 'AL (Asesmen Lapangan) scheduling for Phase 3B';

-- Cleanup expired sessions (run this periodically)
-- DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;

-- Phase 4: AL Execution (Berita Acara)
CREATE TABLE IF NOT EXISTS al_executions (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255) UNIQUE REFERENCES al_schedules(submission_id) ON DELETE CASCADE,
    berita_acara_cid TEXT,
    berita_acara_hash TEXT,
    attendance_values JSONB, -- {asesor1: true, asesor2: true, ...}
    findings JSONB, -- Array of strings
    scores JSONB, -- {criteria1: 4, ...}
    total_score NUMERIC(5,2),
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_al_executions_submission_id ON al_executions(submission_id);

-- Phase 4: UPPS Responses
CREATE TABLE IF NOT EXISTS al_responses (
    id SERIAL PRIMARY KEY,
    response_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255) UNIQUE REFERENCES al_schedules(submission_id) ON DELETE CASCADE,
    execution_id VARCHAR(255) REFERENCES al_executions(execution_id),
    response_hash TEXT,
    response_cid TEXT,
    notes TEXT,
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_al_responses_submission_id ON al_responses(submission_id);

-- Phase 5: Verification & Decision
CREATE TABLE IF NOT EXISTS verification_results (
    id SERIAL PRIMARY KEY,
    verification_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255) UNIQUE REFERENCES al_schedules(submission_id) ON DELETE CASCADE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    score_adjustments JSONB, -- Array of adjustments
    final_score NUMERIC(5,2),
    recommended_rank VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_results_submission_id ON verification_results(submission_id);

CREATE TABLE IF NOT EXISTS accreditation_decisions (
    id SERIAL PRIMARY KEY,
    decision_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255) UNIQUE REFERENCES al_schedules(submission_id) ON DELETE CASCADE,
    final_rank VARCHAR(50) NOT NULL,
    final_score NUMERIC(5,2),
    sk_number VARCHAR(100) UNIQUE,
    sk_date DATE,
    valid_until DATE,
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_cid TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accreditation_decisions_submission_id ON accreditation_decisions(submission_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_decisions_sk_number ON accreditation_decisions(sk_number);

-- Phase 6: Certificates & Sync Logs
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255) UNIQUE REFERENCES al_schedules(submission_id) ON DELETE CASCADE,
    decision_id VARCHAR(255) REFERENCES accreditation_decisions(decision_id),
    file_cid TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issued_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS external_sync_logs (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL,
    target_system VARCHAR(50) NOT NULL, -- BAN-PT, PDDIKTI
    action VARCHAR(50) NOT NULL, -- PUSH_RESULT, GET_STATUS
    payload JSONB,
    response JSONB,
    status VARCHAR(20) DEFAULT 'PENDING', 
    attempt_count INTEGER DEFAULT 1,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_sync_logs_submission_id ON external_sync_logs(submission_id);

-- Trigger updates
CREATE TRIGGER update_al_executions_updated_at BEFORE UPDATE ON al_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- RESEARCH AREAS POPULATION (from populate_research_areas.sql)
-- =============================================================

-- Ensure all assessors have profiles
INSERT INTO assessor_profiles (user_id)
SELECT id FROM users WHERE role IN ('asesor', 'assessor') AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- Group 1: Pengolahan Pangan & Teknologi Pangan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Food Processing', 'Food Technology', 'Post-Harvest Technology', 'Food Safety'],
  h_index = 12,
  publication_count = 45
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Farah Fahma%' OR name LIKE '%Endang Warsiki%'
);

-- Group 2: Bioproses & Bioenergi
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology'],
  h_index = 15,
  publication_count = 52
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Khaswar Syamsu%' OR name LIKE '%Prayoga Suryadarma%' OR name LIKE '%Andes Ismayana%'
);

-- Group 3: Manajemen Agroindustri & Supply Chain
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management'],
  h_index = 18,
  publication_count = 65
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Marimin%' OR name LIKE '%Hartrisari%' OR name LIKE '%Illah Sailah%'
);

-- Group 4: Teknologi Lingkungan & Pengolahan Limbah
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment'],
  h_index = 14,
  publication_count = 48
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Suprihatin%' OR name LIKE '%Muhammad Romli%' OR name LIKE '%Nastiti%'
);

-- Group 5: Teknologi Kemasan & Material
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Packaging Technology', 'Biopolymer', 'Biodegradable Materials', 'Nanotechnology'],
  h_index = 16,
  publication_count = 55
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Titi Candra%' OR name LIKE '%Indah Yuliasih%'
);

-- Group 6: Sistem Informasi & Kecerdasan Buatan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Decision Support System', 'Artificial Intelligence', 'Fuzzy Logic', 'Expert System'],
  h_index = 20,
  publication_count = 78
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Ono Suparno%' OR name LIKE '%Elisa Anggraeni%'
);

-- Group 7: Teknik Proses & Perancangan Pabrik
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Process Engineering', 'Plant Design', 'Unit Operations', 'Process Optimization'],
  h_index = 11,
  publication_count = 38
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Sapta Raharja%' OR name LIKE '%Muslich%'
);

-- Group 8: Ekonomi & Analisis Kelayakan
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Techno-Economic Analysis', 'Feasibility Study', 'Agribusiness', 'Rural Development'],
  h_index = 13,
  publication_count = 42
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Tajuddin Bantacut%' OR name LIKE '%Anas Miftah%'
);

-- Group 9: Ergonomi & Keselamatan Kerja
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Ergonomics', 'Occupational Safety', 'Human Factors', 'Work System Design'],
  h_index = 9,
  publication_count = 28
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Moh. Yani%' OR name LIKE '%Sugiarto%'
);

-- Group 10: Teknologi Hasil Pertanian
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing'],
  h_index = 10,
  publication_count = 35
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%Erliza%' OR name LIKE '%Yandra%'
);

-- Default untuk yang belum ter-cover (junior lecturers)
UPDATE assessor_profiles SET 
  research_areas = ARRAY['Agricultural Engineering', 'Food Science', 'Industrial Technology'],
  h_index = 5,
  publication_count = 15
WHERE research_areas IS NULL OR array_length(research_areas, 1) IS NULL;

-- Update last_synced_at
UPDATE assessor_profiles SET last_synced_at = CURRENT_TIMESTAMP;
