# Analisis LKPS - Field yang Menyebabkan Skor 0

Script ini menganalisis file LKPS Excel untuk menemukan field-field yang kosong atau tidak ada, yang menyebabkan beberapa butir mendapat skor 0.

## 📊 Field yang Dicari

### Kriteria 2: Akuntabilitas
- **bop_value**: BOP per mahasiswa (Rupiah)
- **dpd_total**: Total dana penelitian DTPS (Rupiah)
- **jumlah_dtps**: Jumlah Dosen Tetap Program Studi

### Kriteria 4: SDM
- **rbk_dtps**: Rasio Bidang Keahlian DTPS (%)
- **publikasi_ilmiah_dtps_ri**: Publikasi ilmiah DTPS di jurnal internasional bereputasi
- **publikasi_ilmiah_dtps_rn**: Publikasi ilmiah DTPS di jurnal nasional terakreditasi

### Kriteria 6: Mahasiswa
- **pma**: Persentase Mahasiswa Asing (%)
- **tingkat_tempat_kerja_ri**: Lulusan bekerja di perusahaan internasional/multinasional
- **tingkat_tempat_kerja_rn**: Lulusan bekerja di perusahaan nasional besar

## 🚀 Cara Menjalankan

```bash
cd /home/virgi/blockchain-new/skoring
python3 analyze_lkps.py
```

## 📝 Output

Script akan menghasilkan:
1. **Output di terminal**: Menampilkan lokasi field yang ditemukan dan yang hilang
2. **File JSON**: `analisis_hasil.json` berisi detail hasil analisis

## ⚙️ Requirements

```bash
pip3 install pandas openpyxl
```

## 📌 Butir yang Terdampak (Skor 0)

Berdasarkan hasil scoring terbaru:

- **Butir 2.3** (BOP) = 0 → Karena `bop_value` kosong
- **Butir 2.4** (DPD) = 0 → Karena `dpd_total` kosong
- **Butir 4.5** (RBK) = 0.10 → Karena `rbk_dtps` kosong/tidak ideal
- **Butir 4.6** (Publikasi) = 0 → Karena `publikasi_ilmiah_dtps_ri/rn` kosong
- **Butir 6.2** (Mahasiswa Asing) = 0 → Karena `pma` kosong
- **Butir 6.9** (Tempat Kerja) = 0 → Karena `tingkat_tempat_kerja_ri/rn` kosong

## 🎯 Dampak

Jika field-field ini dilengkapi:
- **Kriteria 2** bisa naik dari 2.15 → 3.0+
- **Kriteria 4** bisa naik dari 2.68 → 3.2+
- **Kriteria 6** bisa naik dari 2.45 → 3.0+
- **Akreditasi** bisa naik dari **B** → **A** (Unggul)!
