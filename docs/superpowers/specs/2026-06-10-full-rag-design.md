# Full RAG untuk AkreChain (LAM-TEK 2025)

**Tanggal:** 2026-06-10
**Status:** Disetujui
**Scope:** Mengganti "lightweight RAG" (keyword matching + window teks) dengan full RAG pipeline: chunking → embedding → pgvector → hybrid semantic retrieval, untuk (1) dokumen LED/LKPS yang di-upload UPPS dan (2) knowledge base pedoman penilaian LAM-TEK 2025.

## 1. Masalah

Implementasi sekarang di `backend-express/src/services/geminiService.js`:

1. **`findRelevantSnippet()` (baris ~550)** — pencarian keyword `indexOf` + window teks tetap (15KB–150KB). Kalau keyword tidak persis cocok, snippet yang dikirim ke Gemini salah bagian.
2. **LED hanya terbaca 25.000 karakter pertama** (`ledContent.substring(0, 25000)` di `analyzeDocumentsForScoring`). Pembahasan kriteria di bagian akhir dokumen tidak pernah terlihat oleh AI → ekstraksi kosong → skor jatuh ke floor `low_confidence`.
3. **Posisi sheet LKPS dicari dengan hardcoded marker** (`--- Sheet: 3a1 ---` dengan beberapa varian fallback manual).
4. **PDF pedoman penilaian LAM-TEK 2025** (`skoring/pedoman-penilaian-instrumen-lam-teknik-2025 (1).pdf`) tidak dipakai sama sekali, padahal diagram arsitektur di `docs/` menggambarkan silinder "RAG: pedoman LAM-TEK + aturan". Rubrik di-hardcode di prompt.
5. **Butir kualitatif (LED) dinilai random 3.5–4.0** via `randomDefaultScore()` di `lamtekScoringService.js` — bukan penilaian sungguhan.

## 2. Keputusan desain

| Keputusan | Pilihan |
|---|---|
| Scope | Keduanya: retrieval LED/LKPS + knowledge base pedoman |
| Vector store | **pgvector** (extension PostgreSQL yang sudah dipakai) |
| Embedding | **Gemini `text-embedding-004`** (768 dim, API key sama, kuota terpisah dari generation) |
| Arsitektur | **Hybrid structure-aware** — chunking & retrieval per jenis dokumen, hybrid semantic + full-text, fallback ke metode lama |
| Skor butir kualitatif | **RAG scoring** — Gemini menilai berdasarkan rubrik pedoman + bukti LED, menggantikan `randomDefaultScore()` |
| Framework | Tanpa LangChain/LlamaIndex — implementasi langsung |

## 3. Komponen baru

Semua di `backend-express`:

### 3.1 `src/services/embeddingService.js`
- Wrapper Gemini embedding API (`text-embedding-004`, 768 dimensi).
- `embedDocuments(texts[])` — pakai `batchEmbedContents` (hingga 100 teks per request), `taskType: RETRIEVAL_DOCUMENT`.
- `embedQuery(text)` — `taskType: RETRIEVAL_QUERY`.
- Rate limiting + retry exponential backoff sendiri (kuota embedding ±100 RPM free tier, terpisah dari 2 RPM generation — JANGAN pakai rate limiter `generateGeminiResponse`).
- Bila API key tidak ada / gagal permanen → throw error spesifik yang ditangkap ragService untuk fallback.

### 3.2 `src/services/chunkingService.js`
Tiga strategi, satu fungsi per jenis dokumen, semua mengembalikan `{ content, chunkIndex, metadata }[]`:

