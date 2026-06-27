-- 003-registration-requests.sql
-- UPPS self-registration schema: pending requests, multi-prodi, documents, approved user_program_studi
BEGIN;

CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upps_name VARCHAR(255) NOT NULL,
  highest_leader_name VARCHAR(255) NOT NULL,
  account_pj_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  approved_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_username ON registration_requests(username);
CREATE INDEX IF NOT EXISTS idx_registration_requests_institution ON registration_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created ON registration_requests(created_at);

CREATE TABLE IF NOT EXISTS registration_request_prodi (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES registration_requests(id) ON DELETE CASCADE,
  jenjang_code VARCHAR(10) NOT NULL REFERENCES jenjang(code),
  program_studi_id INTEGER NOT NULL REFERENCES program_studi(id),
  ketua_prodi VARCHAR(255) NOT NULL,
  letak_prodi VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, program_studi_id, jenjang_code)
);

CREATE INDEX IF NOT EXISTS idx_rrp_request ON registration_request_prodi(request_id);

CREATE TABLE IF NOT EXISTS registration_request_documents (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES registration_requests(id) ON DELETE CASCADE,
  template_code VARCHAR(100) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  pinata_cid VARCHAR(100) NOT NULL,
  pinata_url TEXT NOT NULL,
  similarity_score DECIMAL(6,4) NOT NULL,
  threshold DECIMAL(4,3) NOT NULL,
  is_valid BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rrd_request ON registration_request_documents(request_id);

CREATE TABLE IF NOT EXISTS user_program_studi (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jenjang_code VARCHAR(10) NOT NULL REFERENCES jenjang(code),
  program_studi_id INTEGER NOT NULL REFERENCES program_studi(id),
  ketua_prodi VARCHAR(255),
  letak_prodi VARCHAR(500),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, program_studi_id, jenjang_code)
);

CREATE INDEX IF NOT EXISTS idx_ups_user ON user_program_studi(user_id);

COMMENT ON TABLE registration_requests IS 'Pending/approved/rejected UPPS self-registration requests';
COMMENT ON TABLE registration_request_prodi IS 'Multi-prodi entries attached to a pending registration_request';
COMMENT ON TABLE registration_request_documents IS 'Validated documents (Pinata IPFS archived)';
COMMENT ON TABLE user_program_studi IS 'Multi-prodi linked to an approved UPPS user';

COMMIT;
