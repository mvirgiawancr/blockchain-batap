-- 005-add-enrollment-columns.sql
-- Track Fabric CA enrollment identity per user.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS enrollment_secret TEXT,
  ADD COLUMN IF NOT EXISTS cert_expires_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_enrollment_id
  ON users(enrollment_id)
  WHERE enrollment_id IS NOT NULL;

COMMENT ON COLUMN users.enrollment_id IS 'Fabric CA enrollment ID (username used during ca.register). Unique per CA org.';
COMMENT ON COLUMN users.enrollment_secret IS 'Encrypted enrollment secret returned by Fabric CA register. Stored as {encrypted, iv} JSON.';
COMMENT ON COLUMN users.cert_expires_at IS 'Expiry of the enrolled X.509 certificate. NULL if never enrolled.';
