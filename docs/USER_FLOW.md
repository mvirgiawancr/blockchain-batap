# Alur Operasional (UPPS → Sekretariat → Assessor)

Alur kerja sesuai kebutuhan: UPPS upload dokumen, Sekretariat memutuskan dan memilih assessor, Assessor melakukan skoring manual (AI hanya pembanding).

## 1) UPPS Upload LED & LKPS
1. Login sebagai UPPS.
2. Kirim LED/LKPS lewat endpoint:
   - `POST /api/v1/upload` (Bearer token UPPS)
   - Body form-data: `programStudi`, `institusi`, `programType`, file `led_file`, `lkps_file`.
3. Backend:
   - Verifikasi/analisis AI (sebagai pembanding).
   - Simpan ke blockchain via `CreateSubmission` (MSP UPPS).
   - Status awal: `processing` / `under_review`.

## 2) Sekretariat Review & Keputusan Awal
1. Login sebagai Sekretariat.
2. Ambil daftar submission:
   - `GET /api/v1/submissions` (Bearer Sekretariat).
3. Jika dokumen layak, Sekretariat bisa memberi keputusan awal:
   - `POST /api/v1/submissions/:id/decision`
   - Body: `{ "decision": "approved" | "rejected", "notes": "..." }`
   - Dicatat di blockchain via `SetDecision` (MSP Sekretariat).

## 3) Penugasan Assessor oleh Sekretariat
> Penetapan assessor dilakukan di luar chaincode (saat ini tidak ada tabel/chaincode assignment khusus). Simpan penugasan di off-chain (misal tabel terpisah) atau gunakan metadata submission.

Contoh pendekatan sederhana (off-chain):
- Tambah kolom di DB off-chain (tabel `submission_metadata` atau tabel baru `assignments`) untuk mapping `submission_id` -> `assessor_user_id`.
- Endpoint tambahan (belum diimplementasi):
  - `POST /api/v1/submissions/:id/assign` (role: Sekretariat/Admin) untuk set `assessorUserId`.
  - `GET /api/v1/submissions/:id/assign` untuk melihat penugasan.

## 4) Assessor Skoring Manual
1. Login sebagai Assessor.
2. Ambil submission yang ditugaskan (dari API penugasan atau filter manual).
3. Lakukan skoring manual:
   - Gunakan endpoint kustom scoring:
     - `POST /api/v1/scoring/custom`
     - Body: `{ "ledData": {...}, "lkpsData": {...}, "programType": "S" }`
   - Atau jalankan `POST /api/v1/scoring/calculate` jika ingin memakai data AI sebagai baseline lalu sesuaikan inputnya.
4. Backend menulis hasil skoring ke blockchain via `SetScoringResult` (MSP Assessor/Sekretariat). Status tetap `under_review` sampai Sekretariat final.

## 5) Keputusan Final Sekretariat
1. Setelah menerima skor manual Assessor, Sekretariat menetapkan keputusan final:
   - `POST /api/v1/submissions/:id/decision`
2. Status menjadi `approved` atau `rejected` di blockchain, event `SubmissionDecided` terbit.

## Catatan Penting
- AI scoring hanya pembanding: gunakan `scoring/custom` untuk skor manual; AI hasilnya tersimpan di `ai.scoring` dan tidak otomatis menjadi skor final.
- Chaincode RBAC:
  - `CreateSubmission`, `UpdateDocuments`: UPPS/Sekretariat.
  - `SetDecision`: Sekretariat/Assessor (untuk skenario peer-review; final tetap Sekretariat).
  - `SetScoringResult`: Assessor/Sekretariat.
- Untuk penugasan assessor formal, tambahkan endpoint/off-chain storage seperti pada langkah 3.
