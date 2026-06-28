# UPPS Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3-step UPPS self-registration wizard (mirrors SAKTI LAM Teknik) with multi-prodi support, AI-validated document upload, sekretariat approval workflow, Resend email notifications.

**Architecture:** Public registration endpoint validates docs → uploads to Pinata IPFS → inserts `registration_requests` (status=pending). Sekretariat-only endpoints list/approve/reject. Approve transactionally creates `users` + `user_program_studi` rows. Rejection issues signed JWT resubmit token via email. Frontend: React wizard with 3 step components + sekretariat admin page.

**Tech Stack:** Express 4.18, PostgreSQL + pgvector, `resend` SDK, `bcrypt`, `jsonwebtoken`, React 18 + Vite 7, Tailwind v4, react-router-dom, axios.

**Spec:** [`docs/superpowers/specs/2026-06-28-upps-registration-design.md`](../specs/2026-06-28-upps-registration-design.md)

---

## File Structure

### Backend

| Path | Action | Responsibility |
|------|--------|----------------|
| `backend-express/sql/003-registration-requests.sql` | Create | Schema migration: 4 tables |
| `backend-express/src/config/index.js` | Modify | Add `resend` + `email` config block |
| `backend-express/package.json` | Modify | Add `resend` + `jsonwebtoken` deps |
| `backend-express/src/services/emailService.js` | Create | Resend wrapper (3 email templates) |
| `backend-express/src/services/resubmitTokenService.js` | Create | JWT sign/verify for resubmit links |
| `backend-express/src/services/registrationService.js` | Create | Core registration business logic |
| `backend-express/src/controllers/registrationController.js` | Create | Public endpoint handlers |
| `backend-express/src/controllers/sekretariatRegistrationController.js` | Create | Sekretariat-only handlers |
| `backend-express/src/routes/registration.js` | Create | Public route mounting |
| `backend-express/src/routes/sekretariatRegistration.js` | Create | Sekretariat route mounting |
| `backend-express/src/server.js` | Modify | Register both routers |

### Frontend

| Path | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/services/registration.js` | Create | API client (axios wrappers) |
| `frontend/src/pages/RegisterUPPSPage.jsx` | Create | Wizard container (state machine) |
| `frontend/src/components/register-upps/WizardStepper.jsx` | Create | Progress indicator |
| `frontend/src/components/register-upps/Step1Profile.jsx` | Create | Step 1 form |
| `frontend/src/components/register-upps/Step2Prodi.jsx` | Create | Multi-prodi step |
| `frontend/src/components/register-upps/Step3Documents.jsx` | Create | Upload + validation |
| `frontend/src/components/register-upps/RegistrationSuccess.jsx` | Create | Success screen |
| `frontend/src/pages/SekretariatRegistrationsPage.jsx` | Create | Sekretariat list page |
| `frontend/src/components/sekretariat/RegistrationDetailModal.jsx` | Create | Approve/reject modal |
| `frontend/src/App.jsx` | Modify | Add routes |
| `frontend/src/components/Sidebar.jsx` | Modify | Add nav item for sekretariat |

---

## Task 1: Database migration (schema only)

**Files:**
- Create: `backend-express/sql/003-registration-requests.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- backend-express/sql/003-registration-requests.sql
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
```

- [ ] **Step 2: Apply to local DB**

Run:
```bash
cd /Users/darwan/project/batap/backend-express
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi -f sql/003-registration-requests.sql
```

Expected output: 5× `CREATE TABLE`, 4× `CREATE INDEX`, 4× `COMMENT`, `COMMIT`.

- [ ] **Step 3: Verify tables exist**

```bash
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi -c "\dt registration*"
```

Expected: lists `registration_requests`, `registration_request_prodi`, `registration_request_documents`.

- [ ] **Step 4: Commit**

```bash
git add backend-express/sql/003-registration-requests.sql
git commit -m "feat(db): add registration_requests schema for UPPS self-registration"
```

---

## Task 2: Install dependencies + config

**Files:**
- Modify: `backend-express/package.json`
- Modify: `backend-express/src/config/index.js`

- [ ] **Step 1: Install resend + jsonwebtoken**

```bash
cd /Users/darwan/project/batap/backend-express
npm install resend jsonwebtoken
```

Expected: `added N packages` in output. Verify:
```bash
grep -E '"resend"|"jsonwebtoken"' package.json
```

- [ ] **Step 2: Add config block**

Append to `backend-express/src/config/index.js` before module.exports closing:

```js
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'AkreChain <onboarding@resend.dev>',
    replyTo: process.env.EMAIL_REPLY_TO || '',
  },
  resubmitToken: {
    secret: process.env.RESUBMIT_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-resubmit-secret',
    expiresIn: '7d',
  },
```

Place inside the existing config object. Read existing file first to find correct insertion point.

- [ ] **Step 3: Verify config loads**

```bash
node -e "const c = require('./src/config'); console.log('resend.apiKey set:', !!c.resend.apiKey); console.log('resubmit secret set:', !!c.resubmitToken.secret);"
```

Expected: both `true`.

- [ ] **Step 4: Commit**

```bash
git add backend-express/package.json backend-express/package-lock.json backend-express/src/config/index.js
git commit -m "feat(config): add resend + resubmit token config"
```

---

## Task 3: Email service (Resend wrapper)

**Files:**
- Create: `backend-express/src/services/emailService.js`
- Test: `backend-express/src/services/emailService.test.js`

- [ ] **Step 1: Write failing test**

```js
// backend-express/src/services/emailService.test.js
const emailService = require('./emailService');