- **`chunkLED(text)`** — split per sub-bab/heading (pola "KRITERIA n", "BAB", heading bernomor); chunk maksimum ~1.500 token (≈6.000 karakter) dengan overlap ~200 token. Metadata: `{ sectionTitle, kriteria }` (kriteria diisi bila heading terdeteksi mengandung nomor kriteria).
- **`chunkLKPS(text)`** — split pada marker `--- Sheet: <nama> ---` (sudah dihasilkan `extractTextFromExcel`); **satu chunk per sheet**. Sheet sangat besar (>20.000 karakter) dipecah dengan header sheet diulang di tiap bagian. Metadata: `{ sheetName, tableTitle }`. Teks yang di-embed = nama sheet + judul tabel + isi (supaya embedding sheet numerik tetap punya sinyal semantik).
- **`chunkPedoman(text)`** — split per butir/seksi penilaian (pola nomor butir "1.1", "2.3", "Butir n", "Matriks Penilaian"); metadata: `{ butirCode, kriteria, sectionTitle }`.

### 3.3 `src/services/ragService.js`
- `indexDocument({ submissionId, docType, content })` — chunk (sesuai docType) → embed batch → insert ke `document_chunks`. Hapus chunk lama dengan `submission_id` + `doc_type` sama sebelum insert (re-upload aman). `docType: 'LED' | 'LKPS' | 'PEDOMAN'` (pedoman: `submissionId = null`).
- `search({ query, submissionId, docType, kriteria, sheetNames, topK })` — **hybrid retrieval**:
  - Semantic: cosine similarity pgvector (`embedding <=> $query`).
  - Keyword: Postgres full-text `ts_rank` pada `content_tsv` (config `'simple'` — PG tidak punya kamus bahasa Indonesia bawaan).
  - Skor gabungan: Reciprocal Rank Fusion (RRF) dari kedua ranking.
  - Filter: `submission_id`, `doc_type`, `metadata->>'kriteria'`, `metadata->>'sheetName' = ANY(...)`.
- `getLKPSSheets(submissionId, sheetNames[])` — ambil chunk LKPS deterministik by nama sheet (jalur utama untuk LKPS); bila sheet tidak ditemukan → `search()` semantik sebagai fallback.
- `getPedomanContext({ butirCode | kriteria, query, topK })` — chunk pedoman relevan untuk injeksi prompt.
- `isAvailable()` — cek pgvector terpasang + ada chunk; dipakai semua call site untuk memutuskan jalur RAG vs jalur lama.
- **Semua kegagalan non-fatal**: log warning → caller jatuh ke jalur lama (`findRelevantSnippet` / `substring`). Sistem tidak pernah lebih buruk dari sekarang.

### 3.4 `scripts/ingest-pedoman.js`
- CLI: `node scripts/ingest-pedoman.js [path]`.
- **Sumber utama: `skoring/pedoman-penilaian.md`** (markdown hasil konversi PDF — teks jauh lebih bersih daripada `pedoman-penilaian-instrumen-lam-teknik-2025 (1).pdf`, tabel & nomor butir terbaca rapi). Bila argumen `.pdf` diberikan, fallback ekstrak via pdf-parse.
- Parse → `ragService.indexDocument({ docType: 'PEDOMAN' })`.
- Idempotent: jalankan ulang mengganti seluruh chunk pedoman lama.

**Catatan sifat pedoman (penting untuk RAG scoring):** Pedoman ini berisi, per butir (53 butir): nama elemen, **indikator/deskripsi dengan daftar aspek** (mis. butir 7 "memenuhi 3 aspek: (1)… (2)… (3)…"), dan **bobot per butir** (Lampiran). Bobot di markdown ini **cocok persis** dengan `criteriaConfig` di `geminiService.js` (terverifikasi untuk program Doktor: butir 1=0.97, 2=0.63, 3=0.22, 4=1.01, dst). Pedoman ini **tidak memuat matriks skor 0–4 eksplisit** maupun rumus kuantitatif (BOP/DPD/interpolasi 3D) — rumus itu hidup di `lamtekScoringService.js`. Karena itu RAG scoring menilai butir kualitatif dengan logika **"berapa banyak aspek indikator yang terbukti di LED"**, bukan mencocokkan deskriptor skor.

