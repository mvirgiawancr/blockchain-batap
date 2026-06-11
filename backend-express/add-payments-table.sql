-- Migration: Add accreditation_payments table
-- This table tracks the full payment lifecycle:
--   1. Sekretariat creates invoice (status='invoiced')
--   2. UPPS uploads proof of payment (status='submitted')
--   3. Sekretariat verifies (status='verified' or 'rejected')

CREATE TABLE IF NOT EXISTS accreditation_payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    submission_id VARCHAR(255),
    upps_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    upps_name VARCHAR(255),
    institution VARCHAR(255),
    program_studi VARCHAR(255),
    
    -- Invoice details (created by Sekretariat)
    invoice_number VARCHAR(100) UNIQUE,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    due_date DATE,
    invoiced_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invoiced_at TIMESTAMP,
    
    -- Payment proof (uploaded by UPPS)
    proof_filename VARCHAR(255),
    proof_cid TEXT,         -- IPFS CID if stored on IPFS
    proof_url TEXT,         -- direct URL / local path
    payment_method VARCHAR(100),  -- e.g., 'Transfer Bank BNI', 'Virtual Account'
    paid_at TIMESTAMP,
    
    -- Verification (by Sekretariat)
    status VARCHAR(30) DEFAULT 'invoiced' CHECK (status IN ('invoiced', 'submitted', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accreditation_payments_payment_id ON accreditation_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_payments_upps_user_id ON accreditation_payments(upps_user_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_payments_status ON accreditation_payments(status);
CREATE INDEX IF NOT EXISTS idx_accreditation_payments_invoice_number ON accreditation_payments(invoice_number);

DROP TRIGGER IF EXISTS update_accreditation_payments_updated_at ON accreditation_payments;
CREATE TRIGGER update_accreditation_payments_updated_at 
  BEFORE UPDATE ON accreditation_payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE accreditation_payments IS 'Accreditation payment lifecycle: invoice → proof upload → verification';
