-- ═══════════════════════════════════════════════════════════
-- 004 — Add email column to users (for UPPS self-registration)
-- ═══════════════════════════════════════════════════════════
-- Background: registrationService.approveRequest() INSERTs email into
-- users, but the column didn't exist before. This migration adds it
-- so the UPPS approval flow can persist the contact email used for
-- ongoing notifications (certificate release, AL scheduling, etc).

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Unique constraint — one account per email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON COLUMN users.email IS 'Contact email — populated for UPPS via self-registration; nullable for legacy admin-created accounts';

COMMIT;
