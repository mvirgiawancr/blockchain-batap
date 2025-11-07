# Field Mapping LKPS untuk LAM-TEK 2025

Mapping field antara sheet LKPS Excel dengan field yang digunakan di `lkpsData` object.

## 📊 Kriteria 2: Akuntabilitas

### ✅ Butir 2.3: BOP per Mahasiswa
- **Field key**: `bop_value`
- **Sheet**: `4a.csv` atau sheet "Keuangan"
- **Lokasi**: "BOP = Biaya Operasional Pendidikan/Mahasiswa"
- **Nilai contoh**: 25,925,746.63
- **Status**: ✅ DATA ADA

### ✅ Butir 2.4: Dana Penelitian DTPS
- **Field key**: `dpd_total`
- **Sheet**: `4a.csv` atau sheet "Keuangan"
- **Lokasi**: "DP = Dana Penelitian yang diperoleh dosen"
- **Nilai contoh**: 11,397,400,360
- **Status**: ✅ DATA ADA

- **Field key**: `jumlah_dtps`
- **Sheet**: `3b1.csv` atau sheet "Dosen Tetap"
- **Lokasi**: "NDTPS" (Jumlah dosen tetap)
- **Nilai contoh**: 26
- **Status**: ✅ DATA ADA

---

## 📊 Kriteria 4: SDM

### ✅ Butir 4.5: Rasio Bidang Keahlian (RBK)
- **Field key**: `rbk_dtps`
- **Sheet**: `3a3.csv` atau sheet "Kesesuaian Keahlian"
- **Lokasi**: "Rata-rata jumlah (SKS) DTPS"
- **Nilai contoh**: 5.728181818
- **Status**: ✅ DATA ADA
- **Catatan**: Ini mungkin SALAH! RBK bukan rata-rata SKS. Perlu dicari field yang benar.

### ✅ Butir 4.6: Publikasi DTPS
- **Field key**: `publikasi_ilmiah_dtps_ri`
- **Sheet**: `3b4.csv` atau sheet "Publikasi Dosen"
- **Lokasi**: "Jurnal penelitian internasional bereputasi"
- **Nilai contoh**: 272
- **Status**: ✅ DATA ADA

- **Field key**: `publikasi_ilmiah_dtps_rn`
- **Sheet**: `3b4.csv` atau sheet "Publikasi Dosen"
- **Lokasi**: "Jurnal penelitian nasional terakreditasi"
- **Nilai contoh**: 211
- **Status**: ✅ DATA ADA

---

## 📊 Kriteria 6: Mahasiswa dan Luaran

### ✅ Butir 6.2: Mahasiswa Asing
- **Field key**: `pma`
- **Sheet**: `2b.csv` atau sheet "Mahasiswa"
- **Lokasi**: "Jumlah Mahasiswa Asing Penuh Waktu"
- **Nilai contoh**: 3 (1+1+1 dari TS-2, TS-1, TS)
- **Status**: ✅ DATA ADA
- **Catatan**: Perlu dihitung sebagai PERSENTASE dari total mahasiswa!

### ❌ Butir 6.9: Tingkat Tempat Kerja
- **Field key**: `tingkat_tempat_kerja_ri`
- **Sheet**: `8e1.csv` atau sheet "Tracer Study"
- **Lokasi**: "Multinasional/Internasional"
- **Nilai**: 0
- **Status**: ❌ DATA MEMANG 0

- **Field key**: `tingkat_tempat_kerja_rn`
- **Sheet**: `8e1.csv` atau sheet "Tracer Study"
- **Lokasi**: "Nasional/Berwirausaha Berizin"
- **Nilai**: 0
- **Status**: ❌ DATA MEMANG 0

---

## 🔧 Yang Perlu Diperbaiki

### 1. Field `rbk_dtps` SALAH MAPPING!
Saat ini: Rata-rata SKS = 5.73 (SALAH!)
Seharusnya: Rasio Bidang Keahlian (persentase kesesuaian)

**Cari di sheet lain** dengan keyword:
- "Kesesuaian bidang keahlian"
- "RBK"
- "Persentase kesesuaian"

### 2. Field `pma` Perlu Perhitungan
Saat ini: Jumlah absolut = 3
Seharusnya: Persentase = (3 / total_mahasiswa) * 100

**Formula**:
```
pma = (jumlah_mahasiswa_asing / total_mahasiswa) * 100
```

### 3. Field Tingkat Tempat Kerja MEMANG 0
Data di LKPS memang kosong (tidak ada lulusan bekerja di perusahaan internasional/nasional).

**Rekomendasi**: 
- Update data tracer study
- Isi sheet 8e1.csv dengan data lulusan yang bekerja di perusahaan nasional/internasional

---

## 📝 Kesimpulan

**Butir dengan skor 0**:
1. ✅ Butir 2.3 (BOP) = 0 → **SEHARUSNYA TIDAK 0!** Data ada: 25,925,746.63
2. ✅ Butir 2.4 (DPD) = 0 → **SEHARUSNYA TIDAK 0!** Data ada: 11,397,400,360
3. ⚠️ Butir 4.5 (RBK) = 0.10 → **MAPPING SALAH!** Perlu cari field yang benar
4. ✅ Butir 4.6 (Publikasi) = 0 → **SEHARUSNYA TIDAK 0!** Data ada: 272 (RI), 211 (RN)
5. ⚠️ Butir 6.2 (Mahasiswa Asing) = 0 → **PERLU KALKULASI!** Data ada: 3, perlu jadi %
6. ❌ Butir 6.9 (Tempat Kerja) = 0 → **DATA MEMANG 0!** Perlu update tracer study

**Action Items**:
1. Fix Gemini AI extraction untuk field-field di atas
2. Cari field RBK yang benar di LKPS
3. Kalkulasi persentase mahasiswa asing (bukan jumlah absolut)
4. Update data tracer study di LKPS sheet 8e1
