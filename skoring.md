## Task 1: Modul Data Model dan Diferensiasi Program

**Tujuan:** Mendefinisikan struktur data fundamental, memetakan semua butir penilaian, dan mengimplementasikan logika diferensiasi karena aturan skor (terutama kuantitatif) **bervariasi berdasarkan jenis Program Studi (PS)**.

### Instruksi Teknis

1.  **Definisi Struktur Program Studi:**
    Buat struktur data (misalnya, kamus atau enum) untuk semua jenis Program Studi (PS) yang diakreditasi, termasuk jumlah butir total mereka:
    *   Sarjana (S): 60 Butir.
    *   Doktor (D): 53 Butir.
    *   Program Profesi Insinyur (PPI): 54 Butir.
    *   Program lain yang harus didefinisikan: Diploma Satu (D1: 56 Butir), D2 (56), D3 (56), STr (64), M (55), MTr (58), DTr (56).

2.  **Pemetaan Butir Penilaian (Anchoring):**
    Setiap indikator harus di-*anchor* ke nomor butir universal (D1–\#, S–\#, M–\#, dst.) agar data LKPS/LED dapat dimasukkan dengan benar.
    *   Contoh: Indikator "Kekhasan VMTS" selalu Butir 1 untuk semua program (D1 – 1, S – 1, M – 1, PPI – 1, dst.).
    *   Contoh: Indikator "Biaya Operasional Pendidikan" adalah Butir 9 (D1 – 9, S – 9, M – 9, PPI – 9, dst.).

3.  **Penerapan Ambang Batas Kuantitatif yang Terdiferensiasi:**
    Implementasikan logika `IF-ELSE` untuk ambang batas (threshold) kuantitatif yang berbeda antar jenjang program:

    *   **Biaya Operasional Pendidikan (BOP):**
        *   Untuk D1, D2, D3, S, STr, PPI: Skor 4 jika **BOP ≥ 40.000.000**. Jika kurang, Skor = BOP / 10.000.000.
        *   Untuk M, MTr, D, DTr: Skor 4 jika **BOP ≥ 28.000.000**. Jika kurang, Skor = BOP / 7.000.000.
    *   **Dana Penelitian DTPS (DPD):**
        *   Untuk D1, D2, D3, S, STr, PPI: Skor 4 jika **DPD ≥ 30.000.000**. Jika kurang, Skor = (2 x DPD) / 15.000.000.
        *   Untuk M, MTr, D, DTr: Skor 4 jika **DPD ≥ 20.000.000**. Jika kurang, Skor = (2 x DPD) / 10.000.000.

4.  **Definisi Faktor Kuantitatif ($a, b, c$):**
    Definisikan tabel faktor $a, b, c$ yang digunakan dalam rumus interpolasi Kerja Sama (Butir II) dan Kinerja DTPS (Penelitian, PkM, Publikasi).

    *   Contoh Faktor Kerja Sama (Butir II):
        *   PS Sarjana (S), STr, M, MTr, PPI: $a = 2, b = 6, c = 8$.
        *   PS Doktor (D), DTr: $a = 3, b = 8, c = 10$.
    *   Contoh Faktor Publikasi Ilmiah DTPS (S – 33, M – 31, D – 31, PPI – 30):
        *   S, PPI: $a = 0,5, b = 1, c = 2$.
        *   M: $a = 0,5, b = 4, c = 4$.
        *   D: $a = 0,5, b = 6, c = 4$.

---

## Task 2: Modul Perhitungan Skor Kuantitatif Lanjutan

**Tujuan:** Menerapkan semua rumus matematika non-linear dan kondisi ambang batas yang spesifik untuk butir kinerja.

### Instruksi Teknis

1.  **Implementasi Rumus Interpolasi (Kerja Sama, Publikasi, PkM):**
    Buat fungsi tunggal (misalnya `Calculate_Interpolation_Score(A, B, C)`) yang menggunakan rumus interpolasi 3-dimensi yang digunakan di banyak butir kinerja (misalnya, Relevansi dan Tingkat Kerja Sama II):
    $$\text{Skor} = 3,75 \times \left((A+B+(\frac{C}{2}))-(A \times B)-(\frac{(A \times C)}{2})-(\frac{(B \times C)}{2})+(\frac{(A \times B \times C)}{2})\right) \text{}$$
    *   Pastikan variabel $A, B, C$ dihitung terlebih dahulu menggunakan rasio aktual terhadap faktor $a, b, c$ yang sudah didefinisikan di Task 1 (e.g., $A = RI/a$; $B = RN/b$; $C = RL/c$).
    *   Terapkan kondisi batas: Jika $RI \geq a$ dan $RN < b$, maka $RI = a$. Jika $RI < a$ dan $RN \geq b$, maka $RN = b$. Jika $RL \geq c$, maka $RL = c$.

2.  **Implementasi Logika Waktu Tunggu Lulusan (Butir 49/53):**
    Tulis logika yang berbeda untuk menghitung Skor Waktu Tunggu (WT) berdasarkan PS:

    *   **D1, D2, D3, STr (Vokasi):** Skor 4 jika **WT < 3 bulan**. Jika $3 \leq WT \leq 6$, Skor = $(24 – (4 \times WT)) / 3$. Jika $WT > 6$ bulan, Skor 0.
    *   **S (Sarjana):** Skor 4 jika **WT < 6 bulan**. Jika $6 \leq WT \leq 18$, Skor = $(18 – WT) / 3$. Jika $WT > 18$ bulan, Skor 0.

3.  **Penerapan Penyesuaian Skor (Waktu Tunggu dan Kesesuaian Bidang Kerja):**
    Terapkan penyesuaian skor wajib jika persentase responden lulusan yang terlacak ($P_J$) tidak memenuhi persentase responden minimum ($P_{rmin}$), yang umumnya $P_{rmin} = 30\%$.
    $$\text{Skor akhir} = (P_J / P_{rmin}) \times \text{Skor}.

4.  **Implementasi Aturan Rasio Mahasiswa/DTPS (RMD):**
    RMD harus dinilai dengan ambang batas yang berbeda dan menerapkan rumus linear terpotong (piecewise linear):
    *   **Sarjana (S) Butir 40:** Skor 4 jika **$15 \leq RMD \leq 25$**. Rumus untuk $RMD < 15$ adalah Skor = $(4 \times RMD) / 15$. Rumus untuk $25 < RMD < 35$ adalah Skor = $(70 - (2 \times RMD)) / 5$.
    *   **PPI Butir 37:** Skor 4 jika **$4 \leq RMD \leq 10$**. Jika $RMD < 4$, Skor = $1 + (3 \times RMD) / 4$. Jika $10 < RMD \leq 35$, Skor = $4 - (((4 \times RMD) - 40) / 25)$.

---

## Task 3: Modul Penilaian Kualitatif dan *Constraint* Skor

**Tujuan:** Menerjemahkan kriteria berbasis naratif (checklist/pemenuhan unsur) menjadi logika terstruktur dan menerapkan semua batasan skor yang eksplisit dalam matriks.

### Instruksi Teknis

1.  **Implementasi Logika Pemenuhan Unsur (Checklist Kualitatif):**
    Tulis fungsi yang menghitung skor berdasarkan jumlah unsur yang dipenuhi untuk indikator kualitatif, di mana Skor 4 memerlukan pemenuhan semua unsur.

    *   **Kekhasan VMTS (Butir 1):** Skor 4 memerlukan pemenuhan **4 unsur** (Liniaritas Visi, Kesesuaian Renstra, Kesesuaian Kurikulum, Tinjauan berkala).
    *   **Sarana dan Prasarana Non Akademik (Butir 38/41 II):** Skor 4 memerlukan pemenuhan **3 unsur** (Pusat kesehatan/konseling/karir/ibadah; Kelayakan Sarpras; Kemudahan akses).
    *   **K3L (Butir 39/42):** Skor 4 memerlukan pemenuhan **4 unsur** (Kebijakan K3L; Fasilitas K3L; Bukti Pelaksanaan; Tinjauan berkala).

2.  **Penerapan Batasan Skor Minimum (*Score Constraint*):**
    Untuk setiap butir yang memiliki batasan skor yang jelas, pastikan output skor akhir tidak melanggar batasan tersebut.

    *   **Kekhasan VMTS (Butir 1):** Terapkan batasan: **Tidak ada skor kurang dari 2**.
    *   **Mekanisme Penyusunan VMTS (Butir 2):** Terapkan batasan: **Tidak ada skor kurang dari 1**.
    *   **Penelitian DTPS melibatkan Mahasiswa (S/STr, Butir 23):** Jika hasil perhitungan kuantitatif (Task 2) menghasilkan nilai di bawah 2, skor output **harus 2** karena ketentuan: **Tidak ada skor kurang dari 2**.

3.  **Implementasi Lonjakan Skor (Discrete Score Logic):**
    Terapkan logika khusus untuk butir yang melompati rentang skor:

    *   **Metode Rekrutmen dan Sistem Seleksi (Kualitas Input Mahasiswa I, Butir 15):** Indikator ini memiliki ketentuan **Tidak ada Skor antara 2 dan 4**.
        *   Jika program memenuhi kriteria Skor 4, hasilkan Skor 4.
        *   Jika program hanya memenuhi kriteria Skor 3 atau Skor 2, hasilkan Skor 2 (Tidak boleh 3, 2.5, dll.).
        *   Jika memenuhi kriteria Skor 1, hasilkan Skor 1.

---

## Task 4: Modul Komposit dan Validasi Final

**Tujuan:** Menggabungkan skor sub-indikator (I, II, III) menggunakan bobot yang ditentukan dan memvalidasi skor akhir.

### Instruksi Teknis

1.  **Implementasi Rumus Rata-rata Berbobot (Weighted Average) 1:2:1:**
    Tulis fungsi yang menerapkan bobot di mana sub-indikator II memiliki bobot dua kali lipat:
    $$\text{Skor} = (I + (2 \times II)) / 3$$
    Indikator yang menggunakan rumus ini (Contoh: Sistem Tata Pamong, Rencana Proses Pembelajaran (RPS), Komitmen Pimpinan):
    *   `Skor_Akhir_Sistem_Tatapamong = (Skor_I_Tatapamong + (2 * Skor_II_Tatapamong)) / 3`.

2.  **Implementasi Rumus Rata-rata Sederhana (1:1):**
    Tulis fungsi untuk rata-rata sederhana dari sub-indikator:
    $$\text{Skor} = (I + II) / 2$$
    Indikator yang menggunakan rumus ini (Contoh: Profil Lulusan dan CPL, Proses Pembelajaran, Sarana dan Prasarana).

3.  **Implementasi Rumus Komposit Kualitas Input Mahasiswa (1:2:2):**
    Tulis fungsi spesifik untuk Kualitas Input Mahasiswa, di mana sub-indikator II (Kriteria penerimaan) dan III (Proses seleksi) memiliki bobot dua kali lipat dari I (Metode rekrutmen):
    $$\text{Skor} = (I + (2 \times II) + (2 \times III)) / 5$$

4.  **Validasi dan Format Keluaran Akhir:**
    Fungsi utama harus memproses data masukan, menjalankan Task 1, 2, dan 3, dan menghasilkan *output* terstruktur (misalnya, JSON atau tabel) yang mencantumkan:
    *   Nomor Butir (S – 1, PPI – 37, dst.).
    *   Nama Indikator.
    *   **Skor Akhir (0.00 – 4.00).**
    *   Metode Penilaian yang digunakan (Kualitatif / Kuantitatif / Komposit).

---