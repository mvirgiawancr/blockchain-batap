# BUKU PANDUAN PENGUJIAN SISTEM AKRECHAIN
### Panduan Pengujian Per Modul (Black-Box Testing)

> Dokumen ini disusun sebagai lampiran bukti pengujian sistem **AkreChain** — Platform Akreditasi LAM-TEK Berbasis *Blockchain* dan *AI Scoring* — untuk melengkapi revisi jurnal.

---

## DAFTAR ISI

1. Pendahuluan
2. Lingkungan & Persiapan Pengujian
3. Metode Pengujian
4. Daftar Akun Uji (Role)
5. Peta Modul Sistem
6. Pengujian Modul
7. Rekapitulasi Hasil Pengujian
8. Kesimpulan

---

## 1. Pendahuluan

### 1.1 Tujuan
Buku panduan ini bertujuan untuk:
- Mendokumentasikan **fungsi setiap modul** pada sistem AkreChain.
- Menyediakan **skenario pengujian terstruktur** untuk membuktikan setiap modul berjalan sesuai rancangan.
- Menjadi **lampiran bukti pengujian (evidence)** pada revisi jurnal, dilengkapi tangkapan layar (*screenshot*) tiap modul.

### 1.2 Ruang Lingkup
Pengujian mencakup seluruh modul dari **6 (enam) aktor**: Umum (autentikasi), UPPS, Sekretariat, KEA, Asesor, dan Majelis; serta dua fitur kebaruan: **penilaian otomatis berbasis AI (RAG)** dan **ketertelusuran sertifikat berbasis blockchain**.

### 1.3 Gambaran Sistem
AkreChain adalah aplikasi web dengan arsitektur:
- **Frontend**: React + Vite (port `3000`)
- **Backend**: Node.js / Express (port `8000`)
- **Basis Data**: relasional, dengan integrasi *smart contract* untuk ketertelusuran sertifikat
- **AI**: Pipeline RAG (*Retrieval-Augmented Generation*) untuk penilaian butir akreditasi dari dokumen LED/LKPS

---

## 2. Lingkungan & Persiapan Pengujian

### 2.1 Spesifikasi Lingkungan Uji

| Komponen | Spesifikasi |
|---|---|
| Sistem Operasi | _(isi: mis. Windows 11 / Ubuntu 22.04 WSL)_ |
| Runtime Backend | Node.js v22 |
| Browser | _(isi: mis. Google Chrome v___ )_ |
| URL Frontend | `http://localhost:3000` |
| URL Backend/API | `http://localhost:8000` |
| Tanggal Pengujian | _(isi tanggal)_ |
| Penguji | _(isi nama)_ |

### 2.2 Langkah Menjalankan Sistem

Backend dijalankan lebih dulu, kemudian frontend pada terminal terpisah. Pastikan basis data telah terisi data awal (*seeding*) sebelum pengujian. Akun admin bawaan: `admin` / `password123`.

---

## 3. Metode Pengujian

Pengujian menggunakan metode **Black-Box Testing**, yaitu menguji fungsionalitas sistem berdasarkan input dan output tanpa melihat struktur kode internal. Setiap skenario uji dinilai dengan status **Valid** (sesuai harapan) atau **Tidak Valid** (tidak sesuai harapan).

Format setiap kasus uji: Kode · Skenario · Langkah · Data Masukan · Hasil yang Diharapkan · Hasil Aktual · Status.

---

## 4. Daftar Akun Uji (Role)

> Lengkapi kolom kredensial sesuai data hasil *seeding* pada sistem Anda.

| No | Peran (Role) | Username | Password | Keterangan |
|---|---|---|---|---|
| 1 | Admin | `admin` | `password123` | Akses penuh |
| 2 | UPPS (Prodi) | _(isi)_ | _(isi)_ | Pengusul akreditasi |
| 3 | Sekretariat | _(isi)_ | _(isi)_ | Administrasi & rilis |
| 4 | KEA | _(isi)_ | _(isi)_ | Penugasan & verifikasi |
| 5 | Asesor | _(isi)_ | _(isi)_ | Penilai butir |
| 6 | Majelis | _(isi)_ | _(isi)_ | Pemutus akreditasi |

---

## 5. Peta Modul Sistem

