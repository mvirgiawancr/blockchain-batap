# Narasi Sistem Akreditasi Blockchain (AkreChain)
## LAM-TEK 2025 - Institut Pertanian Bogor

---

## 1. Dashboard Sekretariat - Penilaian 7 Kriteria

Sistem akreditasi ini menggunakan **7 kriteria penilaian** sesuai standar LAM-TEK yang meliputi:

| No | Kriteria | Bobot |
|----|----------|-------|
| 1 | Visi, Misi, Tujuan, dan Strategi | - |
| 2 | Tata Pamong, Tata Kelola, dan Kerjasama | - |
| 3 | Mahasiswa | - |
| 4 | Sumber Daya Manusia | - |
| 5 | Keuangan, Sarana, dan Prasarana | - |
| 6 | Pendidikan | - |
| 7 | Penelitian | - |

**Proses Penilaian:**
- Setiap kriteria memiliki **butir-butir penilaian** yang detail
- AI melakukan **analisis otomatis** terhadap dokumen LED dan LKPS
- Sistem memberikan **skor per indikator** dengan skala 0-4

---

## 2. Alur Sistem Akreditasi

```
UPPS Upload Dokumen → Analisis AI → Review Sekretariat → 
Penugasan Asesor (KEA) → Penilaian Asesor → Keputusan Akhir
```

**Langkah-langkah:**
1. **UPPS** mengunggah dokumen LED dan LKPS
2. **AI Gemini** menganalisis kelengkapan dan memberikan skor awal
3. **Sekretariat** memverifikasi dan meneruskan ke KEA
4. **KEA** menugaskan asesor berdasarkan rekomendasi AI
5. **Asesor** melakukan penilaian lapangan
6. **Majelis** memberikan keputusan akhir

---

## 3. Fitur Rekomendasi Asesor Berbasis AI

Sistem menggunakan **AI profiling** untuk mencocokkan asesor dengan program studi:

**Sumber Data:**
- Profil dosen dari Excel (nama, gelar, keahlian)
- Link **Google Scholar** dan **Scopus**
- Departemen/bidang ilmu (TIN, ITP, SIL, TMB)

**Cara Kerja AI:**
```
Program Studi: "Teknologi Industri Pertanian"
        ↓
AI menganalisis keahlian 34 dosen TIN IPB
        ↓
Ranking berdasarkan kesesuaian bidang:
  #1 Prof.Dr.Ir. Marimin, M.Sc (skor 95%)
  #2 Prof.Dr.Ir. Suprihatin (skor 92%)
  ...
```

---

## 4. Traceability Blockchain

Setiap transaksi tercatat di **Hyperledger Fabric** dan tidak dapat dimanipulasi:

**Riwayat yang Tercatat:**
- Submission dibuat (oleh siapa, kapan)
- Analisis AI ditambahkan
- Status berubah (under_review → approved)
- Asesor ditugaskan
- Penilaian disubmit

**Manfaat:**
- ✅ Transparansi penuh
- ✅ Audit trail lengkap
- ✅ Tidak dapat dimanipulasi
- ✅ Multi-organisasi (UPPS, Sekretariat, KEA, Asesor, Majelis)

---

## 5. Contoh Screenshot yang Perlu Di-capture

### Dashboard Sekretariat:
- [ ] Daftar submission dengan status
- [ ] Detail penilaian per kriteria (7 kriteria)
- [ ] Skor butir-butir indikator

### Rekomendasi Asesor:
- [ ] Modal penugasan asesor dengan AI score
- [ ] Daftar asesor dengan ranking kesesuaian

### Traceability:
- [ ] Riwayat blockchain per submission
- [ ] Timeline transaksi

### Halaman Asesor:
- [ ] Form penilaian dengan 7 kriteria
- [ ] Input skor per indikator

---

## 6. Narasi untuk Presentasi (Script)

> "Sistem AkreChain mengintegrasikan teknologi blockchain Hyperledger Fabric 
> dengan kecerdasan buatan Gemini AI untuk proses akreditasi program studi.
>
> Pada dashboard Sekretariat, kita dapat melihat penilaian berdasarkan 
> **7 kriteria LAM-TEK** beserta butir-butir indikator yang detail.
>
> Fitur unggulan sistem ini adalah **rekomendasi asesor berbasis AI** yang
> menganalisis keahlian dosen dari data profil penelitian untuk mencocokkan
> dengan program studi yang akan diakreditasi.
>
> Seluruh transaksi tercatat di blockchain sehingga **tidak dapat dimanipulasi**
> dan memberikan **transparansi penuh** dalam proses akreditasi."

---

*Dokumen ini dibuat untuk keperluan presentasi sistem akreditasi blockchain.*
