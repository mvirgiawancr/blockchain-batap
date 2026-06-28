# UPPS Registration — Changelog Session 2026-06-28

**Branch:** `feat/upps-registration`
**Tanggal:** 2026-06-28
**Author:** darwan

Dokumen ini merangkum semua perubahan setelah sesi manual testing pertama (post-implementation). Fokus: bug fix ketemu saat test + improvement UX + sinkronisasi schema.

---

## Daftar Perubahan

### 1. Schema: Table `upps` baru (1:1 dengan `users`)

**File:** `backend-express/sql/003-registration-requests.sql`

**Sebelum:** Field UPPS-specific (nama pimpinan tertinggi, PJ akun, dll) cuma disimpen di `registration_requests` (audit table). Setelah approve, data ini "hilang" dari profile user.

**Sesudah:** Table `upps` baru menyimpan semua detail UPPS, di-link ke `users.id` via FK `user_id UNIQUE`:

```sql
CREATE TABLE upps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  upps_name VARCHAR(255) NOT NULL,
  highest_leader_name VARCHAR(255) NOT NULL,
  account_pj_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  ...
);
```

**Pengaruh:**
- Approve flow sekarang INSERT ke `users` + `upps` + `user_program_studi` dalam 1 transaction
- Query detail UPPS: `SELECT u.*, up.* FROM users u JOIN upps up ON up.user_id = u.id`
- cascade delete: kalau user dihapus, profile upps otomatis ikut terhapus

---

### 2. Schema: Kolom `email` di `users`

**File:** `backend-express/sql/004-add-email-to-users.sql` (baru)

**Sebelum:** Table `users` ga punya kolom `email`. Tapi `approveRequest()` di spec nyebut INSERT email → crash saat approve.

**Sesudah:** Migration baru nambah kolom:

```sql
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
```

**Pengaruh:** Approve flow jalan tanpa crash. Email user dibutuhin buat notifikasi sertifikat, AL scheduling, dll ke depan.

---

### 3. Critical Bug: Embedding Similarity Selalu 0%

**File:** `backend-express/src/services/documentValidationService.js`

**Sebelum:** User upload PDF (100% sama dgn template) → similarity **0%**. PDF text extraction sukses (1026 chars), tapi similarity = 0.

**Root cause:** Kolom `embedding` di `document_templates` tipenya `vector(768)` (pgvector). Pas SELECT, Postgres return sebagai **string** `"[0.1,0.2,...]"` — bukan JS Array. Function `cosineSimilarity(a, b)` bandingkan `a.length` (768, array) vs `b.length` (~5000, string) → length mismatch → return 0.

**Sesudah:**
```js
// loadTemplate: parse string embedding ke array setelah SELECT
if (typeof tpl.embedding === 'string' && tpl.embedding) {
  tpl.embedding = JSON.parse(tpl.embedding);
}

// cosineSimilarity: defensive guard
if (!Array.isArray(a) || !Array.isArray(b) || ...) return 0;
```

**Pengaruh:** Dokumen validasi sekarang jalan. Upload template asli → similarity ~95-100%.

---

### 4. Critical Bug: "Pinata upload failed" Padahal Sukses

**File:** `backend-express/src/services/registrationService.js`, `pinataService.js`

**Sebelum:** Pinata upload sebenarnya **berhasil**, tapi wrapper check `result.IpfsHash` (yg ga ada di response shape). Response sebenarnya: `{cid, size, timestamp, gateway_url, pinata_url}`. Akibatnya selalu throw "Pinata upload failed for X" walau file sudah ter-upload.