| Aktor | Modul |
|---|---|
| **Umum** | Login, Notifikasi, Traceability Sertifikat |
| **UPPS** | Dashboard, Tagihan & Pembayaran, Submission, Status Akreditasi, Persetujuan Asesor, Jadwal AL, Tanggapan terhadap AL |
| **Sekretariat** | Dashboard, Manajemen Pembayaran, Verifikasi Jadwal AL, Rilis Sertifikat |
| **KEA** | Dashboard, Penugasan Asesor, Review Penolakan, Monitoring AK, Analisis Konsistensi, Penjadwalan AL, Verifikasi Hasil AL, Data Asesor |
| **Asesor** | Dashboard, Penugasan Saya, Detail Penugasan, Penilaian AK, Pelaksanaan AL, Riwayat Penilaian |
| **Majelis** | Dashboard, Keputusan Akreditasi, Penetapan Keputusan |
| **Kebaruan** | AI Scoring (RAG), Blockchain Traceability |

---

## 6. Pengujian Modul

### 6.1 Modul Umum

#### 6.1.1 Login
**URL:** `/login` · **Aktor:** Semua peran. Halaman autentikasi yang mengarahkan pengguna ke dashboard sesuai perannya.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-01 | Login valid | Isi kredensial, klik **Login** | Username & password benar | Masuk ke dashboard sesuai role | | |
| TC-02 | Login salah | Isi password salah | Password salah | Pesan error, tetap di halaman login | | |

[[SHOT:01_login page.png|Gambar 6.1.1 — Halaman Login]]

#### 6.1.2 Notifikasi
**URL:** `/notifications` · **Aktor:** Semua peran. Menampilkan pemberitahuan terkait alur akreditasi pengguna.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-03 | Tampil notifikasi | Buka menu **Notifikasi** | - | Daftar notifikasi sesuai pengguna tampil | | |

[[SHOT:25_ UUPS Notifikasi.jpeg|Gambar 6.1.2 (a) — Notifikasi UPPS]]
[[SHOT:18_ Asesor Notifikasi.jpeg|Gambar 6.1.2 (b) — Notifikasi Asesor]]

#### 6.1.3 Traceability Sertifikat (Blockchain)
**URL:** `/traceability` · **Aktor:** Publik. Verifikasi keaslian & ketertelusuran sertifikat akreditasi melalui catatan *blockchain*.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-04 | Lacak sertifikat | Masukkan ID sertifikat, klik **Cari** | ID sertifikat sah | Data & jejak transaksi blockchain tampil | | |
| TC-05 | Riwayat blockchain | Klik detail riwayat | - | Rincian transaksi (hash) tampil | | |

[[SHOT:26_ Traceability.jpeg|Gambar 6.1.3 (a) — Halaman Traceability Sertifikat]]
[[SHOT:Modal Riwayat Blockchain.png|Gambar 6.1.3 (b) — Modal Riwayat Blockchain]]

---

### 6.2 Modul UPPS (Program Studi)

#### 6.2.1 Dashboard UPPS
**URL:** `/` · **Aktor:** UPPS. Ringkasan status akreditasi prodi & tahapan berjalan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-06 | Tampil dashboard | Login sebagai UPPS | - | Ringkasan status & statistik tampil | | |

[[SHOT:02_UUPS Dashboard.jpeg|Gambar 6.2.1 — Dashboard UPPS]]

#### 6.2.2 Tagihan & Pembayaran
**URL:** `/upps/payment` · **Aktor:** UPPS. Melihat tagihan dan mengunggah bukti pembayaran biaya akreditasi.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-07 | Unggah bukti bayar | Pilih file bukti, klik **Kirim** | File bukti (gambar/PDF) | Bukti terkirim, status menunggu verifikasi | | |
| TC-08 | Validasi file | Kirim tanpa file | (kosong) | Muncul validasi file wajib | | |

[[SHOT:05_UUPS Tagihan dan Pembayaran.jpeg|Gambar 6.2.2 (a) — Tagihan & Pembayaran UPPS]]
[[SHOT:Modal Unggah bukti pembayaran.png|Gambar 6.2.2 (b) — Modal Unggah Bukti Pembayaran]]
[[SHOT:Modal Loading Upload.png|Gambar 6.2.2 (c) — Proses Unggah Bukti]]

#### 6.2.3 Submission Saya
**URL:** `/submissions` · **Aktor:** UPPS. Pengajuan berkas akreditasi (LED/LKPS) dan pemantauan riwayat pengajuan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-09 | Buat pengajuan | Unggah dokumen, kirim | Dokumen LED/LKPS | Pengajuan tersimpan & masuk antrian | | |

