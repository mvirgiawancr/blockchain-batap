# Laporan Status Program & Data Dummy

Berikut adalah rangkuman mengenai fungsi-fungsi yang telah diimplementasikan dalam sistem, poin-poin pengembangan, serta rincian data dummy yang tersedia.

## 1. Fungsi-Fungsi yang Sudah Terpenuhi (Implemented Features)

Fungsi-fungsi berikut telah memiliki endpoint API dan logika di backend (`backend-express/src`):

### A. Autentikasi & Manajemen Pengguna (`/auth`, `/users`)
- **Registrasi & Login**: Pengguna dapat mendaftar (register) dan masuk (login).
- **Manajemen Profil**: Melihat profil sendiri (`/me`) dan mengubah password.
- **Integrasi Blockchain (MSP)**:
  - Menyimpan kredensial MSP (Certificate & Private Key) secara terenkripsi.
  - Mengecek status dan menghapus kredensial MSP.
- **Refresh Token**: Mekanisme pembaharuan sesi tanpa login ulang.

### B. Manajemen Pengajuan (Submissions) (`/submissions`)
- **CRUD Pengajuan**:
  - Melihat daftar pengajuan (dengan filter: Program Studi, Institusi, Tipe, Status).
  - Melihat detail satu pengajuan.
  - Statistik pengajuan (Stats).
  - Update dan Hapus pengajuan (untuk Admin/Sekretariat).
- **Proses Penugasan (Assignment Flow)**:
  - **Penugasan Asesor**: Sekretariat/Admin menunjuk asesor untuk pengajuan tertentu.
  - **Respon Asesor**: Asesor dapat Menerima (`accept`) atau Menolak (`reject`) penugasan.
  - **Manajemen Penugasan**: Melihat status penugasan dan membatalkan penugasan.
- **Pengambilan Keputusan (Decision)**:
  - Input keputusan akhir (Disetujui/Ditolak) oleh Sekretariat/KEA.
  - Respon UPPS terhadap tawaran asesor.

### C. Sistem Penilaian (Scoring) (`/scoring`)
- **Kalkulasi Nilai**:
  - Perhitungan otomatis skor LAM-TEK berdasarkan data.
  - Dukungan untuk perhitungan ulang (`recalculate`).
- **Scoring Manual & Custom**:
  - Input data manual untuk simulasi penilaian (`/custom`).
  - Penilaian manual oleh asesor (`/manual`).
- **Info Scoring**: Mengambil rumus, threshold, dan informasi kriteria penilaian.

### D. Fitur Pendukung
- **Notifikasi**: Sistem dasar notifikasi pengguna.
- **Dokumen**: Upload dan download dokumen (terintegrasi dengan enkripsi IPFS di database).

---

## 2. Poin dalam Progress / Bisa Dikembangkan (Potential Improvements)

Beberapa area yang dapat dikembangkan lebih lanjut atau dilengkapi:

- **Generasi Data Dummy Transaksional**: Saat ini hanya data *User* yang memiliki dummy. Data pengajuan, penugasan, dan penilaian masih kosong. Diperlukan script `seeder` untuk mengisi data-data ini agar simulasi lebih hidup.
- **Traceability**: Menambahkan fitur pelacakan jejak (traceability) untuk setiap perubahan data dan keputusan dalam sistem, sehingga memudahkan audit dan transparansi proses akreditasi.
- **Audit Logs Lanjutan**: Tabel `audit_logs` sudah ada, namun perlu dipastikan seluruh aktivitas penting (login, penilaian, keputusan) tercatat secara detail di sana.
- **Analitik Mendalam**: Tabel `analytics` sudah tersedia, fitur dashboard analitik visual di frontend bisa dikembangkan lebih jauh menggunakan data ini.
- **Unit Testing**: Menambah cakupan tes otomatis untuk setiap controller guna meminimalisir bug.

---

## 3. Data Dummy yang Tersedia

Saat ini, data dummy yang **sudah dibuat** berada pada tabel `users`. Tabel lain (submissions, sessions, logs) masih kosong dalam inisialisasi awal.

### Rekapitulasi Data Dummy (Class: Users)
Total Users: **13 Data**

| Role (Kelas) | Jumlah Data | Username (Contoh) |
| :--- | :---: | :--- |
| **Admin** | 1 | `admin` |
| **UPPS** (Unit Pengelola) | 3 | `upps_tip`, `upps_ti`, `upps_te` |
| **Sekretariat** | 2 | `sekretariat`, `sekretariat_admin` |
| **KEA** (Ketua Evaluasi) | 2 | `kea`, `kea_backup` |
| **Asesor** | 5 | `asesor_001` - `asesor_005` |

**Catatan:**
- Password default untuk semua user dummy adalah: `password123`
- Semua user diatas sudah diset sebagai `is_active: TRUE` dan memiliki asosiasi organisasi (MSP Org) masing-masing.

---

## 4. Database Schema

### Relasi Antar Tabel