### 3.5 Migration SQL (`backend-express/migrations/` atau ditambahkan ke `init-db.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
  id            SERIAL PRIMARY KEY,
  submission_id VARCHAR,            -- NULL untuk PEDOMAN (global)
  doc_type      VARCHAR(10) NOT NULL CHECK (doc_type IN ('LED','LKPS','PEDOMAN')),
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  embedding     vector(768),
  content_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_lookup ON document_chunks (doc_type, submission_id);
```

Catatan deployment: image PostgreSQL harus menyediakan pgvector (mis. ganti image ke `pgvector/pgvector:pg16` di docker-compose, atau install extension manual). Bila extension tidak tersedia, migration bagian vector di-skip dengan warning dan sistem berjalan penuh di jalur fallback.

## 4. Perubahan alur

### 4.1 Indexing saat upload (`uploadController.js`)
Setelah ekstraksi teks LED & LKPS, sebelum `analyzeDocumentsForScoring`:
```
await ragService.indexDocument({ submissionId, docType: 'LED',  content: ledContent });
await ragService.indexDocument({ submissionId, docType: 'LKPS', content: lkpsContent });
```
Gagal indexing → log warning, analisis tetap jalan (jalur lama). Tambahan waktu ±detik (1–3 batch embedding per dokumen). Kirim progress WebSocket stage `indexing`.

### 4.2 Retrieval di `analyzeDocumentsForScoring` (`geminiService.js`)
- **LED per kriteria**: ganti `ledContent.substring(0, 25000)` dengan `ragService.search({ query: <nama kriteria + deskripsi ledKeys>, submissionId, docType: 'LED', topK: 6 })` → gabungkan chunk jadi snippet (cap ~25KB agar ukuran prompt setara sekarang).
- **LKPS per kriteria**: ganti pencarian `indexOf` marker dengan mapping deterministik kriteria→sheet:
  - K2 → `['2a1','2a2','2a3','2b','4a']` (+legacy `['4a','6']`)
  - K3 → `['3a','3b','3c']` (+legacy)
  - K4 → `['4a','4c','3b','3c','4d','4f-1','4f-2','4f-3','4f-4','4i']` (+legacy `['3a1','3a3','3b1','3b4']`)
  - K6 → `['6a','6b','6c1','6c2','6d','6e1','6f1','6f2','6g1','6g2']` (+legacy `['2b','5a','5b1','5b2','5b3','5c','5d']`)
  via `ragService.getLKPSSheets()`; sheet hilang → semantic search fallback; ragService tidak tersedia → jalur lama utuh.
- Normalisasi nama sheet (strip ✓ dll.) sudah ada di `extractTextFromExcel` dan dipakai konsisten di metadata chunk.

### 4.3 Injeksi pedoman ke prompt ekstraksi
- `getLEDExtractionPrompt` / `getLKPSExtractionPrompt` menerima parameter opsional `pedomanContext`; bila ada, ditambahkan section `# PEDOMAN LAM-TEK 2025 (RUJUKAN RESMI)` berisi chunk definisi/rubrik relevan (top-3, cap ~4KB).
- Hint hardcode yang sudah ada TIDAK dihapus — pedoman context bersifat melengkapi.

### 4.4 RAG scoring butir kualitatif (`lamtekScoringService.js` + `geminiService.js`)
- Fungsi baru `geminiService.scoreQualitativeButir(criterionNum, butirList, ledChunks, pedomanChunks)`:
  - **Satu panggilan Gemini per kriteria** (bukan per butir) — hemat kuota 2 RPM. Kriteria dengan `ledKeys` tidak kosong: 1, 2, 3, 5, 7 (+8 analisis) → ±5–7 call ekstra, ±4 menit tambahan di free tier.
  - Prompt: rubrik resmi butir (dari `getPedomanContext`) + bukti LED (dari `search`) → output JSON `{ butirCode: { score: 0–4, justification, confidence } }`.