[[SHOT:12_ UUPS Submission Saya.jpeg|Gambar 6.2.3 — Submission Saya (UPPS)]]

#### 6.2.4 Status Akreditasi
**URL:** `/status` · **Aktor:** UPPS. Memantau posisi pengajuan pada alur akreditasi.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-10 | Tampil status | Buka menu **Status Akreditasi** | - | Timeline tahapan & posisi terkini tampil | | |

[[SHOT:11_ UUPS Status Akreditasi.jpeg|Gambar 6.2.4 — Status Akreditasi]]

#### 6.2.5 Persetujuan Asesor
**URL:** `/upps/assignments` · **Aktor:** UPPS. Menyetujui/menolak asesor yang ditugaskan (mekanisme *conflict of interest*).

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-11 | Setujui asesor | Klik **Setujui** | - | Status asesor menjadi disetujui | | |
| TC-12 | Tolak asesor | Klik **Tolak**, isi alasan | Alasan penolakan | Penolakan terkirim ke KEA | | |

[[SHOT:13_ UUPS Persetujuan Asesor.jpeg|Gambar 6.2.5 — Persetujuan Asesor]]

#### 6.2.6 Jadwal AL
**URL:** `/upps/al-response` · **Aktor:** UPPS. Menanggapi/menyetujui jadwal Asesmen Lapangan (AL).

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-13 | Konfirmasi jadwal AL | Lihat jadwal, klik **Setujui** | - | Jadwal AL terkonfirmasi | | |

[[SHOT:23_ UUPS Jadwal AL.jpeg|Gambar 6.2.6 — Jadwal AL (UPPS)]]

#### 6.2.7 Tanggapan terhadap AL
**URL:** `/al-response/:submissionId` · **Aktor:** UPPS. Memberikan tanggapan/sanggahan atas berita acara hasil AL.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-14 | Kirim tanggapan | Isi tanggapan, klik **Kirim** | Teks tanggapan | Tanggapan tersimpan & diteruskan | | |

[[SHOT:24_ UUPS Tanggapan UUPS terhadap AL.jpeg|Gambar 6.2.7 — Tanggapan UPPS terhadap AL]]

---

### 6.3 Modul Sekretariat

#### 6.3.1 Dashboard Sekretariat
**URL:** `/sekretariat` · **Aktor:** Sekretariat. Ringkasan administrasi: antrian verifikasi, pembayaran, dan rilis.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-15 | Tampil dashboard | Login sebagai Sekretariat | - | Ringkasan & antrian tugas tampil | | |

[[SHOT:03_ Sekretariat Dashboard.jpeg|Gambar 6.3.1 — Dashboard Sekretariat]]

#### 6.3.2 Manajemen Pembayaran Akreditasi
**URL:** `/sekretariat/payment` · **Aktor:** Sekretariat. Menerbitkan tagihan dan memverifikasi bukti pembayaran dari UPPS.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-16 | Terbitkan tagihan | Pilih UPPS, klik **Terbitkan Tagihan** | Nominal tagihan | Tagihan terbit & dikirim ke UPPS | | |
| TC-17 | Verifikasi pembayaran | Buka bukti bayar, klik **Verifikasi** | - | Status pembayaran terverifikasi | | |

[[SHOT:04_ Sekretariat Manajemen Pembayaran Akreditasi.jpeg|Gambar 6.3.2 (a) — Manajemen Pembayaran Akreditasi]]
[[SHOT:Modal Terbitkan Tagihan Akreditasi.png|Gambar 6.3.2 (b) — Modal Terbitkan Tagihan]]
[[SHOT:Modal Tagihan Diterbitkan.png|Gambar 6.3.2 (c) — Konfirmasi Tagihan Diterbitkan]]

#### 6.3.3 Verifikasi Jadwal AL
**URL:** `/sekretariat/al-approval` · **Aktor:** Sekretariat. Menyetujui jadwal AL sebelum diteruskan ke UPPS.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-18 | Setujui jadwal AL | Periksa jadwal, klik **Setujui** | - | Jadwal AL disetujui & diteruskan | | |