**Sesudah:**
```js
// Fix: cek result.cid (bukan IpfsHash)
if (!result || !result.cid) {
  throw new Error(`Pinata upload failed for ${templateCode}`);
}
return {
  cid: result.cid,
  url: result.pinata_url || `https://${config.pinata.gateway}/ipfs/${result.cid}`,
};
```

Bonus: `pinataService.js` error handler sekarang log status code + hint URL Pinata untuk 401/403 (sebelumnya cuma `[object Object]`).

---

### 5. Critical Bug: Email Notification Ga Pernah Sampai

**File:** `backend-express/src/services/emailService.js`

**Sebelum:** Fire-and-forget `.catch()` cuma nangkap promise rejection. Tapi `safeSend()` swallow error jadi return value `{success: false, error}` (ga pernah throw) → catch handler **ga pernah ke-trigger**, email gagal pun ga kelog.

**Sesudah:** `safeSend()` log baik success maupun failure dengan detail lengkap:
```
✅ [Email] sent to "xxx" — subject: "..." — id: <resend-id>
❌ [Email] send rejected by Resend for "xxx": { message: "..." }
❌ [Email] send threw for "xxx": { message: "...", response: "..." }
```

**Pengaruh:** Saat ada masalah email (auth failed, domain belum verified, dll), keliatan di log dengan jelas.

---

### 6. Domain Resend: `onboarding@resend.dev` → `noreply@<verified-domain>`

**File:** `.env` (tidak di-commit)

**Sebelum:** `EMAIL_FROM=AkreChain <onboarding@resend.dev>` — domain share Resend. **Hanya bisa kirim ke email pemilik akun Resend**. Kirim ke email lain → silently drop.

**Sesudah:** `EMAIL_FROM=AkreChain <noreply@<verified-domain>>` — domain verified di Resend, bisa kirim ke siapapun.

**Pengaruh:** Notifikasi registration/approval/rejection sekarang sampai ke email UPPS manapun.

---

### 7. Register.jsx: Redirect UPPS ke Wizard

**File:** `frontend/src/pages/Register.jsx`

**Sebelum:** Form admin single-step (`/register`). Kalau pilih role UPPS, semua field tetap keliatan tapi ga ada multi-prodi / validasi dokumen / approval flow.

**Sesudah:** Saat role UPPS dipilih di dropdown:
- Field Institusi & Program Studi di-hide
- Tombol "Daftarkan Akun" diganti info box + tombol "Daftar UPPS Wizard →"
- Klik tombol → navigate ke `/register-upps` (3-step wizard)
- Guard di `handleSubmit` (Enter-key ga bisa submit saat UPPS)

**Pengaruh:** UX lebih jelas — admin tau kalau UPPS harus pakai wizard khusus.

---

### 8. Step3Documents: Link Download Template

**File:** `frontend/src/components/register-upps/Step3Documents.jsx`, `frontend/src/services/registration.js`

**Sebelum:** User harus cari template sendiri di web LAM Teknik.

**Sesudah:** Tiap section dokumen ada link "⬇ Unduh Template" (pojok kanan atas):
- Hardcoded URL langsung ke `lamteknik.or.id/assets/...docx`
- Open in new tab (`target="_blank" rel="noopener noreferrer"`)

Backend endpoint `/templates/:code/download` sempat dibuat lalu dihapus — hardcoded URL lebih simple & reliable.

---

### 9. Jenjang Codes: Sync dgn DB

**File:** `backend-express/src/middleware/validation.js`, `lamtekScoringService.js`, `frontend/src/pages/UPPSDashboard.jsx`

**Sebelum:** Kode jenjang inconsistent antara 3 tempat:
- Form Register: `S, M, D, PPI, D1-D3, STr, ...`
- Backend validation: `S, M, D, D1-D3, STr, MTr, DTr, PPI`
- DB `jenjang.code`: `S1, S2, S3, D1, D2, D3, STr, MTr, DTr, Prof`

Akibatnya: UPPS profile prefill gagal (kode dari DB ga match option di form), validasi backend nolak kode dari frontend.

**Sesudah:** Semua tempat pakai kode DB:
- Frontend `<option>` value: `S1, S2, S3, D1, D2, D3, STr, MTr, DTr, Prof`
- Joi validation: same codes
- Scoring service: support BOTH new codes (`S1, S3, Prof`) dan legacy (`S, D, PPI`) sebagai fallback
- Default form value: `S1` (bukan `S`)

**Pengaruh:** Form submission, profile prefill, dan scoring semua konsisten.

---

### 10. UPPS Dashboard: Auto-fill Form dari Profile

**File:** `backend-express/src/controllers/authController.js`, `routes/auth.js`, `frontend/src/pages/UPPSDashboard.jsx`, `services/api.js`

**Sebelum:** UPPS login → buka dashboard → harus isi manual Institusi/Program Studi/Jenjang walau data udah ada di profile (saat registration).

**Sesudah:**
- Endpoint baru: `GET /api/v1/auth/me/upps-profile` (auth required, role=upps)
  - Return: upps profile + institution name + array prodi (dengan names resolved via JOIN)
- Frontend: panggil endpoint on mount, auto-set:
  - `institusi` ← `institution_name`
  - `programStudi` ← primary prodi's name
  - `programType` ← primary prodi's jenjang code

**Pengaruh:** UPPS tinggal upload LED+LKPS, ga perlu re-input data profile. Field masih editable untuk case UPPS mau submit untuk prodi lain yg mereka pegang.

---

### 11. Gemini Model: 1.5-flash → 2.5-flash

**File:** `backend-express/src/config/index.js` (default), `.env` (runtime, ga di-commit)

**Sebelum:** Default model `gemini-1.5-flash` — sudah deprecated Google per mid-2026. Error: `404 Not Found`.

**Sesudah:**
- Default code: `gemini-2.5-flash` (jalan di free tier)
- Fallback: `gemini-2.0-flash`
- `.env.example` tetap `gemini-1.5-flash` (original)

**Catatan:** API key project lu punya `limit: 0` untuk `gemini-2.0-flash` & `gemini-2.5-flash-lite` (project-level restriction). `gemini-2.5-flash` masih jalan di free tier.

---

## Alur Sebelum vs Sesudah

### Flow: Admin Bikin Akun UPPS

**Sebelum:**
```
Admin → /register → isi form (username, password, name, role=upps, 
        institusi text, prodi text) → submit → akun langsung active
