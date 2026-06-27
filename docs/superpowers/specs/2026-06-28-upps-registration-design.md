# UPPS Registration — Design Spec

**Date**: 2026-06-28
**Status**: Approved (pending spec review)
**Owner**: darwan

## Context

Sistem akreditasi AkreChain saat ini punya `Register.jsx` (single-step, all-role) yang dipakai admin untuk bikin akun semua peran. LAM Teknik punya flow berbeda di SAKTI (`https://sakti.lamteknik.or.id/upps/register`) — 3-step wizard khusus UPPS dgn multi-prodi + dokumen yang divalidasi terhadap template resmi.

Spec ini mendefinisikan bagaimana AkreChain meniru flow SAKTI tersebut, sehingga UPPS bisa self-register dgn validasi dokumen embedding + approval workflow oleh Sekretariat.

## Goals

1. UPPS dapat mendaftar sendiri tanpa intervensi admin (public form, pre-auth)
2. Dokumen wajib (Surat Pengajuan Akun + Surat Pernyataan UPPS) divalidasi via embedding similarity vs template LAM Teknik resmi
3. Multi-prodi: 1 akun UPPS bisa manage beberapa prodi
4. Approval gate oleh Sekretariat (auto-active setelah approve, password dari form)
5. Dokumen di-archive ke Pinata IPFS untuk audit trail
6. Resubmit allowed jika ditolak

## Non-Goals

- Email notification setup (di-scope out; provider TBD by user)
- Frontend admin/UPPS dashboard untuk manage registration setelah approve
- SSO / OAuth login
- Captcha / anti-bot protection (di-scope out; rate-limit di API cukup)
- Internationalization (cuma Bahasa Indonesia)

## Architecture

```
[Public]                              [Backend Express]                  [Storage]
/register-upps                        /api/v1/auth/register-upps
  Step 1 Profil       ────────────>     ├─ validate docs (embedding)
  Step 2 Prodi (multi)                  ├─ upload PDFs to Pinata  ──>   Pinata IPFS
  Step 3 Dokumen                        └─ INSERT registration_request  PostgreSQL
                                          (status='pending')

[Sekretariat]                         /api/v1/sekretariat/registrations
/sekretariat/registrations             GET (list), GET/:id (detail)
  List pending                         POST /:id/approve ──> transaction:
  Detail + approve/reject                1. INSERT users (role='upps')
                                          2. INSERT user_program_studi
                                          3. UPDATE registration_requests
```

## UI Components (Frontend)

Struktur file baru:

```
src/pages/RegisterUPPSPage.jsx              ← wizard container (state machine)
src/components/register-upps/
  WizardStepper.jsx                         ← progress indicator (Langkah 1/2/3)
  Step1Profile.jsx                          ← profil UPPS + institusi native select
  Step2Prodi.jsx                            ← multi-prodi entry list
  Step3Documents.jsx                        ← upload + real-time validation
  RegistrationSuccess.jsx                   ← success screen (shows request_id)
src/pages/SekretariatRegistrationsPage.jsx  ← list pending/approved/rejected
src/components/sekretariat/
  RegistrationDetailModal.jsx               ← detail + approve/reject buttons
src/services/registration.js                ← API client untuk registration endpoints
```

### Routing (App.jsx additions)

```jsx
<Route path="/register-upps" element={<RegisterUPPSPage />} />     {/* public */}
<Route path="/sekretariat/registrations" element={
  <ProtectedRoute roles={['sekretariat']}>
    <SekretariatRegistrationsPage />
  </ProtectedRoute>
} />
```

### Wizard state

```js
const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3
const [formData, setFormData] = useState({
  // Step 1
  uppsName: '', highestLeaderName: '', accountPjName: '', email: '', phone: '',
  institutionId: '', username: '', password: '', confirmPassword: '',
  // Step 2: array of prodi entries
  prodiList: [{ jenjangCode: '', programStudiId: '', ketuaProdi: '', letakProdi: '' }],
  // Step 3: validation results (filled by Step3 component)
  documents: {
    surat_permohonan_akun: { file: null, validation: null },
    surat_pernyataan_upps: { file: null, validation: null },
  },
});
```

### Native select for institutions/prodi

963 institutions + 583 prodi di-render via native `<select>`. Browser native dropdowns can handle this volume, performance impact minimal. Mitigasi jika lambat: di-optimize dengan `requestAnimationFrame` chunking atau fallback ke datalist.

## Schema (migration file: `backend-express/sql/003-registration-requests.sql`)

```sql
BEGIN;

-- Pending registration requests
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

CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_registration_requests_username ON registration_requests(username);
CREATE INDEX idx_registration_requests_institution ON registration_requests(institution_id);
CREATE INDEX idx_registration_requests_created ON registration_requests(created_at);

-- Multi-prodi (many-to-many for pending requests)
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

CREATE INDEX idx_registration_request_prodi_request ON registration_request_prodi(request_id);

-- Documents attached to registration (post-validation metadata + IPFS CID)
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

CREATE INDEX idx_registration_request_documents_request ON registration_request_documents(request_id);

-- Multi-prodi for APPROVED users (1 UPPS account -> many prodi)
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

CREATE INDEX idx_user_program_studi_user ON user_program_studi(user_id);

COMMENT ON TABLE registration_requests IS 'Pending/approved/rejected UPPS self-registration requests';
COMMENT ON TABLE registration_request_prodi IS 'Multi-prodi entries attached to a pending registration_request';
COMMENT ON TABLE registration_request_documents IS 'Validated documents attached to a registration_request (Pinata IPFS archived)';
COMMENT ON TABLE user_program_studi IS 'Multi-prodi linked to an approved UPPS user';

COMMIT;
```