[[SHOT:21_ Sekretariat Verifikasi Jadwal AL.jpeg|Gambar 6.3.3 (a) — Verifikasi Jadwal AL]]
[[SHOT:Modal Verifikasi Persetujuan Jadwal AL.png|Gambar 6.3.3 (b) — Modal Persetujuan Jadwal AL]]

#### 6.3.4 Rilis Sertifikat
**URL:** `/release` · **Aktor:** Sekretariat. Menerbitkan sertifikat akreditasi dan mencatatkannya ke *blockchain*.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-19 | Daftar siap rilis | Buka menu **Rilis Sertifikat** | - | Daftar pengajuan siap rilis tampil | | |
| TC-20 | Terbitkan sertifikat | Pilih pengajuan, klik **Rilis** | - | Sertifikat terbit & tercatat di blockchain | | |

[[SHOT:33_ Sekretariat Rilis Sertifikat.jpeg|Gambar 6.3.4 (a) — Daftar Rilis Sertifikat]]
[[SHOT:34_ Sekretariat Rilis Sertifikat.jpeg|Gambar 6.3.4 (b) — Penerbitan Sertifikat]]

---

### 6.4 Modul KEA

#### 6.4.1 Dashboard KEA
**URL:** `/kea` · **Aktor:** KEA. Ringkasan tugas: penugasan asesor, monitoring, dan verifikasi hasil.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-21 | Tampil dashboard | Login sebagai KEA | - | Ringkasan tugas tampil | | |

[[SHOT:06_ KEA Dashboard.jpeg|Gambar 6.4.1 — Dashboard KEA]]

#### 6.4.2 Penugasan Asesor
**URL:** `/kea/assignments` · **Aktor:** KEA. Menugaskan asesor untuk menilai pengajuan, dibantu rekomendasi sistem.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-22 | Tugaskan asesor | Pilih pengajuan & asesor, klik **Tugaskan** | Pilihan asesor | Asesor tertugaskan | | |
| TC-23 | Rekomendasi asesor | Buka rekomendasi sistem | - | Daftar asesor terekomendasi tampil | | |

[[SHOT:07_ KEA Penugasan Asesor.jpeg|Gambar 6.4.2 (a) — Penugasan Asesor]]
[[SHOT:Modal Rekomendasi Asesor.png|Gambar 6.4.2 (b) — Modal Rekomendasi Asesor]]

#### 6.4.3 Review Penolakan Asesor
**URL:** `/kea/rejection-review` · **Aktor:** KEA. Meninjau penolakan asesor oleh UPPS dan menugaskan pengganti.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-24 | Tinjau & ganti asesor | Lihat alasan, pilih pengganti | Asesor baru | Asesor pengganti tertugaskan | | |

[[SHOT:14_ KEA Review Penolakan Asesor.jpeg|Gambar 6.4.3 — Review Penolakan Asesor]]

#### 6.4.4 Monitoring AK (Asesmen Kecukupan)
**URL:** `/kea/monitoring` · **Aktor:** KEA. Memantau progres penilaian asesmen kecukupan oleh para asesor.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-25 | Pantau progres AK | Buka menu **Monitoring AK** | - | Progres tiap asesor/pengajuan tampil | | |

[[SHOT:15_ KEA Monitoring AK.jpeg|Gambar 6.4.4 — Monitoring AK]]

#### 6.4.5 Analisis Konsistensi
**URL:** `/kea/consistency` · **Aktor:** KEA. Menganalisis konsistensi penilaian antar-asesor.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-26 | Analisis konsistensi | Buka menu, pilih pengajuan | - | Perbandingan skor antar-asesor tampil | | |

[[SHOT:19_ KEA Analisis Konsistensi.jpeg|Gambar 6.4.5 — Analisis Konsistensi]]

#### 6.4.6 Penjadwalan AL
**URL:** `/kea/al-scheduling` · **Aktor:** KEA. Menyusun & mengusulkan jadwal Asesmen Lapangan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-27 | Usulkan jadwal AL | Pilih tanggal & asesor, simpan | Tanggal AL | Jadwal AL tersimpan & diajukan | | |

[[SHOT:20_ KEA Penjadwalan AL.jpeg|Gambar 6.4.6 (a) — Penjadwalan AL]]
[[SHOT:Modal Usulkan Jadwal AL.png|Gambar 6.4.6 (b) — Modal Usulkan Jadwal AL]]