```
❌ Ga ada validasi dokumen, ga ada multi-prodi, ga ada approval gate, data text bebas (typos, ga konsisten dgn DB).

**Sesudah:**
```
Admin → /register → pilih role=upps → form hide, muncul info box → 
        klik "Daftar UPPS Wizard" → /register-upps → 
        Step 1 Profil + Step 2 Multi-prodi + Step 3 Dokumen validated → 
        submit → status=pending → Sekretariat review → approve/reject → 
        baru active
```
✅ Dokumen tervalidasi via AI embedding, multi-prodi via FK ke DB, approval gate, data terstruktur.

---

### Flow: UPPS Upload Dokumen Akreditasi

**Sebelum:**
```
UPPS login → /dashboard → isi form manual:
  Institusi: [______] (text bebas, bisa typo)
  Program Studi: [______] (text bebas)
  Jenjang: [S/M/D/...] (kode lama, ga match DB)
→ upload LED/LKPS → submit
```

**Sesudah:**
```
UPPS login → /dashboard → form auto-filled:
  Institusi: Akademi Penerbang Indonesia Banyuwangi (dari profile)
  Program Studi: Teknik Penerbangan (dari profile, primary prodi)
  Jenjang: D3 (dari profile)
→ upload LED/LKPS → submit
```
✅ Ga perlu re-input, konsisten dgn registration data, kode jenjang valid.

---

### Flow: Validasi Dokumen Registration

**Sebelum:**
```
UPPS upload template asli → PDF text extracted (1026 chars, OK) → 
embed doc → cosineSimilarity(embedding, tpl.embedding) → 
tpl.embedding is STRING "[..]" → string.length ≠ 768 → return 0 → 
similarity 0% → REJECT → "Similaritas rendah"
```

**Sesudah:**
```
UPPS upload template asli → PDF text extracted → embed doc → 
JSON.parse(tpl.embedding) jadi array → cosineSimilarity(768, 768) → 
0.95+ → VALID → lanjut upload ke Pinata
```

---

### Flow: Upload Dokumen ke Pinata

**Sebelum:**
```
Validate docs OK → upload both PDFs to Pinata (sukses, return {cid,...}) → 
wrapper check result.IpfsHash (undefined!) → 
throw "Pinata upload failed for surat_pernyataan_upps" → 
registration gagal walau file sudah di-Pinata
```

**Sesudah:**
```
Validate docs OK → upload both PDFs to Pinata → return {cid,...} → 
wrapper check result.cid (ada!) → return {cid, url} → 
INSERT registration_request + documents (with CID) → 201 Created → 
fire email "Pendaftaran Diterima"
```

---

### Flow: Email Notifikasi

**Sebelum:**
```
Submit registration → safeSend kirim via Resend → 
Resend reject (domain onboarding@resend.dev ga verified) → 
safeSend swallow error jadi {success: false} → 
caller .catch() ga ke-trigger (no rejection) → 
TIDAK ADA LOG TENTANG KEGAGALAN → user ga tau kenapa email ga datang
```

**Sesudah:**
```
Submit registration → safeSend kirim via Resend (from noreply@verified-domain) → 
Resend accept, return id → safeSend log "sent to ... id: xxx" → 
email sampai ke inbox UPPS
```

---

## Statistik Commit

| Commit | Deskripsi |
|---|---|
| `eb605c1` | feat(db): upps profile table + email column + dashboard prefill endpoint |
| `0d687a4` | fix: pgvector parse + pinata response + email logging + jenjang codes |
| `77bf5c3` | feat(ui): UPPS dashboard prefill + Register redirect + template download |

Total: **24 files changed, ~2,663 insertions** dalam 3 commits tematik.

---

## Known Issues / Future Work

- **Gemini API quota**: project lu limit 0 untuk beberapa model. Solusi: enable billing (~$5 credit cukup dev berbulan-bulan) atau bikin fresh API key di project baru.
- **Multi-prodi submission**: form UPPSDashboard cuma support 1 prodi per submission. Kalau UPPS punya 3 prodi & mau submit sekalian, harus submit 3x. Future: bikin batch submission UI.
- **Field editable**: Institusi/Prodi/Jenjang di dashboard masih bisa di-edit user. Kalau mau strict (lock ke profile), tinggal tambah `readOnly` + visual hint.
- **Rate limit Gemini**: 7 kriteria berurutan bisa kena RPM limit. Future: batch jadi 1 prompt besar atau tambah delay antar call.