Tabel `users` merupakan tabel utama yang berelasi dengan tabel-tabel lain:

    users (1) ----> (N) sessions
    users (1) ----> (N) submission_assignments
    users (1) ----> (N) audit_logs
    users (1) ----> (N) submission_metadata
    users (1) ----> (N) analytics
    users (1) ----> (N) notifications
    
    encryption_keys (standalone - linked via submission_id)

### Struktur Tabel Detail

#### Tabel: `users`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | UUID | Primary Key |
| username | VARCHAR(100) | Unique |
| password_hash | TEXT | - |
| role | VARCHAR(50) | upps/sekretariat/assessor/kea/asesor/admin |
| name | VARCHAR(255) | - |
| institution | VARCHAR(255) | - |
| program_studi | VARCHAR(255) | - |
| phone | VARCHAR(50) | - |
| msp_org | VARCHAR(50) | UPPSMSP/SekretariatMSP/AssessorMSP |
| msp_credentials | JSONB | Encrypted cert + private key |
| is_active | BOOLEAN | Default TRUE |
| created_at | TIMESTAMP | - |
| updated_at | TIMESTAMP | - |
| last_login | TIMESTAMP | - |

#### Tabel: `sessions`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | UUID | Primary Key |
| user_id | UUID | FK -> users(id) |
| token | TEXT | Unique |
| expires_at | TIMESTAMP | - |
| created_at | TIMESTAMP | - |
| ip_address | VARCHAR(50) | - |
| user_agent | TEXT | - |

#### Tabel: `encryption_keys`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| submission_id | VARCHAR(255) | Unique |
| document_type | VARCHAR(50) | - |
| encryption_key | TEXT | Base64 encoded 256-bit key |
| encryption_iv | TEXT | Base64 encoded 128-bit IV |
| cid | TEXT | IPFS CID |
| created_at | TIMESTAMP | - |
| updated_at | TIMESTAMP | - |

#### Tabel: `submission_assignments`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| submission_id | VARCHAR(255) | Unique |
| assessor_user_id | UUID | FK -> users(id) |
| assigned_by | UUID | FK -> users(id) |
| status | VARCHAR(20) | pending/accepted/rejected |
| decision_notes | TEXT | - |
| decided_at | TIMESTAMP | - |
| decided_by | UUID | FK -> users(id) |
| notes | TEXT | - |
| created_at | TIMESTAMP | - |
| updated_at | TIMESTAMP | - |

#### Tabel: `audit_logs`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| user_id | UUID | FK -> users(id) |
| action | VARCHAR(100) | - |
| entity_type | VARCHAR(50) | - |
| entity_id | VARCHAR(255) | - |
| details | JSONB | - |
| ip_address | VARCHAR(50) | - |
| user_agent | TEXT | - |
| created_at | TIMESTAMP | - |

#### Tabel: `submission_metadata`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| submission_id | VARCHAR(255) | Unique |
| user_id | UUID | FK -> users(id) |
| upload_ip | VARCHAR(50) | - |
| upload_user_agent | TEXT | - |
| file_metadata | JSONB | size, mimetype, checksums |
| processing_logs | JSONB | Upload/encryption logs |
| created_at | TIMESTAMP | - |
| updated_at | TIMESTAMP | - |

#### Tabel: `analytics`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| event_type | VARCHAR(100) | - |
| user_id | UUID | FK -> users(id) |
| submission_id | VARCHAR(255) | - |
| metrics | JSONB | - |
| created_at | TIMESTAMP | - |

#### Tabel: `notifications`
| Kolom | Tipe Data | Keterangan |
|:------|:----------|:-----------|
| id | SERIAL | Primary Key |
| user_id | UUID | FK -> users(id) |
| title | VARCHAR(255) | - |
| message | TEXT | - |
| type | VARCHAR(50) | Default 'info' |
| is_read | BOOLEAN | Default FALSE |
| related_submission_id | VARCHAR(255) | - |
| created_at | TIMESTAMP | - |

### Penjelasan Tabel

| Nama Tabel | Deskripsi Singkat |
| :--- | :--- |
| `users` | Menyimpan akun pengguna (UPPS, Sekretariat, Asesor, KEA, Admin) beserta kredensial MSP untuk blockchain. |
| `sessions` | Menyimpan sesi login aktif pengguna (JWT token, IP, user agent). |
| `encryption_keys` | Menyimpan kunci enkripsi AES-256-CBC untuk dokumen yang disimpan di IPFS. |
| `submission_assignments` | Menghubungkan pengajuan dengan asesor yang ditugaskan, termasuk status penugasan. |
| `audit_logs` | Catatan audit detail untuk semua aktivitas sistem (lebih detail dari blockchain). |
| `submission_metadata` | Metadata tambahan pengajuan yang tidak disimpan di blockchain. |
| `analytics` | Data statistik penggunaan sistem untuk analitik. |
| `notifications` | Notifikasi pengguna (bukan di blockchain). |