#### 6.4.7 Verifikasi Hasil AL
**URL:** `/verification` · **Aktor:** KEA. Memverifikasi kelayakan & berita acara hasil AL sebelum ke Majelis.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-28 | Verifikasi hasil AL | Buka detail, klik **Verifikasi** | - | Hasil terverifikasi & diteruskan ke Majelis | | |

[[SHOT:27_ KEA verifikasi hasil AL.jpeg|Gambar 6.4.7 (a) — Verifikasi Hasil AL]]
[[SHOT:28_ KEA Verifikasi Kelayakan Hasil AL.png|Gambar 6.4.7 (b) — Verifikasi Kelayakan Hasil AL]]

#### 6.4.8 Data Asesor
**URL:** `/kea/assessors` · **Aktor:** KEA. Daftar & manajemen data asesor (bidang keahlian, ketersediaan).

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-29 | Tampil data asesor | Buka menu **Data Asesor** | - | Daftar asesor & detailnya tampil | | |

[[SHOT:29_ KEA Datas Asesor.jpeg|Gambar 6.4.8 — Data Asesor]]

---

### 6.5 Modul Asesor

#### 6.5.1 Dashboard Asesor
**URL:** `/asesor` · **Aktor:** Asesor. Ringkasan penugasan dan progres penilaian.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-30 | Tampil dashboard | Login sebagai Asesor | - | Ringkasan penugasan tampil | | |

[[SHOT:08_ Asesor Dashboard.jpeg|Gambar 6.5.1 — Dashboard Asesor]]

#### 6.5.2 Penugasan Saya
**URL:** `/asesor/assignments` · **Aktor:** Asesor. Daftar pengajuan yang ditugaskan kepada asesor.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-31 | Tampil penugasan | Buka menu **Penugasan Saya** | - | Daftar penugasan & statusnya tampil | | |

[[SHOT:09_ Asesor Penugasan saya.jpeg|Gambar 6.5.2 — Penugasan Saya]]

#### 6.5.3 Detail Penugasan
**URL:** `/asesor/detail/:id` · **Aktor:** Asesor. Rincian satu penugasan: dokumen, butir penilaian, dan aksi.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-32 | Buka detail | Klik salah satu penugasan | - | Detail dokumen & butir tampil | | |

[[SHOT:10_ Asesor Detail Penugasan.jpeg|Gambar 6.5.3 — Detail Penugasan]]

#### 6.5.4 Penilaian AK (dengan AI Scoring)
**URL:** `/asesor/assessment/:id` · **Aktor:** Asesor. Form penilaian butir akreditasi, dibantu **rekomendasi skor otomatis dari AI (RAG)**. Asesor dapat menerima/menyesuaikan skor.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-33 | Lihat rekomendasi AI | Buka penilaian, lihat skor saran AI | - | Skor & alasan AI tampil per butir | | |
| TC-34 | Simpan & finalisasi | Sesuaikan skor, klik **Simpan** | Skor butir | Penilaian tersimpan & dikunci | | |

[[SHOT:16_ Asesor Penilaian AK (1).jpeg|Gambar 6.5.4 (a) — Penilaian AK: Daftar Butir]]
[[SHOT:16_ Asesor Penilaian AK (2).jpeg|Gambar 6.5.4 (b) — Penilaian AK: Rekomendasi Skor AI]]
[[SHOT:16_ Asesor Penilaian AK (3).jpeg|Gambar 6.5.4 (c) — Penilaian AK: Input Skor Asesor]]
[[SHOT:Modal Penilaian AK berhasil.png|Gambar 6.5.4 (d) — Konfirmasi Penilaian Berhasil]]

#### 6.5.5 Pelaksanaan AL
**URL:** `/al-execution/:submissionId` · **Aktor:** Asesor. Pencatatan temuan & berita acara Asesmen Lapangan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-35 | Catat hasil AL | Isi temuan/berita acara, klik **Simpan** | Catatan AL | Hasil AL tersimpan | | |

[[SHOT:22_ Asesor Pelaksanaan AL.jpeg|Gambar 6.5.5 — Pelaksanaan AL]]

#### 6.5.6 Riwayat Penilaian
**URL:** `/asesor/history` · **Aktor:** Asesor. Daftar riwayat penilaian yang telah diselesaikan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-36 | Tampil riwayat | Buka menu **Riwayat Penilaian** | - | Daftar riwayat penilaian tampil | | |

[[SHOT:17_ Asesor Riwayat Penilaian.jpeg|Gambar 6.5.6 — Riwayat Penilaian]]

