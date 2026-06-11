/**
 * Ingest pedoman penilaian LAM-TEK 2025 ke knowledge base RAG (doc_type=PEDOMAN).
 * Usage:
 *   node scripts/ingest-pedoman.js                       # default ../skoring/pedoman-penilaian.md
 *   node scripts/ingest-pedoman.js /path/ke/pedoman.md   # markdown
 *   node scripts/ingest-pedoman.js /path/ke/pedoman.pdf  # pdf (fallback pdf-parse)
 * Idempotent: mengganti seluruh chunk PEDOMAN lama.
 */
const fs = require('fs');
const path = require('path');
const RagService = require('../src/services/ragService');

async function readContent(file) {
  if (file.toLowerCase().endsWith('.pdf')) {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fs.readFileSync(file));
    return data.text;
  }
  return fs.readFileSync(file, 'utf8');
}

async function main() {
  const arg = process.argv[2];
  const file = arg || path.join(__dirname, '..', '..', 'skoring', 'pedoman-penilaian.md');
  if (!fs.existsSync(file)) {
    console.error(`[IngestPedoman] File tidak ditemukan: ${file}`);
    process.exit(1);
  }
  console.log(`[IngestPedoman] Membaca ${file}...`);
  const content = await readContent(file);

  const rag = new RagService();
  if (!(await rag.isAvailable())) {
    console.error('[IngestPedoman] RAG tidak tersedia (pgvector / embedding belum siap). Jalankan migration & set GEMINI_API_KEY dulu.');
    process.exit(1);
  }
  await rag.indexDocument({ submissionId: null, docType: 'PEDOMAN', content });
  console.log('[IngestPedoman] Selesai.');
  process.exit(0);
}

main().catch(err => { console.error('[IngestPedoman] Gagal:', err.message); process.exit(1); });
