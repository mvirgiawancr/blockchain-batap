# Laporan Pengujian Kecepatan Pembacaan Dokumen Akreditasi hingga Penghasilan Skor pada Sistem AkreChain

*Dibuat otomatis dari hasil benchmark pada 20 Juni 2026 pukul 21.32.*

## 1. Ringkasan Eksekutif

Pengujian ini mengukur **kecepatan** sistem AkreChain dalam membaca sepasang dokumen akreditasi — Laporan Evaluasi Diri (LED) dan Laporan Kinerja Program Studi (LKPS) — hingga menghasilkan **skor akhir LAM-TEK 2025** beserta peringkat akreditasinya. Pengujian dijalankan sebanyak **5 kali** (di luar 1 kali *warm-up*) pada satu set dokumen contoh program **D**.

Hasil utama: waktu rata-rata end-to-end **baca → skor** adalah **149.73 detik** (± 4.00 detik; koefisien variasi 2.7%). Tahap **Indexing RAG (chunking + embedding)** menjadi penyumbang waktu terbesar (52.3% dari total), diikuti **Analisis AI Gemini (ekstraksi data)** (33.9%). Tahap kalkulasi skor LAM-TEK bersifat deterministik dan praktis seketika (2.4 ms).

Konsistensi hasil: skor akhir yang dihasilkan adalah 3.18; 3.27; 3.12; 3.36; 3.27 dengan peringkat **Baik Sekali**.

## 2. Tujuan Pengujian

1. Mengukur waktu yang dibutuhkan sistem untuk memproses dokumen LED dan LKPS hingga menghasilkan skor akreditasi secara otomatis.
2. Mengidentifikasi tahap mana dalam pipeline yang menjadi penyumbang waktu terbesar (*bottleneck*).
3. Menilai konsistensi (kestabilan) waktu proses dan hasil skor pada eksekusi berulang.
4. Menyediakan data kuantitatif kinerja sistem sebagai bahan publikasi/jurnal.

## 3. Metodologi

Pengujian dilakukan dengan menjalankan ulang pipeline analisis dokumen yang persis sama dengan alur produksi pada `uploadController.js`, namun **mengecualikan** tahap yang bukan bagian dari "pembacaan dokumen" (penyimpanan IPFS terenkripsi, pencatatan ke blockchain Hyperledger Fabric, dan notifikasi WebSocket). Waktu tiap tahap diukur memakai `process.hrtime.bigint()` (presisi nanodetik). Satu iterasi *warm-up* dijalankan lebih dulu untuk memuat model *embedding* lokal dan koneksi basis data, lalu tidak diikutkan dalam statistik agar hasil tidak bias oleh *cold start*.

Pipeline yang diukur terdiri atas tujuh tahap berurutan:

| No | Tahap | Keterangan |
|----|-------|------------|
| 1 | Ekstraksi teks LED | Mengubah dokumen PDF LED menjadi teks (`pdf-parse`). |
| 2 | Ekstraksi teks LKPS | Membaca seluruh *sheet* Excel LKPS menjadi teks (`ExcelJS`). |
| 3 | Verifikasi jenis dokumen | Memastikan dokumen benar LED/LKPS berdasarkan kata kunci. |
| 4 | Indexing RAG | Memecah teks menjadi *chunk* dan membuat *embedding* (model E5 lokal) ke pgvector. |
| 5 | Analisis AI Gemini | Ekstraksi data terstruktur per kriteria oleh model `gemini-3.1-flash-lite`. |
| 6 | Skoring butir | Penilaian butir berbasis bukti hasil *retrieval* RAG. |
| 7 | Kalkulasi skor LAM-TEK 2025 | Perhitungan akhir berbobot 7 kriteria (deterministik). |

[[SHOT:diagram-pipeline.png|Gambar 1. Diagram alur pipeline pembacaan dokumen hingga skor]]

## 4. Lingkungan Pengujian

| Komponen | Spesifikasi |
|----------|-------------|
| Tanggal/waktu | 20 Juni 2026 pukul 21.32 |
| Runtime Node.js | v22.20.0 |
| Platform | linux x64 |
| CPU | 11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz (12 core) |
| Memori | 7.6 GB |
| Model AI (ekstraksi) | gemini-3.1-flash-lite |
| Model AI cadangan | gemini-2.5-flash-lite |
| Penyedia embedding | local |
| Mode Full RAG | Aktif |
| Jeda minimal antar-permintaan AI | 4000 ms |

[[SHOT:konfigurasi-env.png|Gambar 2. Konfigurasi lingkungan (.env) dan versi Node.js di terminal WSL]]

## 5. Dataset Uji

Dokumen contoh disediakan oleh Profesor sebagai sampel program studi D.

| Dokumen | Nama Berkas | Ukuran | Jumlah Karakter Terbaca | Jumlah Chunk |
|---------|-------------|--------|--------------------------|--------------|
| LED (PDF) | Dokumen_led_S3 (6).pdf | 7.78 MB | 706.361 | 479 |
| LKPS (Excel) | LKPS  S3 AKREDITASI 2026 (6).xlsx | 1.23 MB | 689.313 | 157 |

## 6. Hasil Pengujian

### 6.1 Rincian Waktu per Eksekusi (detik)