---

### 6.6 Modul Majelis

#### 6.6.1 Dashboard Majelis
**URL:** `/majelis` · **Aktor:** Majelis. Ringkasan pengajuan yang menunggu keputusan akreditasi.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-37 | Tampil dashboard | Login sebagai Majelis | - | Ringkasan antrian keputusan tampil | | |

[[SHOT:30_ Majelis Dashboard.jpeg|Gambar 6.6.1 — Dashboard Majelis]]

#### 6.6.2 Keputusan Akreditasi
**URL:** `/majelis/decisions` · **Aktor:** Majelis. Daftar pengajuan untuk diputuskan peringkat akreditasinya.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-38 | Tampil daftar keputusan | Buka menu **Keputusan Akreditasi** | - | Daftar pengajuan siap diputus tampil | | |

[[SHOT:31_ Majelis Keputusan Akreditasi.jpeg|Gambar 6.6.2 — Keputusan Akreditasi]]

#### 6.6.3 Penetapan Keputusan
**URL:** `/majelis-decision/:submissionId` · **Aktor:** Majelis. Menetapkan peringkat/keputusan akreditasi atas suatu pengajuan.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-39 | Tetapkan keputusan | Pilih peringkat, klik **Tetapkan** | Peringkat akreditasi | Keputusan tersimpan & diteruskan ke rilis | | |

[[SHOT:32_ Majelis Penetapan Keputusan akreditasi.jpeg|Gambar 6.6.3 — Penetapan Keputusan Akreditasi]]

---

### 6.7 Fitur Kebaruan

#### 6.7.1 Penilaian Otomatis Berbasis AI (RAG)
Sistem membaca dokumen LED/LKPS, melakukan *retrieval* potongan relevan, lalu menghasilkan **rekomendasi skor + alasan** untuk tiap butir (lihat Modul 6.5.4). Bila data tidak tersedia, sistem memberi skor batas-bawah dengan penanda *low confidence* — tidak memberi skor 0 hanya karena data kosong.

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-40 | Skoring AI | Buka penilaian pada pengajuan berdokumen | Dokumen LED/LKPS | Skor & alasan AI tampil per butir | | |

[[SHOT:16_ Asesor Penilaian AK (2).jpeg|Gambar 6.7.1 — Rekomendasi Skor Otomatis oleh AI]]

#### 6.7.2 Ketertelusuran Sertifikat (Blockchain)
Saat sertifikat diterbitkan, datanya dicatat ke *blockchain* sehingga keasliannya dapat diverifikasi publik dan tidak dapat dipalsukan (lihat Modul 6.1.3 & 6.3.4).

| Kode | Skenario | Langkah | Data Masukan | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|---|
| TC-41 | Catat & verifikasi | Terbitkan sertifikat, lacak di Traceability | ID sertifikat | Transaksi tercatat (hash) & terverifikasi | | |

[[SHOT:Modal Riwayat Blockchain.png|Gambar 6.7.2 — Riwayat Transaksi Blockchain Sertifikat]]

---

## 7. Rekapitulasi Hasil Pengujian

| No | Aktor | Jumlah Kasus Uji | Valid | Tidak Valid | % Keberhasilan |
|---|---|---|---|---|---|
| 1 | Umum | 5 (TC-01–05) | | | |
| 2 | UPPS | 9 (TC-06–14) | | | |
| 3 | Sekretariat | 6 (TC-15–20) | | | |
| 4 | KEA | 9 (TC-21–29) | | | |
| 5 | Asesor | 7 (TC-30–36) | | | |
| 6 | Majelis | 3 (TC-37–39) | | | |
| 7 | Fitur Kebaruan | 2 (TC-40–41) | | | |
| | **TOTAL** | **41** | | | |

---

## 8. Kesimpulan

_(Diisi setelah pengujian, contoh kerangka:)_

Berdasarkan hasil pengujian *black-box* terhadap **41 kasus uji** yang mencakup **seluruh modul** pada 6 aktor sistem AkreChain, sebanyak **___ kasus** dinyatakan **Valid** dengan persentase keberhasilan **___%**. Hal ini menunjukkan bahwa setiap modul — termasuk fitur kebaruan **penilaian otomatis berbasis AI (RAG)** dan **ketertelusuran sertifikat berbasis blockchain** — telah berjalan sesuai rancangan fungsionalnya.
