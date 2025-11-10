# 📋 PROSEDUR SISTEM AKREDITASI BLOCKCHAIN LAM-TEK 2025

**Sistem:** Blockchain-based Accreditation Management System with AI  
**Versi:** 1.0.0  
**Tanggal:** 7 November 2025

---

## 📑 DAFTAR ISI

1. [Deskripsi Halaman Sistem](#deskripsi-halaman-sistem)
2. [Prosedur Instalasi Sistem](#1-prosedur-instalasi-sistem)
3. [Prosedur Inisialisasi Blockchain](#2-prosedur-inisialisasi-blockchain)
4. [Prosedur Submission Dokumen (UPPS)](#3-prosedur-submission-dokumen-upps)
5. [Prosedur Verifikasi Dokumen (Sekretariat)](#4-prosedur-verifikasi-dokumen-sekretariat)
6. [Prosedur Perhitungan Skor LAM-TEK](#5-prosedur-perhitungan-skor-lam-tek)
7. [Prosedur Monitoring & Troubleshooting](#6-prosedur-monitoring--troubleshooting)
8. [Prosedur Backup & Recovery](#7-prosedur-backup--recovery)

---

## 📱 DESKRIPSI HALAMAN SISTEM

Sistem Akreditasi Blockchain LAM-TEK 2025 memiliki dua dashboard utama yang dirancang untuk memenuhi kebutuhan spesifik setiap pengguna dalam proses akreditasi program studi.

### 🎓 Dashboard UPPS (Unit Pengelola Program Studi)

**Halaman Dashboard UPPS** digunakan sebagai platform utama bagi Unit Pengelola Program Studi untuk mengelola proses pengajuan akreditasi program studi. UPPS memiliki akses untuk mengunggah dokumen LED (Laporan Evaluasi Diri) dan LKPS (Laporan Kinerja Program Studi), melihat hasil analisis kelengkapan dokumen yang dilakukan oleh sistem AI berbasis Google Gemini, serta memantau status verifikasi dari Sekretariat LAM-TEK secara real-time. 

Dashboard ini menyediakan fitur notifikasi otomatis yang memberikan informasi langsung kepada UPPS ketika terjadi perubahan status submission, baik saat dokumen sedang dianalisis oleh AI, sedang dalam proses review oleh assessor, telah disetujui (approved), maupun ditolak (rejected) dengan catatan perbaikan. Selain itu, UPPS dapat melihat history lengkap dari semua submission yang pernah diajukan, termasuk versi-versi revisi dokumen, serta mengakses hasil perhitungan skor akreditasi berdasarkan 7 Kriteria LAM-TEK 2025 (Diferensiasi Misi, Akuntabilitas, Relevansi Pendidikan, Sumber Daya Manusia, Sarana Prasarana, Mahasiswa dan Luaran, serta Sistem Penjaminan Mutu).

Semua data submission yang diunggah oleh UPPS akan tersimpan secara terdesentralisasi di jaringan IPFS (InterPlanetary File System) melalui layanan Pinata dengan sistem hash SHA-256 untuk menjamin integritas dokumen, sementara metadata submission dicatat secara immutable di blockchain Hyperledger Fabric untuk transparansi dan audit trail yang tidak dapat diubah.

---

### 👨‍💼 Dashboard Assessor/Sekretariat LAM-TEK

**Halaman Dashboard Assessor** digunakan sebagai pusat kendali bagi Sekretariat LAM-TEK untuk melakukan verifikasi, validasi, dan penilaian terhadap dokumen akreditasi yang diajukan oleh berbagai UPPS. Assessor memiliki hak akses yang lebih luas dibandingkan UPPS, mencakup kemampuan untuk melihat seluruh daftar submission dari semua institusi, mengunduh dokumen LED dan LKPS langsung dari jaringan IPFS untuk verifikasi manual, serta memberikan keputusan akhir berupa approval (persetujuan) atau rejection (penolakan) disertai catatan detail untuk perbaikan.

Dashboard Assessor dilengkapi dengan sistem filter dan pencarian canggih yang memungkinkan Sekretariat untuk menyortir submission berdasarkan status (Under Review, Approved, Rejected), institusi, program studi, tanggal pengajuan, atau tipe program (Sarjana, Magister, Doktor, dll). Setiap submission yang direview akan menampilkan hasil analisis AI secara komprehensif, termasuk skor kelengkapan dokumen (completeness score 0-100%), flag atau peringatan jika ada kekurangan data, serta rekomendasi perbaikan yang dihasilkan oleh AI.

Proses verifikasi yang dilakukan oleh Assessor mencakup validasi hash SHA-256 untuk memastikan keaslian dokumen yang diunduh dari IPFS, review manual terhadap kelengkapan 7 Kriteria LAM-TEK 2025, serta pemberian keputusan yang akan langsung tercatat di blockchain sebagai bukti digital yang permanen dan dapat diaudit. Setiap keputusan yang dibuat oleh Assessor akan memicu notifikasi real-time melalui WebSocket kepada UPPS terkait, memastikan komunikasi yang transparan dan responsif dalam proses akreditasi.

Dashboard ini juga menyediakan statistik dan analytics untuk monitoring performa submission secara keseluruhan, membantu Sekretariat dalam mengidentifikasi tren, bottleneck, dan area yang memerlukan perhatian khusus dalam proses akreditasi.

---

### 🔐 Perbedaan Hak Akses

| Fitur | Dashboard UPPS | Dashboard Assessor |
|-------|----------------|-------------------|
| **Unggah Dokumen LED/LKPS** | ✅ Ya | ❌ Tidak |
| **Lihat Submission Sendiri** | ✅ Ya | ✅ Ya |
| **Lihat Semua Submission** | ❌ Tidak | ✅ Ya |
| **Unduh Dokumen dari IPFS** | ✅ Ya (milik sendiri) | ✅ Ya (semua submission) |
| **Melihat Hasil Analisis AI** | ✅ Ya | ✅ Ya |
| **Setujui/Tolak Submission** | ❌ Tidak | ✅ Ya |
| **Memberikan Catatan Verifikasi** | ❌ Tidak | ✅ Ya |
| **Filter & Pencarian Submission** | ✅ Terbatas | ✅ Penuh |
| **Lihat Transaksi Blockchain** | ✅ Ya | ✅ Ya |
| **Lihat Hasil Penilaian** | ✅ Ya (milik sendiri) | ✅ Ya (semua) |
| **Statistik & Analitik** | ✅ Terbatas | ✅ Lengkap |
| **Notifikasi Waktu Nyata** | ✅ Ya | ✅ Ya |

---

### 🌐 Akses Halaman

**Dashboard UPPS:**
- URL: `http://localhost:5173/` atau `http://localhost:5173/upps`
- Peran: UPPS (Unit Pengelola Program Studi)
- Fungsi Utama: Kirim dokumen, pantau status, lihat penilaian

**Dashboard Assessor:**
- URL: `http://localhost:5173/sekretariat` atau `http://localhost:5173/assessor`
- Peran: Sekretariat LAM-TEK / Asesor
- Fungsi Utama: Tinjau submission, verifikasi dokumen, setujui/tolak

---

### 🔄 Alur Interaksi Antar Dashboard

```
┌─────────────────────┐
│   Dashboard UPPS    │
│  (Program Studi)    │
└──────────┬──────────┘
           │
           │ 1. Unggah LED & LKPS
           ▼
┌─────────────────────────────────┐
│   Backend API + Blockchain      │
│   - Penyimpanan IPFS (Pinata)   │
│   - Analisis AI (Gemini)        │
│   - Blockchain (Hyperledger)    │
└──────────┬──────────────────────┘
           │
           │ 2. Kirim untuk Ditinjau
           ▼
┌─────────────────────┐
│ Dashboard Assessor  │
│  (Sekretariat)      │
└──────────┬──────────┘
           │
           │ 3. Tinjau & Keputusan
           ▼
┌─────────────────────────────────┐
│   Blockchain + WebSocket        │
│   - Rekam Keputusan             │
│   - Kirim Notifikasi            │
└──────────┬──────────────────────┘
           │
           │ 4. Notifikasi
           ▼
┌─────────────────────┐
│   Dashboard UPPS    │
│   (Status Diperbarui) │
└─────────────────────┘
```

---

### 📊 Fitur Unggulan Dashboard

**Dashboard UPPS:**
- 📤 **Unggah Multi-file**: Unggah LED dan LKPS sekaligus dengan seret & lepas
- 🤖 **Analisis AI Waktu Nyata**: Analisis kelengkapan dokumen otomatis dalam hitungan detik
- 📈 **Pelacakan Progres**: Pantau status submission dari sedang ditinjau hingga disetujui
- 🔔 **Notifikasi Waktu Nyata**: Notifikasi WebSocket untuk setiap perubahan status
- 📊 **Dashboard Penilaian**: Visualisasi skor 7 Kriteria LAM-TEK 2025
- 📜 **Riwayat Lengkap**: Riwayat semua submission termasuk versi revisi
- 🔗 **Bukti Blockchain**: Lihat ID transaksi dan nomor blok sebagai bukti digital
- 🔒 **Verifikasi SHA-256**: Verifikasi integritas file dengan hash SHA-256

**Dashboard Assessor:**
- 📋 **Antrean Submission**: Daftar semua submission dengan status dan prioritas
- 🔍 **Filter Lanjutan**: Filter berdasarkan status, institusi, program, tanggal
- 🔎 **Pencarian Cerdas**: Pencarian cepat berdasarkan ID submission atau nama program
- 📥 **Unduh dari IPFS**: Unduh dokumen langsung dari IPFS untuk tinjauan offline
- ✅ **Alur Keputusan**: Setujui atau tolak dengan catatan detail
- 📊 **Dashboard Analitik**: Statistik submission, tingkat persetujuan, waktu rata-rata tinjauan
- 🔗 **Audit Blockchain**: Lacak riwayat lengkap submission di blockchain
- 👥 **Dukungan Multi-asesor**: Sistem mendukung banyak asesor dengan log aktivitas
- 💬 **Catatan & Komentar**: Memberikan umpan balik detail untuk perbaikan UPPS
- 📈 **Metrik Kinerja**: Pantau performa tinjauan dan hambatan proses

---

### ⏳ Modal Proses Dokumen (Dashboard UPPS)

**Modal "Memproses Dokumen"** digunakan sebagai indikator visual yang menampilkan progres real-time saat UPPS melakukan upload dan submission dokumen LED dan LKPS. Modal ini muncul secara otomatis ketika pengguna menekan tombol "Submit" setelah memilih file LED dan LKPS, dan tidak dapat ditutup hingga seluruh proses selesai untuk memastikan integritas data yang diunggah ke sistem blockchain.

Modal ini menampilkan 6 tahapan proses yang berjalan secara sekuensial dengan indikator visual berupa nomor urut, ikon loading, dan status teks yang berubah secara dinamis:

#### 📋 Tahapan Proses:

**1️⃣ Memverifikasi LED**
- **Proses**: Sistem melakukan validasi format file LED (PDF), ukuran file (maksimal 10MB), dan pengecekan struktur dokumen
- **Validasi**: Memastikan file LED memenuhi standar LAM-TEK 2025 dan dapat dibaca oleh sistem
- **Keluaran**: Hash SHA-256 untuk file LED yang akan disimpan sebagai bukti integritas
- **Durasi**: ~2-5 detik tergantung ukuran file

**2️⃣ Memverifikasi LKPS**
- **Proses**: Sistem melakukan validasi format file LKPS (Excel/PDF), ukuran file, dan pengecekan kelengkapan field data
- **Validasi**: Memastikan LKPS mengandung data 7 Kriteria LAM-TEK (DM, AK, REL, SDM, SARPRAS, MHS, SPM)
- **Keluaran**: Hash SHA-256 untuk file LKPS sebagai sidik jari digital
- **Durasi**: ~2-5 detik tergantung ukuran dan kompleksitas file

**3️⃣ Analisis AI**
- **Proses**: Sistem menggunakan Google Gemini 1.5 Flash untuk menganalisis kelengkapan dokumen LED dan LKPS secara mendalam
- **Analisis**: AI membaca konten dokumen, mengidentifikasi field yang terisi, mendeteksi kekurangan data, dan memberikan rekomendasi perbaikan
- **Keluaran**: Skor kelengkapan (0-100%), daftar field yang kurang lengkap, dan saran untuk perbaikan
- **Durasi**: ~10-30 detik tergantung kompleksitas dokumen (tahap paling lama)

**4️⃣ Analisis Penilaian**
- **Proses**: Sistem menghitung skor awal berdasarkan 7 Kriteria LAM-TEK 2025 menggunakan algoritma penilaian otomatis
- **Perhitungan**: Mengekstrak data numerik dari LKPS dan menerapkan formula LAM-TEK untuk setiap kriteria (DM, AK, REL, SDM, SARPRAS, MHS, SPM)
- **Keluaran**: Skor per kriteria (0-4 skala LAM-TEK), skor total, dan kategori akreditasi (Unggul/Baik Sekali/Baik/Kurang)
- **Durasi**: ~3-8 detik untuk perhitungan 7 kriteria

**5️⃣ Unggah ke IPFS**
- **Proses**: Sistem mengunggah file LED dan LKPS ke jaringan IPFS (InterPlanetary File System) melalui layanan Pinata
- **Unggah**: File disimpan secara terdesentralisasi dan mendapatkan CID (Content Identifier) unik yang tidak dapat diubah
- **Keluaran**: Hash IPFS (CID) untuk LED dan LKPS, serta URL akses file di gateway Pinata
- **Durasi**: ~5-15 detik tergantung ukuran file dan kecepatan koneksi internet

**6️⃣ Simpan ke Blockchain**
- **Proses**: Sistem mencatat metadata submission ke blockchain Hyperledger Fabric menggunakan chaincode "submission-contract"
- **Rekam**: Menyimpan ID submission, ID UPPS, program studi, hash IPFS, hash SHA-256, hasil analisis AI, hasil penilaian, dan stempel waktu
- **Keluaran**: ID Transaksi (TxID) dan Nomor Blok sebagai bukti digital yang tidak dapat diubah dan dapat diaudit
- **Durasi**: ~3-8 detik untuk memanggil chaincode dan commit ke ledger

#### ⏱️ Informasi Waktu Proses:

Modal menampilkan **timer real-time** yang menghitung durasi proses dalam format `MM:SS` (contoh: `0:01`, `0:15`, `1:23`). Total waktu proses normal berkisar **25-70 detik**, dengan tahap "Analisis AI" sebagai tahap terlama karena melibatkan pemrosesan dokumen oleh Google Gemini API.

Setiap tahap yang sedang berjalan ditandai dengan:
- ✅ **Centang hijau**: Tahap selesai berhasil
- ⏳ **Berputar/Memuat**: Tahap sedang berjalan
- ⏸️ **Menganggur**: Tahap belum dimulai

#### 🔔 Notifikasi Setelah Proses:

Setelah tahap ke-6 selesai, modal akan otomatis tertutup dan sistem menampilkan:
- ✅ **Notifikasi Berhasil**: "Dokumen berhasil dikirim! ID Submission: SUB-20251107-001"
- 📊 **Pengalihan otomatis**: Mengarahkan pengguna ke halaman detail submission untuk melihat hasil lengkap
- 🔗 **Bukti Blockchain**: Menampilkan ID Transaksi dan Nomor Blok sebagai bukti penyimpanan
- 📧 **Notifikasi Email**: Mengirim email konfirmasi ke UPPS (opsional)

#### ❌ Penanganan Kesalahan:

Jika terjadi kegagalan di salah satu tahap:
- 🚫 **Modal tetap terbuka**: Menampilkan tahap yang gagal dengan ikon kesalahan merah
- 📝 **Pesan Kesalahan**: Menjelaskan penyebab kegagalan (contoh: "File LED terlalu besar", "IPFS timeout", "Blockchain tidak dapat dijangkau")
- 🔄 **Tombol Coba Lagi**: Memberikan opsi untuk mengulang proses dari tahap yang gagal
- 💾 **Simpan otomatis**: Data yang sudah berhasil diproses disimpan sementara untuk mencegah kehilangan data

---

### 📊 Halaman Dashboard Sekretariat/Assessor

**Halaman Dashboard Sekretariat** digunakan sebagai workspace utama bagi Assessor LAM-TEK untuk melakukan manajemen, verifikasi, dan penilaian terhadap seluruh submission akreditasi yang masuk dari berbagai UPPS di seluruh Indonesia. Dashboard ini dirancang dengan antarmuka yang intuitif dan dilengkapi sistem filtering canggih untuk memudahkan Assessor dalam mengelola ratusan atau bahkan ribuan submission secara efisien.

Sekretariat memiliki hak akses penuh untuk melihat semua submission dalam berbagai status (Pending Review, Under Review, Approved, Rejected), melakukan download dokumen LED dan LKPS langsung dari IPFS untuk analisis offline, memberikan keputusan verifikasi dengan catatan detail, serta memantau statistik dan performa proses akreditasi secara keseluruhan. Sementara itu, UPPS hanya dapat melihat submission milik institusi mereka sendiri tanpa akses untuk melakukan verifikasi atau approval terhadap submission lain.

#### 🎯 Komponen Utama Dashboard Sekretariat:

**1. 📊 Panel Statistik**
- **Total Submission**: Jumlah keseluruhan submission yang masuk dalam periode tertentu
- **Menunggu Tinjauan**: Submission baru yang belum ditinjau oleh asesor
- **Sedang Ditinjau**: Submission yang sedang dalam proses verifikasi
- **Disetujui**: Submission yang telah disetujui dan memenuhi standar
- **Ditolak**: Submission yang ditolak dengan catatan perbaikan
- **Waktu Rata-rata Tinjauan**: Rata-rata waktu yang dibutuhkan untuk tinjauan per submission
- **Tingkat Persetujuan**: Persentase submission yang disetujui vs ditolak
- **Grafik Tren**: Visualisasi tren submission per bulan/minggu dengan grafik interaktif

**2. 🔍 Pencarian & Penyaringan**
- **Filter berdasarkan Status**: Dropdown untuk memfilter submission berdasarkan status (Semua, Menunggu, Sedang Ditinjau, Disetujui, Ditolak)
- **Filter berdasarkan Institusi**: Dropdown untuk memfilter berdasarkan universitas/institusi UPPS
- **Filter berdasarkan Program**: Filter berdasarkan nama program studi (Teknik Informatika, Teknik Sipil, dll)
- **Filter berdasarkan Rentang Tanggal**: Pemilih tanggal untuk memilih rentang tanggal submission
- **Bilah Pencarian**: Pencarian cepat berdasarkan ID Submission, nama program, atau nama institusi
- **Opsi Pengurutan**: Pengurutan berdasarkan tanggal (terbaru/terlama), status, atau nama institusi

**3. 📋 Tabel Daftar Submission**

Tabel utama yang menampilkan daftar submission dengan kolom-kolom berikut:

| Kolom | Deskripsi |
|-------|-----------|
| **ID Submission** | ID unik submission (contoh: SUB-20251107-001) dengan tautan ke detail |
| **Institusi** | Nama universitas/institusi UPPS |
| **Program Studi** | Nama program studi yang diajukan |
| **Jenjang** | Jenjang pendidikan (S1/S2/S3/D3/D4) |
| **Tanggal Kirim** | Stempel waktu kapan submission dibuat |
| **Status** | Lencana berwarna (🟡 Menunggu / 🔵 Sedang Ditinjau / 🟢 Disetujui / 🔴 Ditolak) |
| **Skor AI** | Skor kelengkapan dari analisis AI (0-100%) |
| **Skor Akreditasi** | Skor total akreditasi LAM-TEK (0-400) |
| **Asesor** | Nama asesor yang melakukan tinjauan (jika sudah ditugaskan) |
| **Aksi** | Tombol aksi (Lihat Detail, Unduh, Verifikasi, Setujui/Tolak) |

**4. 📄 Tampilan Detail Submission**

Ketika Asesor mengklik submission, akan muncul panel detail yang menampilkan:

- **Informasi Umum**:
  - ID Submission, Institusi, Program Studi, Jenjang, Tanggal Kirim
  - Narahubung UPPS (nama, email, telepon)
  - Status saat ini dan riwayat perubahan status

- **File Dokumen**:
  - 📁 **File LED**: Nama file, ukuran, Hash IPFS, tombol Unduh
  - 📁 **File LKPS**: Nama file, ukuran, Hash IPFS, tombol Unduh
  - 🔒 **Hash SHA-256**: Hash untuk verifikasi integritas file
  - 🔗 **URL Gateway IPFS**: Tautan langsung ke file di IPFS

- **Hasil Analisis AI**:
  - ✅ **Skor Kelengkapan**: Persentase kelengkapan dokumen (contoh: 87.5%)
  - 📊 **Cakupan Field**: Daftar field yang terisi vs belum terisi
  - ⚠️ **Peringatan**: Peringatan jika ada data yang kurang atau tidak valid
  - 💡 **Saran AI**: Rekomendasi perbaikan dari analisis Gemini AI
  - 📝 **Komentar AI**: Catatan detail hasil analisis AI

- **Rincian Penilaian (7 Kriteria LAM-TEK)**:
  - 🎯 **DM (Diferensiasi Misi)**: Skor 0-4 dengan penjelasan
  - 🎯 **AK (Akuntabilitas)**: Skor 0-4 dengan penjelasan
  - 🎯 **REL (Relevansi Pendidikan)**: Skor 0-4 dengan penjelasan
  - 🎯 **SDM (Sumber Daya Manusia)**: Skor 0-4 dengan penjelasan
  - 🎯 **SARPRAS (Sarana Prasarana)**: Skor 0-4 dengan penjelasan
  - 🎯 **MHS (Mahasiswa dan Luaran)**: Skor 0-4 dengan penjelasan
  - 🎯 **SPM (Sistem Penjaminan Mutu)**: Skor 0-4 dengan penjelasan
  - 📊 **Skor Total**: Jumlah skor keseluruhan (0-400)
  - 🏆 **Prediksi Akreditasi**: Unggul (361-400) / Baik Sekali (301-360) / Baik (200-300) / Kurang (<200)

- **Informasi Blockchain**:
  - 🔗 **ID Transaksi (TxID)**: Hash transaksi di blockchain
  - 📦 **Nomor Blok**: Nomor blok tempat data tersimpan
  - ⏰ **Stempel Waktu**: Waktu pencatatan di blockchain
  - 🔐 **Channel**: Nama channel Hyperledger Fabric (akreditasi)
  - 🏢 **Chaincode**: Nama kontrak pintar (submission-contract)

- **Bagian Verifikasi Asesor**:
  - 📝 **Catatan Asesor**: Area teks untuk Asesor menulis catatan verifikasi
  - 📋 **Daftar Periksa Tinjauan**: Daftar periksa verifikasi 7 kriteria LAM-TEK
  - 📎 **Lampirkan File**: Unggah dokumen pendukung hasil tinjauan (opsional)
  - ✅ **Tombol Setujui**: Tombol hijau untuk menyetujui submission
  - ❌ **Tombol Tolak**: Tombol merah untuk menolak submission dengan catatan perbaikan
  - 🔄 **Minta Revisi**: Tombol kuning untuk meminta revisi dokumen

**5. 🔔 Pusat Notifikasi Waktu Nyata**
- **Penghitung Lencana**: Menampilkan jumlah notifikasi baru yang belum dibaca
- **Daftar Notifikasi**: Daftar notifikasi tentang submission baru, perubahan status, atau aktivitas penting
- **Tandai Sudah Dibaca**: Opsi untuk menandai notifikasi sebagai sudah dibaca
- **Suara Notifikasi**: Suara notifikasi saat ada submission baru (dapat dimatikan)

**6. 📈 Analitik & Pelaporan**
- **Grafik Tren Submission**: Grafik batang/garis menampilkan tren submission per bulan
- **Distribusi Status**: Diagram lingkaran distribusi submission berdasarkan status
- **Kinerja Institusi**: Peringkat institusi berdasarkan jumlah submission yang disetujui
- **Beban Kerja Asesor**: Daftar beban kerja setiap asesor untuk distribusi merata
- **Ekspor Laporan**: Tombol untuk mengekspor data ke Excel/PDF untuk laporan

#### 🎨 Tampilan Visual Dashboard:

Dashboard Sekretariat menggunakan desain modern dengan:
- **Kode Warna**: 🟡 Kuning (Menunggu), 🔵 Biru (Sedang Ditinjau), 🟢 Hijau (Disetujui), 🔴 Merah (Ditolak)
- **Tata Letak Responsif**: Tampilan optimal di desktop, tablet, dan ponsel
- **Mode Gelap/Terang**: Tema gelap dan terang sesuai preferensi pengguna
- **Status Memuat**: Skeleton loading dan bilah progres untuk pengalaman pengguna yang mulus
- **Status Kosong**: Ilustrasi dan pesan jika tidak ada data submission
- **Status Kesalahan**: Pesan kesalahan yang informatif jika terjadi masalah koneksi

#### 🔐 Fitur Keamanan:

- **Kontrol Akses Berbasis Peran (RBAC)**: Hanya peran "Sekretariat" yang dapat mengakses dashboard ini
- **Timeout Sesi**: Keluar otomatis setelah 30 menit tidak aktif
- **Log Audit**: Semua aktivitas Asesor tercatat (lihat, unduh, setujui, tolak)
- **Autentikasi Dua Faktor**: Opsi 2FA untuk keamanan ekstra (opsional)
- **Daftar Putih IP**: Pembatasan akses berdasarkan alamat IP (untuk produksi)

#### 🚀 Optimasi Kinerja:

- **Pemuatan Lambat**: Tabel submission dimuat secara bertahap (paginasi 20 item per halaman)
- **Penyimpanan Cache**: Cache data submission untuk mengurangi query ke blockchain
- **WebSocket**: Pembaruan waktu nyata tanpa perlu muat ulang halaman
- **Pencarian dengan Debounce**: Bilah pencarian dengan debounce 500ms untuk efisiensi
- **UI Optimistik**: Pembaruan UI langsung sebelum respons dari backend

---

## 1. PROSEDUR INSTALASI SISTEM

### 1.1 Persiapan Environment

**Tujuan:** Menyiapkan environment development/production

**Prasyarat:**
- Server/PC dengan minimal 8GB RAM
- OS: Linux (Ubuntu 20.04+) / macOS / Windows + WSL2
- Koneksi internet stabil

**Langkah-langkah:**

#### Step 1.1.1: Install Node.js
```bash
# Download dan install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi instalasi
node --version  # harus >= v18.0.0
npm --version   # harus >= 9.0.0
```

**Expected Output:**
```
v18.x.x
9.x.x
```

#### Step 1.1.2: Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Tambahkan user ke docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verifikasi
docker --version
docker-compose --version
```

**Expected Output:**
```
Docker version 24.x.x
Docker Compose version v2.20.x
```

#### Step 1.1.3: Install Fablo
```bash
# Install Fablo
sudo curl -Lf https://github.com/hyperledger-labs/fablo/releases/download/2.3.0/fablo.sh -o /usr/local/bin/fablo
sudo chmod +x /usr/local/bin/fablo

# Verifikasi
fablo version
```

**Expected Output:**
```
Fablo 2.3.0
```

---

### 1.2 Clone Repository

**Tujuan:** Mendapatkan source code sistem

#### Step 1.2.1: Clone dari GitHub
```bash
# Clone repository
git clone https://github.com/mvirgiawancr/blockchain-batap.git
cd blockchain-batap

# Verifikasi struktur folder
ls -la
```

**Expected Output:**
```
backend-express/
chaincode/
docs/
fablo-config.json
frontend/
README.md
...
```

---

### 1.3 Setup Backend (Express.js)

**Tujuan:** Mengkonfigurasi dan install backend API

#### Step 1.3.1: Install Dependencies
```bash
cd backend-express
npm install
```

**Expected Output:**
```
added 245 packages in 15s
```

#### Step 1.3.2: Konfigurasi Environment
```bash
# Copy environment template
cp .env.example .env

# Edit file .env
nano .env
```

**Isi file .env:**
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Pinata IPFS
PINATA_JWT=your_pinata_jwt_token_here

# Hyperledger Fabric
FABRIC_CONNECTION_PROFILE=../fablo-target/fabric-config/connection-profiles/connection-profile-sekretariat.json
FABRIC_CHANNEL_NAME=akreditasi
FABRIC_CHAINCODE_NAME=submission-contract

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Cara mendapatkan API Keys:**
- **GEMINI_API_KEY:** https://makersuite.google.com/app/apikey
- **PINATA_JWT:** https://app.pinata.cloud → API Keys → New Key

#### Step 1.3.3: Test Backend
```bash
# Test tanpa start server
npm run test

# Atau test health endpoint
npm run dev
# Buka browser: http://localhost:8000/health
```

**Expected Output:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-07T...",
  "service": "LAM-TEK 2025 Backend",
  "version": "1.0.0"
}
```

---

### 1.4 Setup Frontend (React)

**Tujuan:** Mengkonfigurasi dan install frontend

#### Step 1.4.1: Install Dependencies
```bash
cd ../frontend
npm install
```

**Expected Output:**
```
added 387 packages in 20s
```

#### Step 1.4.2: Konfigurasi Environment
```bash
# Copy environment template
cp .env.example .env

# Edit file .env
nano .env
```

**Isi file .env:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

#### Step 1.4.3: Test Frontend
```bash
npm run dev
# Akses: http://localhost:5173
```

**Expected Output di terminal:**
```
VITE v4.x.x ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 2. PROSEDUR INISIALISASI BLOCKCHAIN

### 2.1 Deploy Hyperledger Fabric Network

**Tujuan:** Menjalankan blockchain network dengan 3 organisasi

#### Step 2.1.1: Review Konfigurasi Fablo
```bash
cd /home/virgi/blockchain-new
cat fablo-config.json
```

**Verifikasi konfigurasi:**
- ✅ 3 Organisasi: Orderer, UPPS, Sekretariat
- ✅ Channel: akreditasi
- ✅ Chaincode: submission-contract
- ✅ Fabric version: 2.5.12

#### Step 2.1.2: Generate Network Configuration
```bash
# Generate configuration files
fablo generate

# Verifikasi folder fablo-target
ls -la fablo-target/
```

**Expected Output:**
```
fabric-config/
fabric-docker/
fabric-docker.sh
network-topology.mmd
```

#### Step 2.1.3: Start Blockchain Network
```bash
# Start semua containers
fablo up

# Tunggu sampai selesai (3-5 menit)
```

**Expected Output:**
```
✓ Creating orderer.orderer.akreditasi.local
✓ Creating peer0.upps.akreditasi.local
✓ Creating peer0.sekretariat.akreditasi.local
✓ Creating ca.upps.akreditasi.local
✓ Creating ca.sekretariat.akreditasi.local
✓ Creating couch0.upps.akreditasi.local
✓ Creating couch0.sekretariat.akreditasi.local
✓ Creating channel akreditasi
✓ Installing chaincode submission-contract
✓ Network started successfully!
```

#### Step 2.1.4: Verifikasi Network
```bash
# Check Docker containers
docker ps

# Expected: 10+ containers running
# - orderer
# - 2 peers (UPPS, Sekretariat)
# - 2 CouchDB
# - 2 CA
# - Fablo REST
```

**Verifikasi containers:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Expected Output:**
```
NAMES                                    STATUS
orderer.group1.orderer.akreditasi.local  Up 2 minutes
peer0.upps.akreditasi.local              Up 2 minutes
peer0.sekretariat.akreditasi.local       Up 2 minutes
couch0.upps.akreditasi.local             Up 2 minutes
couch0.sekretariat.akreditasi.local      Up 2 minutes
ca.upps.akreditasi.local                 Up 2 minutes
ca.sekretariat.akreditasi.local          Up 2 minutes
fablo-rest                               Up 2 minutes
```

#### Step 2.1.5: Test Blockchain Network
```bash
# Test Fablo REST API
curl http://localhost:8080/health

# Expected: {"status":"OK"}
```

---

### 2.2 Deploy Chaincode

**Tujuan:** Install dan instantiate smart contract

#### Step 2.2.1: Verifikasi Chaincode
```bash
cd chaincode/submission-contract

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verifikasi output
ls -la dist/
```

**Expected Output:**
```
index.js
submission-contract.js
types.js
```

#### Step 2.2.2: Test Chaincode (Opsional)
```bash
# Unit test (jika ada)
npm test
```

**Note:** Chaincode sudah otomatis di-deploy oleh `fablo up`

#### Step 2.2.3: Query Chaincode
```bash
# Query chaincode via Fablo REST API
curl -X POST http://localhost:8080/query/akreditasi/submission-contract \
  -H "Content-Type: application/json" \
  -d '{
    "function": "QueryAllSubmissions",
    "args": [],
    "org": "UPPSMSP",
    "user": "admin"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "payload": []
}
```

---

## 3. PROSEDUR SUBMISSION DOKUMEN (UPPS)

### 3.1 Persiapan Dokumen

**Tujuan:** UPPS mempersiapkan dokumen LED dan LKPS

**Prasyarat:**
- LED (Laporan Evaluasi Diri) dalam format PDF (max 50MB)
- LKPS (Laporan Kinerja Program Studi) dalam format Excel (max 50MB)
- Data program studi (nama, institusi, tipe program)

#### Step 3.1.1: Validasi Dokumen
**Checklist sebelum upload:**
- [ ] File LED format PDF, ukuran < 50MB
- [ ] File LKPS format Excel (.xlsx), ukuran < 50MB
- [ ] LED berisi minimal 7 Kriteria LAM-TEK 2025
- [ ] LKPS berisi data lengkap sesuai template
- [ ] Nama file jelas (contoh: LED_TeknikInformatika_2025.pdf)

---

### 3.2 Login ke Dashboard UPPS

**Tujuan:** Mengakses sistem

#### Step 3.2.1: Akses Frontend
```bash
# Buka browser
http://localhost:5173
```

#### Step 3.2.2: Verifikasi Dashboard
**Pastikan terlihat:**
- ✅ Form upload dokumen
- ✅ Tabel submission history
- ✅ Menu navigasi

---

### 3.3 Upload Dokumen LED/LKPS

**Tujuan:** Submit dokumen untuk akreditasi

#### Step 3.3.1: Isi Form Upload
**Field yang harus diisi:**
1. **Program Studi** - Contoh: "Teknik Informatika S1"
2. **Institusi** - Contoh: "Universitas Indonesia"
3. **Tipe Program** - Pilih: S, M, D, D1, D2, D3, STr, MTr, DTr, atau PPI
4. **File LED** - Click "Choose LED File" → Pilih PDF
5. **File LKPS** - Click "Choose LKPS File" → Pilih Excel

#### Step 3.3.2: Submit Dokumen
```
1. Verifikasi semua field terisi
2. Click tombol "Submit"
3. Tunggu proses upload (loading indicator muncul)
```

**Proses yang terjadi di backend:**
```
[UPPS] → [Frontend] → [Backend API]
                          ↓
                    [Pinata IPFS] ← Upload files
                          ↓
                    [Generate SHA-256 hash]
                          ↓
                    [Gemini AI] ← Analyze documents
                          ↓
                    [Hyperledger Fabric] ← Store metadata
                          ↓
                    [WebSocket] → Notify UPPS
```

**Durasi:** 10-60 detik (tergantung ukuran file)

#### Step 3.3.3: Monitoring Progress
**Indikator di UI:**
- ⏳ Uploading to IPFS...
- 🤖 AI analyzing documents...
- 🔗 Saving to blockchain...
- ✅ Submission created!

---

### 3.4 Review Hasil Analisis AI

**Tujuan:** Melihat hasil analisis otomatis

#### Step 3.4.1: Lihat Submission Detail
**Klik pada submission yang baru dibuat**

**Informasi yang ditampilkan:**
```
Submission ID: SUB-20251107-ABC123
Status: Under Review (⏳)
Created At: 2025-11-07 10:30:45

Documents:
- LED.pdf (CID: bafybeig..., Hash: SHA256:a1b2c3...)
- LKPS.xlsx (CID: bafybeih..., Hash: SHA256:d4e5f6...)

AI Analysis:
✅ LED Detected: Yes
✅ LKPS Detected: Yes
📊 Completeness Score: 92%
🚩 Flags: []
💡 Recommendations:
  - Lengkapi data DTPS di kriteria 4
  - Perbarui data publikasi 3 tahun terakhir

Ready for Scoring: Yes
```

#### Step 3.4.2: Verifikasi Hash (Opsional)
```bash
# Download file dari IPFS
curl https://gateway.pinata.cloud/ipfs/bafybeig... -o LED_downloaded.pdf

# Hitung SHA-256 hash
sha256sum LED_downloaded.pdf

# Bandingkan dengan hash di sistem
```

**Expected:** Hash harus sama = file tidak berubah

---

### 3.5 Monitoring Status

**Tujuan:** Memantau status verifikasi

#### Step 3.5.1: Status Workflow
```
1. Under Review (⏳) → Menunggu verifikasi Sekretariat
2. Approved (✅) → Disetujui, lanjut ke scoring
3. Rejected (❌) → Ditolak, perlu perbaikan
```

#### Step 3.5.2: Notifikasi Real-time
**WebSocket akan mengirim notifikasi saat:**
- ✅ Submission created
- 🤖 AI analysis completed
- 👨‍💼 Sekretariat reviewed
- ✅ Approved
- ❌ Rejected

**Notifikasi muncul di:**
- Browser notification (jika diizinkan)
- Toast message di dashboard
- Badge di menu

---

## 4. PROSEDUR VERIFIKASI DOKUMEN (SEKRETARIAT)

### 4.1 Login ke Dashboard Sekretariat

**Tujuan:** Akses dashboard verifikator

#### Step 4.1.1: Akses Dashboard
```bash
# Buka browser
http://localhost:5173/sekretariat
```

#### Step 4.1.2: Verifikasi Dashboard
**Pastikan terlihat:**
- ✅ Daftar semua submission
- ✅ Filter status (under_review, approved, rejected)
- ✅ Statistik submission
- ✅ Search bar

---

### 4.2 Review Submission

**Tujuan:** Meninjau submission dari UPPS

#### Step 4.2.1: Lihat Daftar Submission
**Dashboard menampilkan tabel:**
```
Submission ID | Program Studi | Institusi | Status | Created At | Actions
SUB-001 | TI S1 | Univ A | Under Review | 2025-11-07 | [View]
SUB-002 | TE S1 | Univ B | Approved | 2025-11-06 | [View]
```

#### Step 4.2.2: Filter Submission
**Filter berdasarkan:**
- Status: Under Review / Approved / Rejected
- Institusi: Pilih dari dropdown
- Tanggal: Date range picker
- Search: Nama program studi atau submission ID

#### Step 4.2.3: Klik Detail Submission
```
Click tombol "View" pada submission yang ingin direview
```

**Detail yang ditampilkan:**
```
═══════════════════════════════════════════════
SUBMISSION DETAILS
═══════════════════════════════════════════════

Submission ID: SUB-20251107-ABC123
Program Studi: Teknik Informatika S1
Institusi: Universitas Indonesia
Program Type: S (Sarjana)
Status: Under Review
Version: 1
Created: 2025-11-07 10:30:45
Updated: 2025-11-07 10:31:20

───────────────────────────────────────────────
DOCUMENTS
───────────────────────────────────────────────

1. LED (Laporan Evaluasi Diri)
   Type: PDF
   CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
   Hash: SHA256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   Filename: LED_TeknikInformatika_2025.pdf
   Size: 12.5 MB
   [Download from IPFS]

2. LKPS (Laporan Kinerja Program Studi)
   Type: Excel
   CID: bafybeihkoviema7g3gxyt6la7pbvnh9yfbtxqbm3qfj5drhsmcbljqzrme
   Hash: SHA256:q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
   Filename: LKPS_TeknikInformatika_2025.xlsx
   Size: 2.3 MB
   [Download from IPFS]

───────────────────────────────────────────────
AI ANALYSIS RESULTS
───────────────────────────────────────────────

✅ LED Detected: Yes (Confidence: 98%)
✅ LKPS Detected: Yes (Confidence: 95%)

📊 Completeness Score: 92/100

🚩 Flags: None

💡 AI Recommendations:
  1. Kriteria 4 (SDM): Data DTPS kurang lengkap
  2. Kriteria 4 (SDM): Publikasi 3 tahun terakhir perlu update
  3. Kriteria 6 (Mahasiswa): Data prestasi mahasiswa dapat ditambahkan

Ready for Scoring: Yes

Analyzed At: 2025-11-07 10:31:00

───────────────────────────────────────────────
BLOCKCHAIN INFORMATION
───────────────────────────────────────────────

Transaction ID: 0x1a2b3c4d5e6f7g8h9i0j
Block Number: 1234
Channel: akreditasi
Chaincode: submission-contract
Organization: UPPSMSP
Timestamp: 2025-11-07 10:31:20

───────────────────────────────────────────────
VERIFICATION SECTION
───────────────────────────────────────────────

[Decision Form]
○ Approve ● Reject

Notes: [Text area untuk catatan verifikator]

Decided By: [Input nama/ID verifikator]

[Submit Decision Button]
═══════════════════════════════════════════════
```

---

### 4.3 Download dan Verifikasi Dokumen

**Tujuan:** Verifikasi manual dokumen

#### Step 4.3.1: Download Dokumen dari IPFS
```
1. Click tombol "Download from IPFS" pada LED
2. Browser akan download file dari Pinata Gateway
3. Tunggu sampai download selesai
4. Ulangi untuk LKPS
```

**URL Download:**
```
https://gateway.pinata.cloud/ipfs/[CID]
```

#### Step 4.3.2: Verifikasi Hash SHA-256
```bash
# Linux/Mac
sha256sum LED_TeknikInformatika_2025.pdf

# Windows PowerShell
Get-FileHash LED_TeknikInformatika_2025.pdf -Algorithm SHA256

# Bandingkan dengan hash di sistem
```

**Expected:** Hash harus identik dengan yang di sistem

#### Step 4.3.3: Review Konten Dokumen
**Checklist LED:**
- [ ] Kriteria 1: Diferensiasi Misi ✅
- [ ] Kriteria 2: Akuntabilitas ✅
- [ ] Kriteria 3: Relevansi Pendidikan ✅
- [ ] Kriteria 4: SDM ⚠️ (perlu perbaikan)
- [ ] Kriteria 5: Sarana Prasarana ✅
- [ ] Kriteria 6: Mahasiswa & Luaran ✅
- [ ] Kriteria 7: Sistem Penjaminan Mutu ✅

**Checklist LKPS:**
- [ ] Data institusi lengkap ✅
- [ ] Data program studi valid ✅
- [ ] Data DTPS lengkap ⚠️
- [ ] Data publikasi update ⚠️
- [ ] Data mahasiswa valid ✅
- [ ] Data lulusan valid ✅

---

### 4.4 Memberikan Keputusan

**Tujuan:** Approve atau Reject submission

#### Step 4.4.1: Pilih Keputusan
**Option 1: Approve**
```
Pilih: ● Approve ○ Reject

Notes: "Dokumen lengkap dan memenuhi semua kriteria LAM-TEK 2025. 
        Beberapa data masih bisa diperbaiki untuk scoring optimal:
        - Lengkapi data DTPS di kriteria 4
        - Update publikasi 3 tahun terakhir
        
        Status: APPROVED untuk proses scoring."

Decided By: "Dr. Admin Sekretariat / admin001"

Click: [Submit Decision]
```

**Option 2: Reject**
```
Pilih: ○ Approve ● Reject

Notes: "Dokumen ditolak dengan alasan:
        1. Kriteria 4 (SDM): Data DTPS tidak lengkap (kurang 5 dosen)
        2. Kriteria 4 (SDM): Publikasi 3 tahun terakhir tidak ada
        3. LKPS: Sheet Kriteria 4 kosong
        
        Silakan perbaiki dan submit ulang.
        
        Status: REJECTED - Perlu perbaikan dokumen."

Decided By: "Dr. Admin Sekretariat / admin001"

Click: [Submit Decision]
```

#### Step 4.4.2: Konfirmasi Keputusan
**Dialog konfirmasi:**
```
╔═══════════════════════════════════════════╗
║   Confirm Decision                        ║
╠═══════════════════════════════════════════╣
║                                           ║
║   Submission: SUB-20251107-ABC123         ║
║   Decision: APPROVED                      ║
║                                           ║
║   Apakah Anda yakin?                      ║
║   Keputusan akan tercatat di blockchain   ║
║   dan tidak dapat diubah.                 ║
║                                           ║
║   [Cancel]  [Confirm]                     ║
╚═══════════════════════════════════════════╝
```

Click: **[Confirm]**

---

### 4.5 Proses Backend

**Tujuan:** Sistem memproses keputusan

**Backend workflow:**
```
[Sekretariat] → [Frontend] → [Backend API]
                                 ↓
                          [Fabric Service]
                                 ↓
                          [Blockchain] ← Update status & record decision
                                 ↓
                          [WebSocket Service]
                                 ↓
                    [Broadcast Notification]
                          ↙          ↘
                    [UPPS]      [Sekretariat]
```

**Database update:**
```json
{
  "submissionId": "SUB-20251107-ABC123",
  "status": "approved",
  "decision": {
    "result": "approved",
    "notes": "Dokumen lengkap dan memenuhi...",
    "decidedBy": "Dr. Admin Sekretariat / admin001",
    "decidedAt": "2025-11-07T11:15:30Z"
  },
  "previousDecisions": [],
  "version": 2,
  "updatedAt": "2025-11-07T11:15:30Z"
}
```

---

### 4.6 Notifikasi

**Tujuan:** Memberitahu stakeholder

#### Step 4.6.1: Notifikasi ke UPPS
**UPPS menerima notifikasi real-time via WebSocket:**
```
╔═══════════════════════════════════════════╗
║   🔔 Notification                         ║
╠═══════════════════════════════════════════╣
║                                           ║
║   ✅ Submission Approved!                 ║
║                                           ║
║   Your submission SUB-20251107-ABC123     ║
║   has been APPROVED by Sekretariat.       ║
║                                           ║
║   Notes: "Dokumen lengkap dan memenuhi    ║
║            semua kriteria..."             ║
║                                           ║
║   Next step: Scoring calculation          ║
║                                           ║
║   [View Details]  [Dismiss]               ║
╚═══════════════════════════════════════════╝
```

#### Step 4.6.2: Notifikasi ke Sekretariat
**Sekretariat menerima konfirmasi:**
```
╔═══════════════════════════════════════════╗
║   ✓ Decision Recorded                     ║
╠═══════════════════════════════════════════╣
║                                           ║
║   Decision has been saved to blockchain   ║
║   and notification sent to UPPS.          ║
║                                           ║
║   Transaction ID: 0x1a2b3c...             ║
║   Block: 1235                             ║
║                                           ║
║   [OK]                                    ║
╚═══════════════════════════════════════════╝
```

---

## 5. PROSEDUR PERHITUNGAN SKOR LAM-TEK

### 5.1 Trigger Scoring

**Tujuan:** Menghitung skor berdasarkan 7 Kriteria LAM-TEK 2025

**Prasyarat:**
- Submission status: Approved
- LKPS data lengkap
- Program type valid (S, M, D, dll)

#### Step 5.1.1: Ekstrak Data LKPS
**Backend membaca file LKPS dari IPFS:**
```javascript
// Baca LKPS Excel
const lkpsData = await extractLKPSData(ipfsCID);

// Expected output:
{
  programType: "S",
  bop_value: 45000000,
  ndtps: 29,
  rmd: 20,
  ripk: 3.51,
  publikasi_dtps: 150,
  // ... data lainnya
}
```

#### Step 5.1.2: Call Scoring Service
```bash
# API call
POST http://localhost:8000/api/v1/scoring/calculate
Content-Type: application/json

{
  "submissionId": "SUB-20251107-ABC123",
  "lkpsData": {
    "programType": "S",
    "bop_value": 45000000,
    "ndtps": 29,
    // ... data lainnya
  }
}
```

---

### 5.2 Perhitungan Skor per Kriteria

**Tujuan:** Menghitung skor 7 Kriteria LAM-TEK 2025

#### Kriteria 1: Diferensiasi Misi (DM)
**Input:** Data VMTS dari LED  
**Output:** Skor 0-4

#### Kriteria 2: Akuntabilitas (AK)
**Formula BOP:**
```
BOP = Total biaya operasional / Jumlah mahasiswa
Skor = interpolasi(BOP, threshold)
```

**Formula DPD:**
```
DPD = Dana penelitian DTPS / NDTPS
Skor = interpolasi(DPD, threshold)
```

**Formula Kerjasama (3D Interpolation):**
```
Skor = 3.75 × ((A+B+(C/2))-(A×B)-((A×C)/2)-((B×C)/2)+((A×B×C)/2))
```

#### Kriteria 3: Relevansi Pendidikan (REL)
**Input:** Data kurikulum, pembelajaran, penelitian  
**Formula:** Weighted average (1:2:1)

#### Kriteria 4: Sumber Daya Manusia (SDM)
**Input:**
- NDTPS (Jumlah dosen tetap)
- Kualifikasi dosen (S2/S3)
- Publikasi DTPS
- RIPK (Rata-rata indeks publikasi)

**Formula:**
```
Skor DTPS = interpolasi(persentase_S3, threshold)
Skor Publikasi = interpolasi(publikasi_per_dtps, threshold)
```

#### Kriteria 5: Sarana Prasarana & K3L (SARPRAS)
**Input:** Data fasilitas, laboratorium, K3L  
**Formula:** Weighted average (1:2:2)

#### Kriteria 6: Mahasiswa dan Luaran (MHS)
**Formula RMD:**
```
RMD = Jumlah mahasiswa / NDTPS

Program S: RMD optimal = 20
Program M: RMD optimal = 10
Program D: RMD optimal = 5

Skor = 4 - (2 * |RMD - RMD_optimal| / RMD_optimal)
```

**Formula Waktu Tunggu Lulusan:**
```
Program Vokasi: WT < 6 bulan → Skor 4
Program Sarjana: WT < 12 bulan → Skor 4
```

#### Kriteria 7: Sistem Penjaminan Mutu (SPM)
**Input:** Data SPMI, kepuasan stakeholder  
**Formula:** Weighted average (1:1)

---

### 5.3 Kalkulasi Total Skor

**Tujuan:** Aggregate skor dari 7 kriteria

#### Step 5.3.1: Hitung Total
```javascript
const totalScore = 
  skorDM + skorAK + skorREL + skorSDM + 
  skorSARPRAS + skorMHS + skorSPM;

const maxScore = 28; // 7 kriteria × 4 poin
const percentage = (totalScore / maxScore) * 100;
```

#### Step 5.3.2: Tentukan Kategori Akreditasi
```javascript
if (totalScore >= 361) {
  akreditasi = "Unggul";
} else if (totalScore >= 301) {
  akreditasi = "Baik Sekali";
} else if (totalScore >= 200) {
  akreditasi = "Baik";
} else {
  akreditasi = "Tidak Terakreditasi";
}
```

---

### 5.4 Simpan Hasil Scoring

**Tujuan:** Menyimpan hasil ke blockchain

#### Step 5.4.1: Update Submission
```javascript
// Update di blockchain
await fabricService.updateSubmission(submissionId, {
  scoring: {
    total_score: totalScore,
    max_possible_score: maxScore,
    overall_percentage: percentage,
    akreditasi: akreditasi,
    results: [
      { kriteria: "DM", score: skorDM, method: "..." },
      { kriteria: "AK", score: skorAK, method: "..." },
      // ... 5 kriteria lainnya
    ],
    calculated_at: new Date().toISOString()
  }
});
```

#### Step 5.4.2: Notifikasi Hasil
**WebSocket broadcast:**
```
[UPPS Dashboard] ← Notification: "Scoring completed! Total: 345/400"
```

---

## 6. PROSEDUR MONITORING & TROUBLESHOOTING

### 6.1 Monitoring System Health

**Tujuan:** Memastikan semua komponen berjalan

#### Step 6.1.1: Check Backend
```bash
curl http://localhost:8000/health
```

**Expected:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-07T12:00:00Z"
}
```

#### Step 6.1.2: Check Blockchain
```bash
docker ps | grep hyperledger
```

**Expected:** 10+ containers running

#### Step 6.1.3: Check Logs
```bash
# Backend logs
tail -f backend-express/logs/combined.log

# Frontend logs (dev mode)
# Lihat di terminal yang running npm run dev

# Blockchain logs
docker logs peer0.upps.akreditasi.local
```

---

### 6.2 Troubleshooting Common Issues

#### Issue 1: "Cannot connect to blockchain"

**Gejala:**
```
Error: Failed to connect to Fabric network
```

**Solusi:**
```bash
# 1. Check Docker containers
docker ps

# 2. Restart Fabric network
cd /home/virgi/blockchain-new
fablo down
fablo up

# 3. Verify connection profile
ls -la fablo-target/fabric-config/connection-profiles/

# 4. Test connection
curl http://localhost:8080/health
```

#### Issue 2: "IPFS upload failed"

**Gejala:**
```
Error: Pinata upload failed - 401 Unauthorized
```

**Solusi:**
```bash
# 1. Verify PINATA_JWT
cat backend-express/.env | grep PINATA_JWT

# 2. Test Pinata API
curl -H "Authorization: Bearer YOUR_PINATA_JWT" \
  https://api.pinata.cloud/data/testAuthentication

# 3. Generate new JWT token di Pinata dashboard
# 4. Update .env file
# 5. Restart backend
```

#### Issue 3: "AI analysis timeout"

**Gejala:**
```
Error: Gemini AI request timeout after 30s
```

**Solusi:**
```bash
# 1. Check GEMINI_API_KEY
cat backend-express/.env | grep GEMINI_API_KEY

# 2. Test Gemini API
curl -H "x-goog-api-key: YOUR_KEY" \
  https://generativelanguage.googleapis.com/v1/models

# 3. Check rate limits di Google AI Studio
# 4. Increase timeout di backend config
```

#### Issue 4: "WebSocket connection refused"

**Gejala:**
```
WebSocket connection to 'ws://localhost:8000/ws' failed
```

**Solusi:**
```bash
# 1. Check backend running
curl http://localhost:8000/health

# 2. Verify CORS settings
cat backend-express/.env | grep CORS_ORIGINS

# 3. Check browser console for errors
# 4. Test WebSocket manually
wscat -c ws://localhost:8000/ws?user_id=test
```

---

## 7. PROSEDUR BACKUP & RECOVERY

### 7.1 Backup Data

**Tujuan:** Backup data penting

#### Step 7.1.1: Backup Blockchain Data
```bash
# Stop network
fablo down

# Backup blockchain data
tar -czf blockchain-backup-$(date +%Y%m%d).tar.gz \
  fablo-target/fabric-docker/volumes/

# Start network
fablo up
```

#### Step 7.1.2: Backup Database (CouchDB)
```bash
# Export CouchDB data
docker exec couch0.upps.akreditasi.local \
  curl -X GET http://admin:adminpw@localhost:5984/_all_dbs

# Backup specific database
docker exec couch0.upps.akreditasi.local \
  curl -X GET http://admin:adminpw@localhost:5984/akreditasi/_all_docs \
  > couchdb-backup-$(date +%Y%m%d).json
```

#### Step 7.1.3: Backup Configuration
```bash
# Backup all config files
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  fablo-config.json \
  backend-express/.env \
  frontend/.env \
  chaincode/
```

---

### 7.2 Recovery

**Tujuan:** Restore sistem dari backup

#### Step 7.2.1: Restore Blockchain
```bash
# Stop network
fablo down

# Remove old data
rm -rf fablo-target/

# Extract backup
tar -xzf blockchain-backup-20251107.tar.gz

# Start network
fablo up
```

#### Step 7.2.2: Restore Configuration
```bash
# Extract config backup
tar -xzf config-backup-20251107.tar.gz

# Verify files
ls -la fablo-config.json backend-express/.env
```

---

## 📊 RINGKASAN PROSEDUR

### Flowchart Sistem Lengkap

```
┌─────────────────────────────────────────────────────────┐
│                   START SISTEM                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  1. INSTALASI                                           │
│  - Install Node.js, Docker, Fablo                       │
│  - Clone repository                                     │
│  - Setup backend & frontend                             │
│  - Configure .env files                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. INISIALISASI BLOCKCHAIN                             │
│  - fablo generate                                       │
│  - fablo up                                             │
│  - Deploy chaincode                                     │
│  - Verify network                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. SUBMISSION DOKUMEN (UPPS)                           │
│  - Login ke dashboard                                   │
│  - Upload LED & LKPS                                    │
│  - AI analysis (otomatis)                               │
│  - Simpan ke blockchain                                 │
│  - Status: Under Review                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. VERIFIKASI (SEKRETARIAT)                            │
│  - Login ke dashboard                                   │
│  - Review submission                                    │
│  - Download & verify dokumen                            │
│  - Approve / Reject                                     │
│  - Notifikasi ke UPPS                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
                 ┌───┴───┐
                 │Approved?│
                 └───┬───┘
                     │
            ┌────────┴────────┐
            │ YES             │ NO
            ▼                 ▼
┌──────────────────┐   ┌─────────────────┐
│  5. SCORING      │   │  REJECTED       │
│  - Extract LKPS  │   │  - UPPS revise  │
│  - Calculate 7   │   │  - Resubmit     │
│    Kriteria      │   └─────────────────┘
│  - Total score   │
│  - Kategori      │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  6. HASIL AKREDITASI                                    │
│  - Unggul (≥361)                                        │
│  - Baik Sekali (301-360)                                │
│  - Baik (200-300)                                       │
│  - Tidak Terakreditasi (<200)                           │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST OPERASIONAL

### Pre-Operation Checklist
- [ ] Node.js 18+ installed
- [ ] Docker & Docker Compose installed
- [ ] Fablo installed
- [ ] Repository cloned
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] .env files configured
- [ ] API keys valid (Gemini, Pinata)

### Daily Operation Checklist
- [ ] Blockchain network running (docker ps)
- [ ] Backend API responding (curl /health)
- [ ] Frontend accessible (http://localhost:5173)
- [ ] Logs monitored (tail -f logs/combined.log)
- [ ] No pending submissions > 24 hours

### Weekly Maintenance Checklist
- [ ] Backup blockchain data
- [ ] Backup database (CouchDB)
- [ ] Backup configuration files
- [ ] Review error logs
- [ ] Update dependencies (npm update)
- [ ] Test critical flows (upload, verify, scoring)

---

## 📞 KONTAK SUPPORT

**Technical Issues:**
- Repository: https://github.com/mvirgiawancr/blockchain-batap
- Issues: https://github.com/mvirgiawancr/blockchain-batap/issues

**Documentation:**
- Main README: `/README.md`
- API Docs: `http://localhost:8000/api/v1`
- Image Prompts: `/docs/image-prompts.md`
- Sistem Docs: `/docs/dokumentasi-sistem.html`

---

**END OF PROSEDUR SISTEM**  
**Version: 1.0.0**  
**Last Updated: 7 November 2025**