- `lamtekScoringService`: di jalur yang sekarang memanggil `randomDefaultScore()`, pakai skor RAG bila tersedia. Aturan yang dipertahankan:
  - **Floor 2.0 + reason `low_confidence`** bila bukti tipis/confidence rendah (sesuai aturan scoring floor yang sudah berlaku — jangan pernah 0 hanya karena data tidak ketemu).
  - Skor 0–1.5 hanya bila ada bukti eksplisit capaian memang rendah.
  - RAG scoring gagal/tidak tersedia → fallback `randomDefaultScore()` (perilaku sekarang).
- Hasil `justification` per butir disimpan di `ButirResult` (field baru `aiJustification`) agar bisa ditampilkan ke asesor.
- **Rubrik penilaian = daftar aspek indikator dari pedoman.** Prompt menginstruksikan Gemini: skor 4 jika seluruh aspek terbukti kuat di LED, skor turun proporsional dengan jumlah aspek yang tidak terbukti; bila bukti tidak ditemukan → confidence rendah → floor 2.0 (bukan 0).

### 4.5 Rate limit (mempercepat analisis)
Masalah: `minRequestIntervalMs = 35000` (35 detik/-request) di `geminiService.js` dikalibrasi untuk asumsi lama **2 RPM** → analisis ~5 menit, dan RAG scoring menambah call sehingga makin lama.
- Model produksi sebenarnya **`gemini-3-flash-preview`** (bukan default repo `gemini-1.5-flash`), yang RPM-nya jauh lebih tinggi dari 2.
- **Jadikan interval configurable** via env `GEMINI_MIN_REQUEST_INTERVAL_MS` (default diturunkan, mis. `4000`). Operator set sesuai kuota tier nyata yang terlihat di AI Studio.
- **Embedding pakai limiter terpisah** (kuota embedding terpisah & longgar) — sudah di §3.1, jangan dibebani interval generation.
- Dengan interval ~4 dtk, total analisis (ekstraksi + RAG scoring, ±13–15 call) turun ke ±1 menit, bukan bertambah lama.
- Opsional lanjutan (di luar scope inti): ganti limiter serial "sleep sejak request terakhir" dengan token-bucket + concurrency-limit agar call antar-kriteria bisa paralel dalam budget RPM. Dicatat sebagai peningkatan, tidak wajib di plan ini.

## 5. Error handling (ringkasan)

| Kegagalan | Perilaku |
|---|---|
| Embedding API error saat indexing | Log warning, submission tetap diproses jalur lama |
| pgvector extension tidak terpasang | `ragService.isAvailable()` false → seluruh sistem jalur lama |
| Pedoman belum di-ingest | Prompt tanpa section pedoman; RAG scoring fallback random |
| Embedding API error saat query | Retry → fallback full-text-only → fallback jalur lama |
| RAG scoring JSON tidak valid | Fallback `randomDefaultScore()` per kriteria yang gagal |

## 6. Testing

- **Unit (Jest, tanpa DB/API)**: chunkingService — 3 strategi diuji dengan fixture teks LED/LKPS/pedoman sintetis (deteksi heading, split per sheet, deteksi kode butir, overlap, cap ukuran); ragService — embedding & pg di-mock: urutan fallback, RRF fusion, delete-before-insert.
- **Unit untuk scoring**: `scoreQualitativeButir` parsing + floor 2.0 + fallback.
- **Integration (perlu PG + pgvector, di-skip bila tidak ada)**: migration jalan, insert + cosine query + FTS query kembali benar.
- **Smoke manual**: ingest pedoman dari `skoring/`, upload LED/LKPS contoh (`skoring/Dokumen_led_S3 (6).pdf`, `LKPS S3 AKREDITASI 2026 (6).xlsx`), bandingkan field hasil ekstraksi vs jalur lama.

## 7. Di luar scope

- Re-ranking dengan model cross-encoder.
- UI manajemen knowledge base (ingest tetap via CLI).
- Mengubah formula skor kuantitatif LKPS di `lamtekScoringService` (tetap rule-based).
- Caching embedding lintas submission.
