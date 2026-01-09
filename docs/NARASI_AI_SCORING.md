# Narasi AI Scoring LAM-TEK 2025

## Gambaran Umum

Sistem AkreChain mengimplementasikan **AI Scoring Otomatis** menggunakan **Google Gemini AI** untuk menganalisis dokumen akreditasi program studi. AI melakukan ekstraksi dan evaluasi data dari dokumen **LED (Laporan Evaluasi Diri)** dan **LKPS (Laporan Kinerja Program Studi)** secara otomatis.

Hasil analisis AI kemudian dihitung menggunakan formula dan bobot resmi sesuai **Pedoman Penilaian Instrumen LAM-TEK 2025**, menghasilkan skor untuk **7 Kriteria Akreditasi** dengan total **56 butir penilaian**. Setiap butir memiliki bobot yang berbeda sesuai jenis program studi (Sarjana, Magister, Doktor, Sarjana Terapan, Magister Terapan, Doktor Terapan, dan Profesi Insinyur).

Skor yang dihasilkan AI berfungsi sebagai **referensi awal** bagi asesor manusia dalam melakukan penilaian Asesmen Kecukupan (AK), sehingga proses akreditasi menjadi lebih efisien, objektif, dan transparan.

---

## Alur Proses AI Scoring

### 1. Upload Dokumen
UPPS mengunggah dokumen **LED (PDF)** dan **LKPS (Excel)** ke sistem.

### 2. Ekstraksi Data oleh AI
- **LED**: AI mengekstrak data kualitatif (VMTS, tata pamong, kurikulum, dll)
- **LKPS**: AI mengekstrak data kuantitatif (BOP, DPD, DTPS, IPK, dll)

### 3. Perhitungan Skor per Butir
Setiap butir dihitung menggunakan formula resmi LAM-TEK 2025:
- **Butir kuantitatif**: menggunakan formula interpolasi 3D
- **Butir kualitatif**: dievaluasi AI dengan skala 0-4

### 4. Agregasi dan Penentuan Akreditasi
Skor akhir (weighted average) menentukan peringkat:
- **≥ 3.61** → Unggul (A)
- **≥ 3.01** → Baik Sekali (B)  
- **≥ 2.00** → Baik (C)
- **< 2.00** → Tidak Terakreditasi

---

## Struktur 7 Kriteria dan 56 Butir

| No | Kriteria | Butir | Bobot (Sarjana) |
|----|----------|-------|-----------------|
| 1 | Diferensiasi Misi | 3 butir (1.1 - 1.3) | 2.05% |
| 2 | Akuntabilitas | 11 butir (2.1 - 2.11) | 7.06% |
| 3 | Relevansi Pendidikan, Penelitian, dan PkM | 13 butir (3.1 - 3.13) | 22.45% |
| 4 | Sumber Daya Manusia | 10 butir (4.1 - 4.10) | 13.44% |
| 5 | Sarana, Prasarana, dan K3L | 3 butir (5.1 - 5.3) | 7.51% |
| 6 | Mahasiswa dan Luaran Mahasiswa | 10 butir (6.1 - 6.10) | 26.87% |
| 7 | Sistem Penjaminan Mutu | 6 butir (7.1 - 7.6) | 15.35% |
| | **TOTAL** | **56 butir** | **100%** |

---

## Detail Butir per Kriteria

### Kriteria 1: Diferensiasi Misi (3 butir)
- 1.1 Kekhasan VMTS
- 1.2 Mekanisme Penyusunan VMTS
- 1.3 Tingkat Pemahaman dan Pencapaian VMTS

### Kriteria 2: Akuntabilitas (11 butir)
- 2.1 Sistem Tata Pamong - Struktur Organisasi
- 2.2 Sistem Tata Pamong - Good Governance
- 2.3 Komitmen Pimpinan
- 2.4 Kemampuan Manajerial
- 2.5 Relevansi Kerja Sama
- 2.6 Kerja Sama Aktif (3D)
- 2.7 Pelaksanaan Kerja Sama
- 2.8 Pengelolaan Keuangan
- 2.9 BOP - Biaya Operasional Pendidikan
- 2.10 DPD - Dana Penelitian DTPS
- 2.11 DPkMD - Dana PkM DTPS

### Kriteria 3: Relevansi (13 butir)
- 3.1 Pemutakhiran Kurikulum
- 3.2 Profil Lulusan dan CPL
- 3.3 Kesesuaian dan Tinjauan CPL
- 3.4 Kualitas Input Mahasiswa
- 3.5 RPS - Kelengkapan
- 3.6 RPS - Tinjauan Rutin
- 3.7 Proses Pembelajaran
- 3.8 Integrasi Penelitian dan PkM dalam Pembelajaran
- 3.9 Suasana Akademik
- 3.10 Penelitian - Kesesuaian dengan VMTS
- 3.11 Penelitian DTPS dengan Mahasiswa
- 3.12 PkM - Kesesuaian dengan VMTS
- 3.13 PkM DTPS dengan Mahasiswa

### Kriteria 4: SDM (10 butir)
- 4.1 Kecukupan Jumlah DTPS
- 4.2 Jabatan Akademik DTPS
- 4.3 Tenaga Kependidikan
- 4.4 RBK - Rerata Beban Kerja DTPS
- 4.5 Kinerja Penelitian DTPS
- 4.6 Kinerja PkM DTPS
- 4.7 Publikasi Ilmiah DTPS (3D)
- 4.8 Luaran Penelitian dan PkM DTPS
- 4.9 PKIB - Karya Ilmiah Bereputasi
- 4.10 DTPS Penulis Korespondensi

### Kriteria 5: Sarpras & K3L (3 butir)
- 5.1 Sarana dan Prasarana Akademik
- 5.2 Sarana dan Prasarana Non-Akademik
- 5.3 K3L - Keselamatan Kesehatan Kerja dan Lingkungan

### Kriteria 6: Mahasiswa & Luaran (10 butir)
- 6.1 Persentase Mahasiswa Asing
- 6.2 IPK Lulusan
- 6.3 Prestasi Akademik Mahasiswa (3D)
- 6.4 Masa Studi
- 6.5 PTW - Persentase Kelulusan Tepat Waktu
- 6.6 Publikasi Ilmiah Mahasiswa (3D)
- 6.7 Luaran Penelitian dan PkM Mahasiswa
- 6.8 Tracer Study
- 6.9 Waktu Tunggu Lulusan
- 6.10 KBK - Kesesuaian Bidang Kerja

### Kriteria 7: Penjaminan Mutu (6 butir)
- 7.1 Keberadaan Unit Penjaminan Mutu
- 7.2 Ketersediaan Perangkat SPMI
- 7.3 IKT - Indikator Kinerja Tambahan
- 7.4 Keterlaksanaan SPMI dan AMI
- 7.5 Evaluasi Capaian Kinerja
- 7.6 Kepuasan Pemangku Kepentingan

---

## Keunggulan AI Scoring

1. **Otomatis & Objektif** - Mengurangi subjektivitas penilaian manual
2. **Sesuai Instrumen Resmi** - 56 butir berdasarkan LAM-TEK 2025
3. **Bobot Dinamis** - Menyesuaikan jenis program (S/M/D/STr/MTr/DTr/PPI)
4. **Transparan** - Detail skor per butir dapat dilihat oleh asesor
5. **Efisien** - Proses scoring dalam hitungan menit