## Backend Endpoints

### Public

**POST `/api/v1/auth/register-upps`**

Request (multipart/form-data):
```
uppsName: string
highestLeaderName: string
accountPjName: string
email: string
phone: string
institutionId: integer
username: string
password: string
prodiList: JSON string — [{jenjangCode, programStudiId, ketuaProdi, letakProdi}, ...]
surat_permohonan: File (PDF, ≤1MB)
surat_pernyataan: File (PDF, ≤1MB)
```

Flow:
1. Validate body (required fields, username uniqueness vs users + registration_requests)
2. Validate both documents via `documentValidationService.validateAll()` — if either invalid → 400 with similarity scores
3. Upload both PDFs to Pinata IPFS via `pinataService`
4. Hash password (bcrypt, reuse `authService`)
5. INSERT registration_requests + registration_request_prodi + registration_request_documents in transaction
6. Return `{ requestId, status: 'pending', message: 'Pendaftaran berhasil, menunggu approval Sekretariat' }`

Response codes:
- 201: Created
- 400: Validation failed (missing field, doc invalid, username taken)
- 422: Document validation failed (similarity < threshold) — return detailed errors
- 500: Server error

### Sekretariat-only (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sekretariat/registrations` | List with filter `?status=pending\|approved\|rejected` |
| GET | `/api/v1/sekretariat/registrations/:id` | Full detail (profile + prodi + documents) |
| POST | `/api/v1/sekretariat/registrations/:id/approve` | `{ notes?: string }` → activates user |
| POST | `/api/v1/sekretariat/registrations/:id/reject` | `{ reason: string }` required |

**Approve flow** (transactional):
```sql
BEGIN;
INSERT INTO users (username, password_hash, role, name, msp_org,
                   email, phone, institution_id, is_active)
VALUES (req.username, req.password_hash, 'upps', req.upps_name, 'UPPSMSP',
        req.email, req.phone, req.institution_id, TRUE)
RETURNING id;
-- userid dari RETURNING

INSERT INTO user_program_studi (user_id, jenjang_code, program_studi_id,
                                ketua_prodi, letak_prodi, is_primary)
SELECT $userid, jenjang_code, program_studi_id, ketua_prodi, letak_prodi,
       (row_number() OVER () = 1)
FROM registration_request_prodi
WHERE request_id = req.id;

UPDATE registration_requests
SET status='approved', reviewed_by=$sekretariatId, reviewed_at=NOW(),
    approved_user_id=$userid
WHERE id = req.id;
COMMIT;
```

**Reject flow**: UPDATE status + rejection_reason + reviewed_by. Request tetap di DB untuk audit.

**Resubmit mechanism** (rejected → pending lagi):
- UPPS dapat email dgn link `/register-upps?resubmit=<request_id>` (token signed)
- Link buka wizard pre-filled dengan data request yg rejected
- User edit (perbaiki dokumen / benahi alasan reject), submit ulang
- Backend: UPDATE row yg sama (status='pending', cleared rejection_reason, new docs uploaded, new password_hash jika diubah), preserve created_at
- Username uniqueness tetap terjaga karena row yg sama di-update (bukan insert baru)

Endpoint: `PATCH /api/v1/auth/register-upps/:requestId/resubmit` (public, requires resubmit token in body)

Token format: JWT signed dengan secret backend, expired dalam 7 hari, payload `{ requestId, email }`.

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `RegisterUPPSPage` | Wizard state, navigation between steps, submit payload |
| `Step1Profile` | Form fields validation (email format, password match, username availability check) |
| `Step2Prodi` | Add/remove prodi rows, min 1, validate each row complete |
| `Step3Documents` | File upload + real-time validation feedback, gate submit |
| `SekretariatRegistrationsPage` | Table list with filter tabs, click row → detail modal |
| `RegistrationDetailModal` | Show profile + prodi + download docs (Pinata URL) + approve/reject buttons |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Username/email taken (existing user OR pending request) | Inline error in Step 1, block Next |
| Document similarity < threshold | Inline error in Step 3, show score + threshold, block Submit |
| Document > 1MB | Block upload at file input, show error |
| Document not PDF | Block upload, show error |
| Pinata upload fails | Rollback transaction, return 500 with message |
| Approve fails (e.g., username race) | Rollback, return 409 Conflict |
| Network error | Generic retry prompt |

## Testing

- **Unit**: `documentValidationService` (already covered)
- **Integration**: registration endpoint flow — submit → validate → upload → insert
- **Integration**: approve flow — request → approve → user exists → can login
- **E2E (manual)**: full wizard on dev environment, verify sekretariat approval

## Migration Plan

1. Apply `003-registration-requests.sql` to local DB
2. Backend: implement endpoints + tests
3. Frontend: build wizard components (Step1 → Step2 → Step3 → Success)
4. Frontend: build SekretariatRegistrationsPage
5. Manual smoke test full flow
6. Commit + PR

## Open Questions / Future Work

- Email notification on approve/reject: provider TBD (Resend recommended). Token resubmit akan dikirim via email saat menolak.
- Captcha / rate-limiting on public endpoint (mitigated by express-rate-limit on `/api/`)
- Institution/prodi list might update from LAM Teknik — re-run scraper periodically