| Tahap | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|-------|------|------|------|------|------|
| Ekstraksi teks LED (PDF) | 1.01 | 1.09 | 1.11 | 1.07 | 1.07 |
| Ekstraksi teks LKPS (Excel) | 1.09 | 1.09 | 1.24 | 1.11 | 1.10 |
| Verifikasi jenis dokumen | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 |
| Indexing RAG (chunking + embedding) | 77.86 | 77.00 | 78.77 | 79.88 | 77.66 |
| Analisis AI Gemini (ekstraksi data) | 53.35 | 48.41 | 44.27 | 54.67 | 52.79 |
| Skoring butir | 17.91 | 18.62 | 19.14 | 19.12 | 18.14 |
| Kalkulasi skor LAM-TEK 2025 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| TOTAL (baca → skor) | 151.24 | 146.22 | 144.55 | 155.87 | 150.77 |

### 6.2 Ringkasan Statistik per Tahap

| Tahap | Rata-rata (s) | Median (s) | Min (s) | Maks (s) | Std (s) | CV (%) | % dari Total |
|-------|---------------|------------|---------|----------|---------|--------|--------------|
| Ekstraksi teks LED (PDF) | 1.07 | 1.07 | 1.01 | 1.11 | 0.03 | 3.1 | 0.7% |
| Ekstraksi teks LKPS (Excel) | 1.13 | 1.10 | 1.09 | 1.24 | 0.06 | 5.3 | 0.8% |
| Verifikasi jenis dokumen | 0.01 | 0.01 | 0.01 | 0.01 | 0.00 | 4.7 | 0.0% |
| Indexing RAG (chunking + embedding) | 78.24 | 77.86 | 77.00 | 79.88 | 1.00 | 1.3 | 52.3% |
| Analisis AI Gemini (ekstraksi data) | 50.70 | 52.79 | 44.27 | 54.67 | 3.84 | 7.6 | 33.9% |
| Skoring butir | 18.59 | 18.62 | 17.91 | 19.14 | 0.50 | 2.7 | 12.4% |
| Kalkulasi skor LAM-TEK 2025 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 15.2 | 0.0% |
| **TOTAL (baca → skor)** | **149.73** | **150.77** | **144.55** | **155.87** | **4.00** | **2.7** | **100%** |

[[SHOT:output-terminal-benchmark.png|Gambar 3. Keluaran terminal saat menjalankan skrip benchmark (ringkasan per tahap)]]

[[SHOT:grafik-waktu-per-tahap.png|Gambar 4. Grafik proporsi waktu tiap tahap terhadap total]]

### 6.3 Throughput & Konsistensi Hasil

- **Throughput pembacaan**: ≈ 9.321 karakter/detik (total 1.395.674 karakter LED+LKPS diproses dalam rata-rata 149.73 detik).
- **Konsistensi waktu**: koefisien variasi total 2.7% (stabil).
- **Konsistensi skor**: skor akhir 3.18; 3.27; 3.12; 3.36; 3.27; peringkat akreditasi Baik Sekali.

[[SHOT:hasil-skor-frontend.png|Gambar 5. Tampilan skor akhir & peringkat akreditasi pada antarmuka AkreChain]]

## 7. Pembahasan

Distribusi waktu menunjukkan bahwa tahap **Indexing RAG (chunking + embedding)** merupakan penyumbang waktu terbesar (52.3% dari total), disusul **Analisis AI Gemini (ekstraksi data)** (33.9%). Secara gabungan, proses berbasis kecerdasan buatan (analisis Gemini + skoring butir) menyumbang 46.3% dari total waktu.

Tingginya porsi tahap *indexing RAG* disebabkan oleh pembuatan *embedding* seluruh potongan (chunk) dokumen menggunakan model E5 lokal yang berjalan di **CPU**. Karena dokumen LED+LKPS menghasilkan ratusan chunk, beban komputasi *embedding* menjadi dominan pada perangkat dengan 7.6 GB RAM tanpa akselerasi GPU. Tahap **analisis AI Gemini** dan **skoring butir** menempati urutan berikutnya karena memanggil layanan model bahasa eksternal yang dibatasi latensi jaringan dan jeda minimal antar-permintaan (4000 ms) untuk menghormati kuota API.

Sebaliknya, tahap **ekstraksi teks** dan **kalkulasi skor LAM-TEK** berjalan lokal dan sangat cepat; kalkulasi skor akhir bahkan selesai dalam orde milidetik (2.4 ms) karena bersifat deterministik (perhitungan berbobot tanpa pemanggilan model).

Implikasi praktisnya: optimasi kecepatan paling efektif difokuskan pada tahap **Indexing RAG (chunking + embedding)** (mis. akselerasi GPU untuk embedding, pengurangan jumlah chunk, atau model embedding yang lebih ringan), sementara tahap lokal lain sudah efisien. Tingkat konsistensi waktu antar-eksekusi (CV total 2.7%) menjadi indikator kelayakan sistem untuk penggunaan operasional.

## 8. Kesimpulan

Sistem AkreChain mampu membaca sepasang dokumen LED+LKPS dan menghasilkan skor akreditasi LAM-TEK 2025 secara otomatis dalam waktu rata-rata **149.73 detik** per dokumen pada lingkungan pengujian. Proses didominasi oleh tahap **Indexing RAG (chunking + embedding)** (52.3%) dan **Analisis AI Gemini (ekstraksi data)** (33.9%), sedangkan tahap kalkulasi skor berlangsung nyaris seketika. Skor akhir yang dihasilkan konsisten pada peringkat **Baik Sekali** di seluruh eksekusi, menunjukkan kestabilan sistem. Data ini dapat dijadikan dasar pelaporan kinerja pada jurnal.

## 9. Lampiran

- Berkas data mentah hasil benchmark: `../benchmark-kecepatan-1781965974605.json`
- Skrip pengujian: `backend-express/scripts/benchmark-baca-skor.js`
- Cara menjalankan ulang: lihat komentar di bagian atas skrip.
