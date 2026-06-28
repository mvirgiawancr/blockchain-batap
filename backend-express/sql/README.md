# Database Migrations — AkreChain Backend

 urutan application. File-file SQL di folder ini idempotent (safe to re-run).

## Application Order

| # | File | Description |
|---|------|-------------|
| 1 | [`../init-db.sql`](../init-db.sql) | Core schema: 18 tables (users, sessions, submissions, audit_logs, document_chunks + pgvector, dst.) + seed users & assessor profiles |
| 2 | [`./002-lam-teknik-reference-and-templates.sql`](./002-lam-teknik-reference-and-templates.sql) | Reference data dari SAKTI LAM Teknik + schema document validation |

## Prerequisites

- PostgreSQL 14+
- `pgvector` extension (sudah di-init oleh `init-db.sql`)
- User DB punya SUPERUSER untuk `CREATE EXTENSION vector` (grant kalau perlu):
  ```sql
  ALTER USER lamtek WITH SUPERUSER;
  ```

## Apply Migration

```bash
# Dari root repo
cd backend-express

# 1. Apply core schema (jika belum)
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi \
  -f init-db.sql

# 2. Apply LAM Teknik reference + document validation
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi \
  -f sql/002-lam-teknik-reference-and-templates.sql
```

## Apa yang di-migrate oleh `002-lam-teknik-reference-and-templates.sql`

### New tables
- **`institutions`** — daftar 963 Perguruan Tinggi terdaftar di LAM Teknik (scraped dari SAKTI)
- **`jenjang`** — 10 jenjang (S1, S2, S3, D1-D3, S.Tr, M.Tr, D.Tr, PSPPI)
- **`program_studi`** — 583 Program Studi terakreditasi LAM Teknik
- **`document_templates`** — template dokumen untuk validasi (Surat Pengajuan Akun, Surat Pernyataan UPPS)
- **`document_validations`** — log hasil validasi dokumen (similarity score, verdict, metadata)

### Migration on `users` table
Kolom lama (`institution`, `program_studi` — free-text VARCHAR) **dipertahankan** untuk backward-compat. Kolom baru ditambahkan:

| Kolom | Type | FK |
|-------|------|----|
| `institution_id` | INTEGER | `institutions(id)` ON DELETE SET NULL |
| `program_studi_id` | INTEGER | `program_studi(id)` ON DELETE SET NULL |
| `jenjang_code` | VARCHAR(10) | `jenjang(code)` ON DELETE SET NULL |

Existing rows di-backfill otomatis berdasarkan exact match `LOWER(TRIM(name))`.

### Document Templates
Dua template dimasukkan:

| `template_code` | File | Threshold |
|-----------------|------|-----------|
| `surat_permohonan_akun` | `templates/upps-registration/surat-permohonan-akun.docx` | 0.75 |
| `surat_pernyataan_upps` | `templates/upps-registration/surat-pernyataan-upps.docx` | 0.75 |

Embedding di-generate **lazy** oleh `documentValidationService.loadTemplate()` saat pertama dipanggil (pakai local E5 multilingual, 768 dim).

## Verification

```bash
PGPASSWORD=lamtek_secure_2025 psql -h localhost -U lamtek -d akreditasi -c "
SELECT 'institutions' AS t, COUNT(*) FROM institutions
UNION ALL SELECT 'jenjang', COUNT(*) FROM jenjang
UNION ALL SELECT 'program_studi', COUNT(*) FROM program_studi
UNION ALL SELECT 'document_templates', COUNT(*) FROM document_templates;
"
```

Expected output:
```
        t         | count
------------------+-------
 institutions     |   963
 jenjang          |    10
 program_studi    |   583
 document_templates |   2
```

## Validation API (post-migration)

Endpoint public (pre-auth, untuk registration flow):

```bash
# List templates
curl http://localhost:3000/api/v1/document-validation/templates

# Validate single PDF (e.g. Surat Pengajuan Permohonan Akun)
curl -X POST http://localhost:3000/api/v1/document-validation/templates/surat_permohonan_akun \
  -F "file=@/path/to/surat.pdf"

# Validate both UPPS registration docs in one call
curl -X POST http://localhost:3000/api/v1/document-validation/upps-registration \
  -F "surat_permohonan=@/path/to/permohonan.pdf" \
  -F "surat_pernyataan=@/path/to/pernyataan.pdf"
```

Response format:
```json
{
  "template_code": "surat_permohonan_akun",
  "file_name": "surat.pdf",
  "is_valid": true,
  "similarity": 0.8923,
  "threshold": 0.75,
  "extracted_text_length": 1247,
  "errors": []
}
```

## Rollback

```sql
BEGIN;
ALTER TABLE users
  DROP COLUMN IF EXISTS institution_id,
  DROP COLUMN IF EXISTS program_studi_id,
  DROP COLUMN IF EXISTS jenjang_code;
DROP TABLE IF EXISTS document_validations;
DROP TABLE IF EXISTS document_templates;
DROP TABLE IF EXISTS program_studi;
DROP TABLE IF EXISTS jenjang;
DROP TABLE IF EXISTS institutions;
COMMIT;
```

## Source Data

- **Institutions & Program Studi**: di-scrape dari `https://sakti.lamteknik.or.id/upps/register` pada 2026-06-28. Total 973 institusi di source, 963 unik setelah dedup (10 duplikat name-dengan-ID-berbeda di-filter oleh UNIQUE constraint).
- **Templates**: diunduh langsung dari:
  - `https://lamteknik.or.id/assets/template-surat-permohonan-pembuatan-akun-sakti.docx`
  - `https://lamteknik.or.id/assets/template_surat-pernyataan-sebagai-upps-oleh-pimpinan-perguruan-tinggi.docx`

Untuk refresh data (jika LAM Teknik update list), jalankan ulang scraper di `scripts/extract-lam-teknik-data.py` (TODO: commondify script ini).