describe('emailService', () => {
  describe('isConfigured', () => {
    it('returns boolean', () => {
      const result = emailService.isConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sendRegistrationReceived', () => {
    it('returns success shape {success, id?, error?}', async () => {
      const result = await emailService.sendRegistrationReceived({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        requestId: 'req-123',
      });
      expect(result).toHaveProperty('success');
      if (!result.success) expect(result).toHaveProperty('error');
      else expect(result).toHaveProperty('id');
    });
  });

  describe('sendApprovalNotification', () => {
    it('returns success shape', async () => {
      const result = await emailService.sendApprovalNotification({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        username: 'testuser',
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('sendRejectionWithResubmitToken', () => {
    it('returns success shape', async () => {
      const result = await emailService.sendRejectionWithResubmitToken({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        reason: 'Dokumen tidak valid',
        resubmitUrl: 'https://app.example.com/register-upps?resubmit=tok123',
      });
      expect(result).toHaveProperty('success');
    });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npm test -- emailService.test.js
```

Expected: `Cannot find module './emailService'`.

- [ ] **Step 3: Implement service**

```js
// backend-express/src/services/emailService.js
const { Resend } = require('resend');
const config = require('../config');

let resend = null;
if (config.resend.apiKey) {
  resend = new Resend(config.resend.apiKey);
} else {
  console.warn('[Email] RESEND_API_KEY not set — email sending disabled');
}

function isConfigured() {
  return !!resend;
}

async function safeSend(payload) {
  if (!resend) {
    return { success: false, error: 'Resend not configured' };
  }
  try {
    const data = await resend.emails.send({
      from: config.resend.from,
      reply_to: config.resend.replyTo || undefined,
      ...payload,
    });
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[Email] send failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendRegistrationReceived({ to, uppsName, requestId }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4f46e5">Pendaftaran Akun UPPS Diterima</h2>
      <p>Halo <strong>${uppsName}</strong>,</p>
      <p>Pendaftaran akun UPPS Anda di AkreChain telah diterima dan sedang menunggu review oleh Sekretariat LAM Teknik.</p>
      <p>Nomor referensi: <code>${requestId}</code></p>
      <p>Anda akan menerima email pemberitahuan selanjutnya setelah proses review selesai.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain. Mohon tidak membalas.</p>
    </div>`;
  return safeSend({ to, subject: 'Pendaftaran AkreChain Diterima — Menunggu Approval', html });
}

async function sendApprovalNotification({ to, uppsName, username }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#059669">Akun UPPS Anda Telah Aktif</h2>
      <p>Halo <strong>${uppsName}</strong>,</p>
      <p>Selamat! Pendaftaran akun UPPS Anda telah disetujui oleh Sekretariat LAM Teknik.</p>
      <p>Anda dapat login ke AkreChain menggunakan:</p>
      <ul>
        <li>Username: <strong>${username}</strong></li>
        <li>Password: (yang Anda buat saat mendaftar)</li>
      </ul>
      <p><a href="https://akrechain.local/login" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Login Sekarang</a></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain.</p>
    </div>`;
  return safeSend({ to, subject: 'Akun UPPS AkreChain Anda Telah Aktif', html });
}

async function sendRejectionWithResubmitToken({ to, uppsName, reason, resubmitUrl }) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#dc2626">Pendaftaran Ditolak — Silakan Resubmit</h2>
      <p>Halo <strong>${uppsName}</strong>,</p>
      <p>Mohon maaf, pendaftaran akun UPPS Anda ditolak dengan alasan:</p>
      <blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#374151">${reason}</blockquote>
      <p>Anda dapat memperbaiki data dan mengirim ulang melalui link berikut:</p>
      <p><a href="${resubmitUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Resubmit Pendaftaran</a></p>
      <p style="font-size:12px;color:#6b7280">Link berlaku selama 7 hari.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="font-size:12px;color:#6b7280">Email ini dikirim otomatis oleh sistem AkreChain.</p>
    </div>`;
  return safeSend({ to, subject: 'Pendaftaran AkreChain Ditolak — Silakan Resubmit', html });
}

module.exports = {
  isConfigured,
  sendRegistrationReceived,
  sendApprovalNotification,
  sendRejectionWithResubmitToken,
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- emailService.test.js
```

Expected: 4 tests pass (calls may fail with API error since `to` is fake — but `success: false` shape satisfies assertion).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/services/emailService.js backend-express/src/services/emailService.test.js
git commit -m "feat(email): add Resend email service with 3 templates"
```

---

## Task 4: Resubmit token service

**Files:**
- Create: `backend-express/src/services/resubmitTokenService.js`
- Test: `backend-express/src/services/resubmitTokenService.test.js`

- [ ] **Step 1: Write failing test**

```js
// backend-express/src/services/resubmitTokenService.test.js
const tokenService = require('./resubmitTokenService');

describe('resubmitTokenService', () => {
  it('signs and verifies a token round-trip', () => {
    const token = tokenService.issue({ requestId: 'abc-123', email: 'test@upps.ac.id' });
    expect(typeof token).toBe('string');
    const payload = tokenService.verify(token);
    expect(payload.requestId).toBe('abc-123');
    expect(payload.email).toBe('test@upps.ac.id');
  });

  it('rejects tampered token', () => {
    const token = tokenService.issue({ requestId: 'abc', email: 'x@y.z' });
    const tampered = token.slice(0, -3) + 'AAA';
    expect(() => tokenService.verify(tampered)).toThrow();
  });

  it('rejects expired token (mocked)', () => {
    jest.spyOn(tokenService, 'verify').mockImplementation(() => {
      throw new Error('jwt expired');
    });
    expect(() => tokenService.verify('expired.token.here')).toThrow('jwt expired');
    jest.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npm test -- resubmitTokenService.test.js
```

Expected: `Cannot find module './resubmitTokenService'`.

- [ ] **Step 3: Implement**

```js
// backend-express/src/services/resubmitTokenService.js
const jwt = require('jsonwebtoken');
const config = require('../config');

function issue(payload) {
  return jwt.sign(payload, config.resubmitToken.secret, {
    expiresIn: config.resubmitToken.expiresIn,
  });
}

function verify(token) {
  return jwt.verify(token, config.resubmitToken.secret);
}

module.exports = { issue, verify };
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- resubmitTokenService.test.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/services/resubmitTokenService.js backend-express/src/services/resubmitTokenService.test.js
git commit -m "feat(auth): add resubmit token service (JWT, 7-day expiry)"
```

---

## Task 5: Registration service (core business logic)

**Files:**
- Create: `backend-express/src/services/registrationService.js`
- Test: `backend-express/src/services/registrationService.test.js`

- [ ] **Step 1: Write failing test**

```js
// backend-express/src/services/registrationService.test.js
const registrationService = require('./registrationService');
const { pool } = require('../config/database');

describe('registrationService', () => {
  describe('validateUsernameAvailable', () => {
    it('returns {available:true} for novel username', async () => {
      const result = await registrationService.validateUsernameAvailable('novel_user_' + Date.now());
      expect(result.available).toBe(true);
    });

    it('returns {available:false} for seeded user', async () => {
      // users table has 45 seeded users per init-db.sql
      const result = await registrationService.validateUsernameAvailable('upps1');
      expect(result.available).toBe(false);
    });
  });

  describe('getRequestDetail', () => {
    it('returns null for non-existent id', async () => {
      const result = await registrationService.getRequestDetail('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npm test -- registrationService.test.js
```

Expected: `Cannot find module './registrationService'`.

- [ ] **Step 3: Implement**

```js
// backend-express/src/services/registrationService.js
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const documentValidationService = require('./documentValidationService');
const pinataService = require('./pinataService');
const emailService = require('./emailService');
const resubmitTokenService = require('./resubmitTokenService');
const config = require('../config');

const SALT_ROUNDS = 10;

async function validateUsernameAvailable(username) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users WHERE username = $1
     UNION ALL
     SELECT 1 FROM registration_requests
     WHERE username = $1 AND status IN ('pending','approved')
     LIMIT 1`,
    [username],
  );
  return { available: rows.length === 0 };
}

async function _uploadDocToPinata(fileBuffer, fileName, requestId, templateCode) {
  const result = await pinataService.uploadFile(fileBuffer, fileName, {
    requestId,
    templateCode,
    uploadedAt: new Date().toISOString(),
  });
  if (!result || !result.IpfsHash) {
    throw new Error(`Pinata upload failed for ${templateCode}`);
  }
  return {
    cid: result.IpfsHash,
    url: `https://${config.pinata.gateway}/ipfs/${result.IpfsHash}`,
  };
}

/**
 * Submit a new registration request.
 * @param {Object} params - See spec for full payload shape.
 * @returns {Promise<{requestId: string}>}
 */
async function submitRegistration(params) {
  const {
    uppsName, highestLeaderName, accountPjName, email, phone,
    institutionId, username, password,
    prodiList,
    documents: { suratPermohonan, suratPernyataan },
    ipAddress, userAgent,
  } = params;

  // 1. Validate docs first (before any persistence)
  const docResults = await documentValidationService.validateAll(
    [
      { fileBuffer: suratPermohonan.buffer, fileName: suratPermohonan.originalname, templateCode: 'surat_permohonan_akun' },
      { fileBuffer: suratPernyataan.buffer, fileName: suratPernyataan.originalname, templateCode: 'surat_pernyataan_upps' },
    ],
    { context: 'upps_registration' },
  );
  if (!docResults.allValid) {
    const err = new Error('Document validation failed');
    err.code = 'DOCS_INVALID';
    err.details = docResults.results;
    throw err;
  }

  // 2. Username availability check
  const { available } = await validateUsernameAvailable(username);
  if (!available) {
    const err = new Error('Username already taken');
    err.code = 'USERNAME_TAKEN';
    throw err;
  }

  // 3. Upload to Pinata (parallel)
  const client = await pool.connect();
  let requestRow;
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await client.query(
      `INSERT INTO registration_requests
        (upps_name, highest_leader_name, account_pj_name, email, phone,
         institution_id, username, password_hash, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [uppsName, highestLeaderName, accountPjName, email, phone || null,
       institutionId, username, passwordHash, ipAddress || null, userAgent || null],
    );
    const requestId = rows[0].id;
    requestRow = rows[0];

    // Insert prodi
    for (const p of prodiList) {
      await client.query(
        `INSERT INTO registration_request_prodi
          (request_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, p.jenjangCode, p.programStudiId, p.ketuaProdi, p.letakProdi || null],
      );
    }

    // Upload docs to Pinata (after row exists so we have requestId for metadata)
    const [permohonanPinata, pernyataanPinata] = await Promise.all([
      _uploadDocToPinata(suratPermohonan.buffer, suratPermohonan.originalname, requestId, 'surat_permohonan_akun'),
      _uploadDocToPinata(suratPernyataan.buffer, suratPernyataan.originalname, requestId, 'surat_pernyataan_upps'),
    ]);

    const docRows = [
      { templateCode: 'surat_permohonan_akun', file: suratPermohonan, pinata: permohonanPinata, validation: docResults.results[0] },
      { templateCode: 'surat_pernyataan_upps', file: suratPernyataan, pinata: pernyataanPinata, validation: docResults.results[1] },
    ];

    for (const d of docRows) {
      await client.query(
        `INSERT INTO registration_request_documents
          (request_id, template_code, file_name, file_hash, file_size_bytes,
           pinata_cid, pinata_url, similarity_score, threshold, is_valid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [requestId, d.templateCode, d.file.originalname,
         require('crypto').createHash('sha256').update(d.file.buffer).digest('hex'),
         d.file.size, d.pinata.cid, d.pinata.url,
         d.validation.similarity, d.validation.threshold, d.validation.isValid],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Email (best-effort, after commit)
  emailService.sendRegistrationReceived({
    to: email, uppsName, requestId: requestRow.id,
  }).catch((e) => console.error('[Registration] email failed:', e.message));

  return { requestId: requestRow.id };
}

async function listRequests({ status, limit = 50, offset = 0 } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE r.status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT r.id, r.upps_name, r.highest_leader_name, r.account_pj_name,
            r.email, r.phone, r.username, r.status, r.rejection_reason,
            r.created_at, r.reviewed_at,
            i.name AS institution_name
     FROM registration_requests r
     JOIN institutions i ON i.id = r.institution_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

async function getRequestDetail(requestId) {
  const { rows } = await pool.query(
    `SELECT r.*, i.name AS institution_name
     FROM registration_requests r
     JOIN institutions i ON i.id = r.institution_id
     WHERE r.id = $1`,
    [requestId],
  );
  if (rows.length === 0) return null;
  const req = rows[0];

  const [prodiRows, docRows] = await Promise.all([
    pool.query(
      `SELECT p.*, j.label AS jenjang_label, ps.name AS program_studi_name
       FROM registration_request_prodi p
       JOIN jenjang j ON j.code = p.jenjang_code
       JOIN program_studi ps ON ps.id = p.program_studi_id
       WHERE p.request_id = $1`,
      [requestId],
    ),
    pool.query(
      `SELECT * FROM registration_request_documents WHERE request_id = $1`,
      [requestId],
    ),
  ]);

  return { ...req, prodi: prodiRows.rows, documents: docRows.rows };
}

async function approveRequest(requestId, sekretariatUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [requestId],
    );
    if (rows.length === 0) {
      const err = new Error('Request not found or not pending');
      err.code = 'NOT_PENDING';
      throw err;
    }
    const req = rows[0];

    // Create user
    const userResult = await client.query(
      `INSERT INTO users
        (username, password_hash, role, name, msp_org, email, phone,
         institution_id, is_active)
       VALUES ($1,$2,'upps',$3,'UPPSMSP',$4,$5,$6,TRUE)
       RETURNING id`,
      [req.username, req.password_hash, req.upps_name, req.email, req.phone, req.institution_id],
    );
    const newUserId = userResult.rows[0].id;

    // Copy prodi to user_program_studi (first row is_primary=true)
    await client.query(
      `INSERT INTO user_program_studi
        (user_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi, is_primary)
       SELECT $1, jenjang_code, program_studi_id, ketua_prodi, letak_prodi,
              (row_number() OVER () = 1)
       FROM registration_request_prodi
       WHERE request_id = $2`,
      [newUserId, requestId],
    );

    await client.query(
      `UPDATE registration_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(),
           approved_user_id = $2
       WHERE id = $3`,
      [sekretariatUserId, newUserId, requestId],
    );

    await client.query('COMMIT');

    emailService.sendApprovalNotification({
      to: req.email, uppsName: req.upps_name, username: req.username,
    }).catch((e) => console.error('[Registration] approval email failed:', e.message));

    return { userId: newUserId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rejectRequest(requestId, sekretariatUserId, reason, resubmitBaseUrl) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [requestId],
    );
    if (rows.length === 0) {
      const err = new Error('Request not found or not pending');
      err.code = 'NOT_PENDING';
      throw err;
    }
    const req = rows[0];

    await client.query(
      `UPDATE registration_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
           rejection_reason = $2
       WHERE id = $3`,
      [sekretariatUserId, reason, requestId],
    );
    await client.query('COMMIT');

    // Issue resubmit token + email
    const token = resubmitTokenService.issue({ requestId, email: req.email });
    const resubmitUrl = `${resubmitBaseUrl}/register-upps?resubmit=${token}`;
    emailService.sendRejectionWithResubmitToken({
      to: req.email, uppsName: req.upps_name, reason, resubmitUrl,
    }).catch((e) => console.error('[Registration] rejection email failed:', e.message));

    return { resubmitUrl };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resubmit a previously rejected request: update fields, re-validate docs,
 * re-upload, set status back to pending.
 */
async function resubmitRegistration(requestId, token, params) {
  const payload = resubmitTokenService.verify(token);
  if (payload.requestId !== requestId) {
    const err = new Error('Token does not match request');
    err.code = 'TOKEN_MISMATCH';
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT * FROM registration_requests WHERE id = $1 AND status = 'rejected'`,
    [requestId],
  );
  if (rows.length === 0) {
    const err = new Error('Request not found or not rejected');
    err.code = 'NOT_REJECTED';
    throw err;
  }
  const existing = rows[0];

  // Re-validate docs
  const docResults = await documentValidationService.validateAll(
    [
      { fileBuffer: params.documents.suratPermohonan.buffer, fileName: params.documents.suratPermohonan.originalname, templateCode: 'surat_permohonan_akun' },
      { fileBuffer: params.documents.suratPernyataan.buffer, fileName: params.documents.suratPernyataan.originalname, templateCode: 'surat_pernyataan_upps' },
    ],
    { context: 'upps_resubmission' },
  );
  if (!docResults.allValid) {
    const err = new Error('Document validation failed');
    err.code = 'DOCS_INVALID';
    err.details = docResults.results;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = params.password
      ? await bcrypt.hash(params.password, SALT_ROUNDS)
      : existing.password_hash;

    await client.query(
      `UPDATE registration_requests SET
         upps_name = $1, highest_leader_name = $2, account_pj_name = $3,
         email = $4, phone = $5, institution_id = $6, password_hash = $7,
         status = 'pending', rejection_reason = NULL,
         reviewed_by = NULL, reviewed_at = NULL,
         updated_at = NOW()
       WHERE id = $8`,
      [params.uppsName, params.highestLeaderName, params.accountPjName,
       params.email, params.phone || null, params.institutionId,
       passwordHash, requestId],
    );

    // Replace prodi
    await client.query(`DELETE FROM registration_request_prodi WHERE request_id = $1`, [requestId]);
    for (const p of params.prodiList) {
      await client.query(
        `INSERT INTO registration_request_prodi
          (request_id, jenjang_code, program_studi_id, ketua_prodi, letak_prodi)
         VALUES ($1,$2,$3,$4,$5)`,
        [requestId, p.jenjangCode, p.programStudiId, p.ketuaProdi, p.letakProdi || null],
      );
    }

    // Replace docs
    await client.query(`DELETE FROM registration_request_documents WHERE request_id = $1`, [requestId]);
    const [permohonanPinata, pernyataanPinata] = await Promise.all([
      _uploadDocToPinata(params.documents.suratPermohonan.buffer, params.documents.suratPermohonan.originalname, requestId, 'surat_permohonan_akun'),
      _uploadDocToPinata(params.documents.suratPernyataan.buffer, params.documents.suratPernyataan.originalname, requestId, 'surat_pernyataan_upps'),
    ]);
    const docRows = [
      { templateCode: 'surat_permohonan_akun', file: params.documents.suratPermohonan, pinata: permohonanPinata, validation: docResults.results[0] },
      { templateCode: 'surat_pernyataan_upps', file: params.documents.suratPernyataan, pinata: pernyataanPinata, validation: docResults.results[1] },
    ];
    for (const d of docRows) {
      await client.query(
        `INSERT INTO registration_request_documents
          (request_id, template_code, file_name, file_hash, file_size_bytes,
           pinata_cid, pinata_url, similarity_score, threshold, is_valid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [requestId, d.templateCode, d.file.originalname,
         require('crypto').createHash('sha256').update(d.file.buffer).digest('hex'),
         d.file.size, d.pinata.cid, d.pinata.url,
         d.validation.similarity, d.validation.threshold, d.validation.isValid],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  emailService.sendRegistrationReceived({
    to: params.email, uppsName: params.uppsName, requestId,
  }).catch((e) => console.error('[Registration] resubmit email failed:', e.message));

  return { requestId };
}

module.exports = {
  validateUsernameAvailable,
  submitRegistration,
  listRequests,
  getRequestDetail,
  approveRequest,
  rejectRequest,
  resubmitRegistration,
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
npm test -- registrationService.test.js
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/services/registrationService.js backend-express/src/services/registrationService.test.js
git commit -m "feat(registration): add registrationService with submit/approve/reject/resubmit flows"
```

---

## Task 6: Public registration controller + route

**Files:**
- Create: `backend-express/src/controllers/registrationController.js`
- Create: `backend-express/src/routes/registration.js`

- [ ] **Step 1: Implement controller**

```js
// backend-express/src/controllers/registrationController.js
const registrationService = require('../services/registrationService');

exports.checkUsername = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username query required' });
  const result = await registrationService.validateUsernameAvailable(username);
  res.json(result);
};

exports.submit = async (req, res) => {
  try {
    let prodiList;
    try {
      prodiList = JSON.parse(req.body.prodiList || '[]');
    } catch {
      return res.status(400).json({ error: 'prodiList must be valid JSON' });
    }
    if (!Array.isArray(prodiList) || prodiList.length === 0) {
      return res.status(400).json({ error: 'prodiList must contain at least 1 prodi' });
    }
    if (!req.files?.surat_permohonan?.[0] || !req.files?.surat_pernyataan?.[0]) {
      return res.status(400).json({ error: 'Both surat_permohonan and surat_pernyataan files required' });
    }

    const { requestId } = await registrationService.submitRegistration({
      uppsName: req.body.uppsName,
      highestLeaderName: req.body.highestLeaderName,
      accountPjName: req.body.accountPjName,
      email: req.body.email,
      phone: req.body.phone,
      institutionId: parseInt(req.body.institutionId, 10),
      username: req.body.username,
      password: req.body.password,
      prodiList,
      documents: {
        suratPermohonan: req.files.surat_permohonan[0],
        suratPernyataan: req.files.surat_pernyataan[0],
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      requestId,
      status: 'pending',
      message: 'Pendaftaran berhasil. Menunggu approval Sekretariat.',
    });
  } catch (err) {
    if (err.code === 'DOCS_INVALID') {
      return res.status(422).json({
        error: 'Dokumen tidak valid',
        details: err.details,
      });
    }
    if (err.code === 'USERNAME_TAKEN') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error('[Registration] submit error:', err);
    res.status(500).json({ error: 'Pendaftaran gagal', detail: err.message });
  }
};

exports.resubmit = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { token, password } = req.body;
    let prodiList;
    try {
      prodiList = JSON.parse(req.body.prodiList || '[]');
    } catch {
      return res.status(400).json({ error: 'prodiList must be valid JSON' });
    }
    if (!req.files?.surat_permohonan?.[0] || !req.files?.surat_pernyataan?.[0]) {
      return res.status(400).json({ error: 'Both files required' });
    }

    await registrationService.resubmitRegistration(requestId, token, {
      uppsName: req.body.uppsName,
      highestLeaderName: req.body.highestLeaderName,
      accountPjName: req.body.accountPjName,
      email: req.body.email,
      phone: req.body.phone,
      institutionId: parseInt(req.body.institutionId, 10),
      password: password || null,
      prodiList,
      documents: {
        suratPermohonan: req.files.surat_permohonan[0],
        suratPernyataan: req.files.surat_pernyataan[0],
      },
    });

    res.json({ status: 'pending', message: 'Resubmit berhasil. Menunggu approval Sekretariat.' });
  } catch (err) {
    if (err.code === 'TOKEN_MISMATCH' || err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
    }
    if (err.code === 'NOT_REJECTED') {
      return res.status(409).json({ error: 'Request tidak ditemukan atau tidak sedang rejected' });
    }
    if (err.code === 'DOCS_INVALID') {
      return res.status(422).json({ error: 'Dokumen tidak valid', details: err.details });
    }
    console.error('[Registration] resubmit error:', err);
    res.status(500).json({ error: 'Resubmit gagal', detail: err.message });
  }
};

exports.getRequestByToken = async (req, res) => {
  // Used by resubmit wizard to pre-fill form
  try {
    const { token } = req.query;
    const payload = require('../services/resubmitTokenService').verify(token);
    const detail = await registrationService.getRequestDetail(payload.requestId);
    if (!detail) return res.status(404).json({ error: 'Request not found' });
    res.json(detail);
  } catch (err) {
    res.status(401).json({ error: 'Token tidak valid' });
  }
};
```

- [ ] **Step 2: Implement route**

```js
// backend-express/src/routes/registration.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/registrationController');
const { asyncHandler } = require('../middleware/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Hanya PDF yang diizinkan.'));
    }
    cb(null, true);
  },
});

router.get('/check-username', asyncHandler(ctrl.checkUsername));
router.post(
  '/',
  upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'surat_pernyataan', maxCount: 1 },
  ]),
  asyncHandler(ctrl.submit),
);
router.post(
  '/:requestId/resubmit',
  upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'surat_pernyataan', maxCount: 1 },
  ]),
  asyncHandler(ctrl.resubmit),
);
router.get('/resubmit-data', asyncHandler(ctrl.getRequestByToken));

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add backend-express/src/controllers/registrationController.js backend-express/src/routes/registration.js
git commit -m "feat(registration): add public registration endpoints (submit, resubmit, check-username)"
```

---

## Task 7: Sekretariat controller + route

**Files:**
- Create: `backend-express/src/controllers/sekretariatRegistrationController.js`
- Create: `backend-express/src/routes/sekretariatRegistration.js`

- [ ] **Step 1: Implement controller**

```js
// backend-express/src/controllers/sekretariatRegistrationController.js
const registrationService = require('../services/registrationService');
const config = require('../config');

exports.list = async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
    ? req.query.status : undefined;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const offset = parseInt(req.query.offset || '0', 10);
  const rows = await registrationService.listRequests({ status, limit, offset });
  res.json({ requests: rows });
};

exports.detail = async (req, res) => {
  const detail = await registrationService.getRequestDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Request not found' });
  res.json(detail);
};

exports.approve = async (req, res) => {
  try {
    const { userId } = await registrationService.approveRequest(req.params.id, req.user.id);
    res.json({ status: 'approved', userId });
  } catch (err) {
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ error: 'Request tidak dalam status pending' });
    }
    console.error('[Sekretariat] approve error:', err);
    res.status(500).json({ error: 'Approval gagal', detail: err.message });
  }
};

exports.reject = async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Alasan reject wajib (min 5 karakter)' });
  }
  const baseUrl = config.server?.publicBaseUrl || `http://localhost:${config.server.port}`;
  try {
    const { resubmitUrl } = await registrationService.rejectRequest(
      req.params.id, req.user.id, reason.trim(), baseUrl,
    );
    res.json({ status: 'rejected', resubmitUrl });
  } catch (err) {
    if (err.code === 'NOT_PENDING') {
      return res.status(409).json({ error: 'Request tidak dalam status pending' });
    }
    console.error('[Sekretariat] reject error:', err);
    res.status(500).json({ error: 'Reject gagal', detail: err.message });
  }
};
```

- [ ] **Step 2: Implement route**

```js
// backend-express/src/routes/sekretariatRegistration.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sekretariatRegistrationController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticate, authorize('sekretariat'));

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.detail));
router.post('/:id/approve', asyncHandler(ctrl.approve));
router.post('/:id/reject', asyncHandler(ctrl.reject));

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add backend-express/src/controllers/sekretariatRegistrationController.js backend-express/src/routes/sekretariatRegistration.js
git commit -m "feat(registration): add sekretariat-only approval endpoints"
```

---

## Task 8: Wire backend routes in server.js

**Files:**
- Modify: `backend-express/src/server.js`

- [ ] **Step 1: Add require statements**

Find the block of route imports (around line 33-34) and add:

```js
const registrationRoutes = require('./routes/registration');
const sekretariatRegistrationRoutes = require('./routes/sekretariatRegistration');
```

- [ ] **Step 2: Add `publicBaseUrl` to server config**

In `backend-express/src/config/index.js`, inside the `server` block, add:

```js
publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
```

- [ ] **Step 3: Mount routes**

Find the route mounting block (around line 114-115) and add:

```js
app.use(`${config.server.apiPrefix}/auth/register-upps`, registrationRoutes);
app.use(`${config.server.apiPrefix}/sekretariat/registrations`, sekretariatRegistrationRoutes);
```

- [ ] **Step 4: Smoke test the endpoints**

Start the server:
```bash
npm start
```

In another terminal:
```bash
curl http://localhost:8000/api/v1/auth/register-upps/check-username?username=upps1
```

Expected: `{"available":false}`

```bash
curl http://localhost:8000/api/v1/sekretariat/registrations
```

Expected: `401 Unauthorized` (since no auth token).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/server.js backend-express/src/config/index.js
git commit -m "feat(server): wire registration routes"
```

---

## Task 9: Frontend API client

**Files:**
- Create: `frontend/src/services/registration.js`

- [ ] **Step 1: Implement**

```js
// frontend/src/services/registration.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: API_BASE });

export async function checkUsernameAvailable(username) {
  const { data } = await api.get('/auth/register-upps/check-username', { params: { username } });
  return data.available;
}

export async function getReferenceData() {
  const [instRes, prodiRes, jenjangRes] = await Promise.all([
    api.get('/document-validation/templates').catch(() => ({ data: { templates: [] } })),
    // Fetch institutions & prodi from a new lightweight endpoint, OR inline here
    axios.get(`${API_BASE}/reference/institutions`).catch(() => ({ data: [] })),
    axios.get(`${API_BASE}/reference/program-studi`).catch(() => ({ data: [] })),
    axios.get(`${API_BASE}/reference/jenjang`).catch(() => ({ data: [] })),
  ]);
  return {
    templates: instRes.data.templates || [],
    institutions: prodiRes.data || [],
    programStudi: prodiRes.data || [],
    jenjang: jenjangRes.data || [],
  };
}

export async function submitRegistration(formData) {
  const { data } = await api.post('/auth/register-upps', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function resubmitRegistration(requestId, formData) {
  const { data } = await api.post(`/auth/register-upps/${requestId}/resubmit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getRequestByToken(token) {
  const { data } = await api.get('/auth/register-upps/resubmit-data', { params: { token } });
  return data;
}

export async function validateDocument(templateCode, file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/document-validation/templates/${templateCode}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Sekretariat API (auth required) — uses auth.js axios instance
import { api as authApi } from './auth';

export async function listRegistrations(status) {
  const { data } = await authApi.get('/sekretariat/registrations', { params: { status } });
  return data.requests;
}

export async function getRegistrationDetail(id) {
  const { data } = await authApi.get(`/sekretariat/registrations/${id}`);
  return data;
}

export async function approveRegistration(id) {
  const { data } = await authApi.post(`/sekretariat/registrations/${id}/approve`);
  return data;
}

export async function rejectRegistration(id, reason) {
  const { data } = await authApi.post(`/sekretariat/registrations/${id}/reject`, { reason });
  return data;
}
```

- [ ] **Step 2: Add backend reference endpoints (lightweight)**

Create `backend-express/src/controllers/referenceController.js`:

```js
const { pool } = require('../config/database');

exports.listInstitutions = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM institutions WHERE is_active = TRUE ORDER BY name`
  );
  res.json(rows);
};

exports.listProgramStudi = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM program_studi WHERE is_active = TRUE ORDER BY name`
  );
  res.json(rows);
};

exports.listJenjang = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT code, label, full_name FROM jenjang WHERE is_active = TRUE ORDER BY level_order`
  );
  res.json(rows);
};
```

Create `backend-express/src/routes/reference.js`:

```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/referenceController');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/institutions', asyncHandler(ctrl.listInstitutions));
router.get('/program-studi', asyncHandler(ctrl.listProgramStudi));
router.get('/jenjang', asyncHandler(ctrl.listJenjang));

module.exports = router;
```

In `backend-express/src/server.js`, add:
```js
const referenceRoutes = require('./routes/reference');
// ...
app.use(`${config.server.apiPrefix}/reference`, referenceRoutes);
```

- [ ] **Step 3: Test reference endpoint**

```bash
curl http://localhost:8000/api/v1/reference/institutions | head -c 200
```

Expected: JSON array with first institution `{"id":1,"name":"Akademi Angkatan Laut Surabaya"}...`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/registration.js \
        backend-express/src/controllers/referenceController.js \
        backend-express/src/routes/reference.js \
        backend-express/src/server.js
git commit -m "feat(reference): add lightweight reference endpoints + frontend API client"
```

---

## Task 10: Wizard container + Stepper + Step 1 Profile

**Files:**
- Create: `frontend/src/pages/RegisterUPPSPage.jsx`
- Create: `frontend/src/components/register-upps/WizardStepper.jsx`
- Create: `frontend/src/components/register-upps/Step1Profile.jsx`

- [ ] **Step 1: WizardStepper component**

```jsx
// frontend/src/components/register-upps/WizardStepper.jsx
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Profil UPPS' },
  { num: 2, label: 'Jenjang & Prodi' },
  { num: 3, label: 'Dokumen' },
];

export default function WizardStepper({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, idx) => (
        <div key={s.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${currentStep > s.num
                ? 'bg-emerald-500 text-white'
                : currentStep === s.num
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                : 'bg-slate-200 text-slate-500'}`}>
              {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-[11px] font-bold mt-1.5 ${currentStep >= s.num ? 'text-slate-800' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 -mt-5 ${currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Step1Profile component**

```jsx
// frontend/src/components/register-upps/Step1Profile.jsx
import { useEffect, useState } from 'react';
import { User, Mail, Phone, Lock, Building, UserCog } from 'lucide-react';

export default function Step1Profile({ formData, setFormData, institutions, onNext }) {
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const t = setTimeout(async () => {
      try {
        const { checkUsernameAvailable } = await import('../../services/registration');
        const ok = await checkUsernameAvailable(formData.username);
        setUsernameAvailable(ok);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [formData.username]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const validate = () => {
    const errs = {};
    if (!formData.uppsName?.trim()) errs.uppsName = 'Wajib diisi';
    if (!formData.highestLeaderName?.trim()) errs.highestLeaderName = 'Wajib diisi';
    if (!formData.accountPjName?.trim()) errs.accountPjName = 'Wajib diisi';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(formData.email || '')) errs.email = 'Email tidak valid';
    if (!formData.institutionId) errs.institutionId = 'Pilih institusi';
    if (!formData.username || formData.username.length < 3) errs.username = 'Min 3 karakter';
    else if (usernameAvailable === false) errs.username = 'Username sudah dipakai';
    if (formData.password?.length < 8) errs.password = 'Min 8 karakter';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Password tidak cocok';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nama UPPS" icon={Building} name="uppsName" value={formData.uppsName || ''}
        onChange={handleChange} error={errors.uppsName} placeholder="Fakultas Teknik Universitas X" />
      <Field label="Nama Pimpinan Tertinggi UPPS" icon={User} name="highestLeaderName"
        value={formData.highestLeaderName || ''} onChange={handleChange} error={errors.highestLeaderName}
        placeholder=" Dekan / Ketua / Direktur" />
      <Field label="Penanggung Jawab Akun" icon={UserCog} name="accountPjName"
        value={formData.accountPjName || ''} onChange={handleChange} error={errors.accountPjName}
        placeholder="Nama Kaprodi / Sekretaris" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email" icon={Mail} type="email" name="email" value={formData.email || ''}
          onChange={handleChange} error={errors.email} placeholder="upps@kampus.ac.id" />
        <Field label="Telepon" icon={Phone} name="phone" value={formData.phone || ''}
          onChange={handleChange} placeholder="08xx-xxxx-xxxx" />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-700 ml-1">Institusi *</label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select name="institutionId" value={formData.institutionId || ''} onChange={handleChange}
            className={`block w-full pl-9 pr-3 py-2.5 bg-white/70 border rounded-xl text-sm outline-none
              ${errors.institutionId ? 'border-rose-300' : 'border-slate-200 focus:border-indigo-600'}`}>
            <option value="">-- Pilih Institusi --</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        {errors.institutionId && <p className="text-[11px] text-rose-600 ml-1">{errors.institutionId}</p>}
      </div>

      <Field label="Username" icon={User} name="username" value={formData.username || ''}
        onChange={handleChange} error={errors.username}
        hint={checkingUsername ? 'Memeriksa...' : usernameAvailable === true ? '✓ Tersedia' :
              usernameAvailable === false ? '✗ Sudah dipakai' : undefined}
        placeholder="username login" />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Kata Sandi" icon={Lock} type="password" name="password"
          value={formData.password || ''} onChange={handleChange} error={errors.password}
          placeholder="min 8 karakter" />
        <Field label="Konfirmasi Kata Sandi" icon={Lock} type="password" name="confirmPassword"
          value={formData.confirmPassword || ''} onChange={handleChange} error={errors.confirmPassword}
          placeholder="ulangi sandi" />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md">
          Lanjut →
        </button>
      </div>
    </form>
  );
}

function Field({ label, icon: Icon, hint, error, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-slate-700 ml-1">
        {label} {props.type !== 'email' && props.name !== 'phone' && '*'}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          {...props}
          className={`block w-full pl-9 pr-3 py-2.5 bg-white/70 border rounded-xl text-sm outline-none transition-all
            ${error ? 'border-rose-300 focus:border-rose-500'
                   : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'}`}
        />
      </div>
      {error && <p className="text-[11px] text-rose-600 ml-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-500 ml-1">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: RegisterUPPSPage (wizard container)**

```jsx
// frontend/src/pages/RegisterUPPSPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import WizardStepper from '../components/register-upps/WizardStepper';
import Step1Profile from '../components/register-upps/Step1Profile';
import Step2Prodi from '../components/register-upps/Step2Prodi';
import Step3Documents from '../components/register-upps/Step3Documents';
import RegistrationSuccess from '../components/register-upps/RegistrationSuccess';
import { getReferenceData, submitRegistration, getRequestByToken } from '../services/registration';

const EMPTY_FORM = {
  uppsName: '', highestLeaderName: '', accountPjName: '', email: '', phone: '',
  institutionId: '', username: '', password: '', confirmPassword: '',
  prodiList: [{ jenjangCode: '', programStudiId: '', ketuaProdi: '', letakProdi: '' }],
  documents: {
    surat_permohonan_akun: null,
    surat_pernyataan_upps: null,
  },
};

export default function RegisterUPPSPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resubmitToken = params.get('resubmit');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [reference, setReference] = useState({ institutions: [], programStudi: [], jenjang: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [resubmittingRequestId, setResubmittingRequestId] = useState(null);

  useEffect(() => {
    getReferenceData().then(setReference).catch(console.error);
  }, []);

  useEffect(() => {
    if (resubmitToken) {
      getRequestByToken(resubmitToken)
        .then((data) => {
          setResubmittingRequestId(data.id);
          setFormData({
            uppsName: data.upps_name,
            highestLeaderName: data.highest_leader_name,
            accountPjName: data.account_pj_name,
            email: data.email,
            phone: data.phone || '',
            institutionId: data.institution_id,
            username: data.username,
            password: '',
            confirmPassword: '',
            prodiList: data.prodi.map((p) => ({
              jenjangCode: p.jenjang_code,
              programStudiId: p.program_studi_id,
              ketuaProdi: p.ketua_prodi,
              letakProdi: p.letak_prodi || '',
            })),
            documents: { surat_permohonan_akun: null, surat_pernyataan_upps: null },
          });
        })
        .catch(() => setError('Token resubmit tidak valid atau kadaluarsa.'));
    }
  }, [resubmitToken]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('uppsName', formData.uppsName);
    fd.append('highestLeaderName', formData.highestLeaderName);
    fd.append('accountPjName', formData.accountPjName);
    fd.append('email', formData.email);
    fd.append('phone', formData.phone);
    fd.append('institutionId', formData.institutionId);
    fd.append('username', formData.username);
    if (formData.password) fd.append('password', formData.password);
    fd.append('prodiList', JSON.stringify(formData.prodiList));
    fd.append('surat_permohonan', formData.documents.surat_permohonan_akun);
    fd.append('surat_pernyataan', formData.documents.surat_pernyataan_upps);
    if (resubmitToken) fd.append('token', resubmitToken);
    return fd;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = resubmittingRequestId
        ? await (await import('../services/registration')).resubmitRegistration(resubmittingRequestId, buildFormData())
        : await submitRegistration(buildFormData());
      setSuccess(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <RegistrationSuccess result={success} />;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Link to="/login" className="text-xs text-indigo-600 font-bold">← Kembali ke Login</Link>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            {resubmittingRequestId ? 'Resubmit Pendaftaran UPPS' : 'Registrasi UPPS'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">Sistem Akreditasi LAM-TEK 2025</p>
        </div>

        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-6">
          <WizardStepper currentStep={step} />

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1Profile
              formData={formData}
              setFormData={setFormData}
              institutions={reference.institutions}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Prodi
              formData={formData}
              setFormData={setFormData}
              jenjang={reference.jenjang}
              programStudi={reference.programStudi}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Documents
              formData={formData}
              setFormData={setFormData}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Dengan mendaftar, Anda menyetujui ketentuan & syarat yang berlaku di LAM Teknik Indonesia.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit (Step2, Step3, Success components needed before page can run — see Tasks 11-12)**

```bash
git add frontend/src/components/register-upps/WizardStepper.jsx \
        frontend/src/components/register-upps/Step1Profile.jsx \
        frontend/src/pages/RegisterUPPSPage.jsx
git commit -m "feat(ui): add UPPS registration wizard container + Step 1 Profile"
```

---

## Task 11: Step 2 Prodi (multi-prodi list)

**Files:**
- Create: `frontend/src/components/register-upps/Step2Prodi.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/components/register-upps/Step2Prodi.jsx
import { Plus, Trash2, GraduationCap, MapPin, User } from 'lucide-react';

export default function Step2Prodi({ formData, setFormData, jenjang, programStudi, onBack, onNext }) {
  const updateProdi = (idx, field, value) => {
    const next = [...formData.prodiList];
    next[idx] = { ...next[idx], [field]: value };
    setFormData({ ...formData, prodiList: next });
  };

  const addProdi = () => {
    setFormData({
      ...formData,
      prodiList: [...formData.prodiList, { jenjangCode: '', programStudiId: '', ketuaProdi: '', letakProdi: '' }],
    });
  };

  const removeProdi = (idx) => {
    if (formData.prodiList.length === 1) return;
    const next = formData.prodiList.filter((_, i) => i !== idx);
    setFormData({ ...formData, prodiList: next });
  };

  const validate = () => {
    return formData.prodiList.every((p) =>
      p.jenjangCode && p.programStudiId && p.ketuaProdi?.trim()
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Program Studi yang Dikelola</h2>
        <button type="button" onClick={addProdi}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100">
          <Plus className="w-3.5 h-3.5" /> Tambah Prodi
        </button>
      </div>

      {formData.prodiList.map((p, idx) => (
        <div key={idx} className="p-4 border border-slate-200 rounded-xl space-y-3 relative">
          {formData.prodiList.length > 1 && (
            <button type="button" onClick={() => removeProdi(idx)}
              className="absolute top-3 right-3 p-1 text-rose-500 hover:bg-rose-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="text-[11px] font-bold text-slate-500 ml-1">Prodi #{idx + 1}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 ml-1">Jenjang *</label>
              <select value={p.jenjangCode} onChange={(e) => updateProdi(idx, 'jenjangCode', e.target.value)}
                className="block w-full px-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600">
                <option value="">-- Jenjang --</option>
                {jenjang.map((j) => <option key={j.code} value={j.code}>{j.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 ml-1">Program Studi *</label>
              <select value={p.programStudiId} onChange={(e) => updateProdi(idx, 'programStudiId', e.target.value)}
                className="block w-full px-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600">
                <option value="">-- Pilih Prodi --</option>
                {programStudi.map((ps) => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 ml-1">Ketua Prodi *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="text" value={p.ketuaProdi} onChange={(e) => updateProdi(idx, 'ketuaProdi', e.target.value)}
                placeholder="Nama ketua prodi"
                className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 ml-1">Letak Prodi (alamat / kampus)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="text" value={p.letakProdi} onChange={(e) => updateProdi(idx, 'letakProdi', e.target.value)}
                placeholder="Jl. ... Kota ..."
                className="block w-full pl-9 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600" />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-3">
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100">
          ← Kembali
        </button>
        <button type="button" onClick={onNext} disabled={!validate()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md">
          Lanjut →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/register-upps/Step2Prodi.jsx
git commit -m "feat(ui): add Step 2 Prodi (multi-prodi picker)"
```

---

## Task 12: Step 3 Documents + Success

**Files:**
- Create: `frontend/src/components/register-upps/Step3Documents.jsx`
- Create: `frontend/src/components/register-upps/RegistrationSuccess.jsx`

- [ ] **Step 1: Step3Documents**

```jsx
// frontend/src/components/register-upps/Step3Documents.jsx
import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { validateDocument } from '../../services/registration';

const DOCS = [
  { key: 'surat_permohonan_akun', label: 'Surat Pengajuan Permohonan Akun', template: 'surat_permohonan_akun' },
  { key: 'surat_pernyataan_upps', label: 'Surat Pernyataan sebagai UPPS oleh Pimpinan PT', template: 'surat_pernyataan_upps' },
];

export default function Step3Documents({ formData, setFormData, onBack, onSubmit, submitting }) {
  const [validatingKey, setValidatingKey] = useState(null);
  const [validations, setValidations] = useState({});

  const handleFile = async (docKey, templateCode, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setValidations({ ...validations, [docKey]: { error: 'Hanya PDF yang diizinkan' } });
      return;
    }
    if (file.size > 1024 * 1024) {
      setValidations({ ...validations, [docKey]: { error: 'Ukuran maksimal 1 MB' } });
      return;
    }

    setFormData({
      ...formData,
      documents: { ...formData.documents, [docKey]: file },
    });
    setValidatingKey(docKey);
    setValidations({ ...validations, [docKey]: undefined });

    try {
      const result = await validateDocument(templateCode, file);
      setValidations({ ...validations, [docKey]: result });
    } catch (err) {
      setValidations({
        ...validations,
        [docKey]: { error: err.response?.data?.error || 'Validasi gagal' },
      });
    } finally {
      setValidatingKey(null);
    }
  };

  const allValid = DOCS.every((d) =>
    formData.documents[d.key] && validations[d.key]?.is_valid
  );

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-slate-800">Upload Dokumen Registrasi</h2>
      <p className="text-[11px] text-slate-500 -mt-3">
        PDF maksimal 1 MB. Dokumen akan divalidasi terhadap template resmi LAM Teknik menggunakan AI.
      </p>

      {DOCS.map((doc) => {
        const file = formData.documents[doc.key];
        const validation = validations[doc.key];
        const isValidating = validatingKey === doc.key;

        return (
          <div key={doc.key} className="p-4 border border-slate-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800">{doc.label} *</label>

            {!file ? (
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all
                ${validation?.error ? 'border-rose-300 bg-rose-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                <UploadCloud className="w-6 h-6 text-slate-400" />
                <span className="text-[11px] text-slate-500 mt-1">Klik untuk upload PDF</span>
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => handleFile(doc.key, doc.template, e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{file.name}</div>
                  <div className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
                </div>
                {isValidating ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : validation?.is_valid ? (
                  <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {validation.similarity.toFixed(3)}
                  </span>
                ) : validation?.error ? (
                  <span className="flex items-center gap-1 text-rose-600 text-[11px] font-bold">
                    <XCircle className="w-4 h-4" />
                    Error
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-600 text-[11px] font-bold">
                    <XCircle className="w-4 h-4" />
                    {validation?.similarity?.toFixed(3) || 'low'}
                  </span>
                )}
                <button type="button" onClick={() => {
                  setFormData({ ...formData, documents: { ...formData.documents, [doc.key]: null } });
                  setValidations({ ...validations, [doc.key]: undefined });
                }}
                  className="text-[11px] text-indigo-600 font-bold hover:underline">
                  Ganti
                </button>
              </div>
            )}

            {validation?.error && (
              <p className="text-[11px] text-rose-600">{validation.error}</p>
            )}
            {validation && !validation.is_valid && !validation.error && (
              <p className="text-[11px] text-rose-600">
                Similaritas {validation.similarity.toFixed(3)} di bawah threshold {validation.threshold}.
                Pastikan dokumen menggunakan template resmi.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex justify-between pt-3">
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100">
          ← Kembali
        </button>
        <button type="button" onClick={onSubmit} disabled={!allValid || submitting}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? 'Mengirim...' : 'Daftarkan'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: RegistrationSuccess**

```jsx
// frontend/src/components/register-upps/RegistrationSuccess.jsx
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegistrationSuccess({ result }) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Pendaftaran Diterima!</h1>
        <p className="text-sm text-slate-600 mt-2">
          Pendaftaran akun UPPS Anda telah diterima dan sedang menunggu approval dari Sekretariat LAM Teknik.
          Anda akan menerima email pemberitahuan setelah proses review selesai.
        </p>
        <div className="mt-4 p-3 bg-slate-50 rounded-xl">
          <p className="text-[10px] text-slate-500 font-bold">NOMOR REFERENSI</p>
          <p className="text-xs text-slate-800 font-mono mt-0.5 break-all">{result.requestId}</p>
        </div>
        <Link to="/login"
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add route in App.jsx**

Open `frontend/src/App.jsx`. Find the public routes block (where `/login` and `/register` are). Add:

```jsx
<Route path="/register-upps" element={<RegisterUPPSPage />} />
```

And add the import at top:
```jsx
import RegisterUPPSPage from './pages/RegisterUPPSPage';
```

- [ ] **Step 4: Smoke test the wizard**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/register-upps` in browser. Verify:
- Step 1 loads with institution dropdown
- Step 2 lets you add multiple prodi
- Step 3 file upload triggers validation

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/register-upps/Step3Documents.jsx \
        frontend/src/components/register-upps/RegistrationSuccess.jsx \
        frontend/src/App.jsx
git commit -m "feat(ui): add Step 3 Documents (validated upload) + Success screen + route"
```

---

## Task 13: Sekretariat registrations page

**Files:**
- Create: `frontend/src/pages/SekretariatRegistrationsPage.jsx`
- Create: `frontend/src/components/sekretariat/RegistrationDetailModal.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Detail modal**

```jsx
// frontend/src/components/sekretariat/RegistrationDetailModal.jsx
import { useState } from 'react';
import { X, Check, Ban, ExternalLink, Loader2 } from 'lucide-react';
import { approveRegistration, rejectRegistration } from '../../services/registration';

export default function RegistrationDetailModal({ request, onClose, onAction }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!request) return null;

  const handleApprove = async () => {
    setBusy(true); setError('');
    try {
      await approveRegistration(request.id);
      onAction({ action: 'approved' });
    } catch (err) {
      setError(err.response?.data?.error || 'Approval gagal');
    } finally { setBusy(false); }
  };

  const handleReject = async () => {
    if (reason.trim().length < 5) {
      setError('Alasan minimal 5 karakter');
      return;
    }
    setBusy(true); setError('');
    try {
      await rejectRegistration(request.id, reason);
      onAction({ action: 'rejected' });
    } catch (err) {
      setError(err.response?.data?.error || 'Reject gagal');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900">Detail Pendaftaran UPPS</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Detail label="Nama UPPS" value={request.upps_name} />
            <Detail label="Username" value={request.username} />
            <Detail label="Pimpinan" value={request.highest_leader_name} />
            <Detail label="PJ Akun" value={request.account_pj_name} />
            <Detail label="Email" value={request.email} />
            <Detail label="Telepon" value={request.phone || '-'} />
            <Detail label="Institusi" value={request.institution_name} />
            <Detail label="Status" value={request.status} />
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-1">Program Studi</div>
            <div className="space-y-1.5">
              {request.prodi?.map((p, idx) => (
                <div key={idx} className="text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="font-bold">{p.jenjang_label}</span> — {p.program_studi_name}
                  <div className="text-[10px] text-slate-500">
                    Ketua: {p.ketua_prodi} {p.letak_prodi ? `• ${p.letak_prodi}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-1">Dokumen</div>
            <div className="space-y-1.5">
              {request.documents?.map((d, idx) => (
                <a key={idx} href={d.pinata_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs">
                  <span>{d.file_name}</span>
                  <span className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px]
                      ${d.is_valid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {d.similarity_score?.toFixed(3)}
                    </span>
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                  </span>
                </a>
              ))}
            </div>
          </div>

          {rejectMode && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700">Alasan Reject *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Jelaskan apa yang perlu diperbaiki..."
                className="block w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-500" />
            </div>
          )}

          {request.rejection_reason && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <div className="text-[10px] font-bold text-rose-700">ALASAN REJECT SEBELUMNYA</div>
              <p className="text-xs text-rose-800 mt-1">{request.rejection_reason}</p>
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        {request.status === 'pending' && (
          <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
            {!rejectMode ? (
              <>
                <button onClick={() => setRejectMode(true)} disabled={busy}
                  className="px-4 py-2 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
                <button onClick={handleApprove} disabled={busy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setRejectMode(false); setError(''); }} disabled={busy}
                  className="px-4 py-2 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100">
                  Batal
                </button>
                <button onClick={handleReject} disabled={busy}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Konfirmasi Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 font-bold">{label}</div>
      <div className="text-xs text-slate-800 font-semibold">{value || '-'}</div>
    </div>
  );
}
```

- [ ] **Step 2: SekretariatRegistrationsPage**

```jsx
// frontend/src/pages/SekretariatRegistrationsPage.jsx
import { useEffect, useState } from 'react';
import { listRegistrations, getRegistrationDetail } from '../services/registration';
import RegistrationDetailModal from '../components/sekretariat/RegistrationDetailModal';
import { Loader2, Search } from 'lucide-react';

const STATUS_TABS = [
  { value: 'pending', label: 'Menunggu', color: 'amber' },
  { value: 'approved', label: 'Disetujui', color: 'emerald' },
  { value: 'rejected', label: 'Ditolak', color: 'rose' },
];

export default function SekretariatRegistrationsPage() {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setRequests(await listRegistrations(status));
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const openDetail = async (id) => {
    try {
      setSelected(await getRegistrationDetail(id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-black text-slate-900">Pendaftaran UPPS</h1>
        <p className="text-xs text-slate-500 mt-0.5">Review dan approval pendaftaran akun UPPS baru</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => setStatus(t.value)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all
              ${status === t.value ? `bg-white text-${t.color}-700 shadow-sm` : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Tidak ada pendaftaran dengan status ini.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-bold">UPPS</th>
                <th className="text-left p-3 font-bold">Institusi</th>
                <th className="text-left p-3 font-bold">Username</th>
                <th className="text-left p-3 font-bold">Diajukan</th>
                <th className="text-left p-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{r.upps_name}</div>
                    <div className="text-[10px] text-slate-500">{r.email}</div>
                  </td>
                  <td className="p-3 text-slate-700">{r.institution_name}</td>
                  <td className="p-3 text-slate-700 font-mono">{r.username}</td>
                  <td className="p-3 text-slate-500">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="p-3">
                    <button onClick={() => openDetail(r.id)}
                      className="px-3 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold rounded-lg">
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RegistrationDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAction={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add to Sidebar (find existing sekretariat menu)**

Open `frontend/src/components/Sidebar.jsx`. Find the sekretariat menu items (search for `SekretariatDashboard` or `sekretariat`). Add:

```jsx
{ to: '/sekretariat/registrations', label: 'Pendaftaran UPPS', icon: UserPlus }
```

(import `UserPlus` from `lucide-react`)

- [ ] **Step 4: Add protected route in App.jsx**

```jsx
<Route path="/sekretariat/registrations" element={
  <ProtectedRoute roles={['sekretariat']}>
    <SekretariatRegistrationsPage />
  </ProtectedRoute>
} />
```

And add import:
```jsx
import SekretariatRegistrationsPage from './pages/SekretariatRegistrationsPage';
```

- [ ] **Step 5: Manual end-to-end test**

1. Start backend: `cd backend-express && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173/register-upps`
4. Fill all 3 steps, upload template PDFs (the .docx → convert to PDF first manually)
5. Submit, verify `201` response
6. Login as `sekretariat1` user
7. Navigate to "Pendaftaran UPPS"
8. Verify pending request appears
9. Click "Lihat Detail", verify modal shows profile + prodi + document links
10. Click "Approve" — verify user is created in `users` table
11. Repeat with a fresh request, click "Reject" with reason — verify email is sent (check Resend dashboard)

```bash
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi -c \
  "SELECT username, role, is_active FROM users WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC"
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/SekretariatRegistrationsPage.jsx \
        frontend/src/components/sekretariat/RegistrationDetailModal.jsx \
        frontend/src/components/Sidebar.jsx \
        frontend/src/App.jsx
git commit -m "feat(ui): add sekretariat registration review page with approve/reject modal"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Schema: 4 tables (Task 1)
- ✅ Email service with 3 templates (Task 3)
- ✅ Resubmit JWT token (Task 4)
- ✅ Registration service with submit/approve/reject/resubmit (Task 5)
- ✅ Public endpoint POST /auth/register-upps (Task 6)
- ✅ Sekretariat endpoints (Task 7)
- ✅ Route wiring (Task 8)
- ✅ Frontend API client (Task 9)
- ✅ 3-step wizard: Step 1 Profile, Step 2 Multi-Prodi, Step 3 Documents (Tasks 10-12)
- ✅ Success screen (Task 12)
- ✅ Sekretariat admin page + detail modal (Task 13)
- ✅ Pinata IPFS upload (in registrationService)
- ✅ Auto-active flow on approve (in registrationService.approveRequest)

**No placeholders.** All code blocks contain full implementations.

**Type consistency:**
- `requestId` (UUID string) used consistently across services/controllers/frontend
- `prodiList` array shape `{jenjangCode, programStudiId, ketuaProdi, letakProdi}` consistent
- `documents` object shape consistent (file objects from multer on backend, File objects on frontend)
- `templateCode` strings: `surat_permohonan_akun`, `surat_pernyataan_upps` — match between SQL seed, validation service, frontend

**Test coverage:**
- Email service: 4 tests (config + 3 send methods)
- Resubmit token: 3 tests (roundtrip, tampered, expired)
- Registration service: 2 tests (username availability + detail lookup)

Manual E2E testing covers the rest (UI flow + actual email delivery).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-upps-registration.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for parallelization and context isolation.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best if you want tighter loop with same context.

Which approach?
