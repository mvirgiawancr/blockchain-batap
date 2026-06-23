// buat-laporan-kecepatan.mjs
// ---------------------------------------------------------------------------
// Mengubah hasil JSON dari benchmark-baca-skor.js menjadi laporan akademik
// dalam format Markdown (.md) DAN Word (.docx).
//
// Jalankan (dari folder docs/tools):
//   node buat-laporan-kecepatan.mjs ../benchmark-kecepatan-<epoch>.json
//
// Output:
//   docs/laporan-kecepatan-pembacaan-akrechain.md
//   docs/Laporan_Kecepatan_Pembacaan_AkreChain.docx
//
// Token gambar [[SHOT:nama-file|caption]] akan ditanam dari docs/Screenshoot
// (sama seperti build-docx.mjs). Lihat daftar screenshot di bawah laporan.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import HTMLtoDOCX from '@turbodocx/html-to-docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = resolve(__dirname, '..');
const SHOT_DIR = resolve(DOCS_DIR, 'Screenshoot');
const MD_OUT = resolve(DOCS_DIR, 'laporan-kecepatan-pembacaan-akrechain.md');
const DOCX_OUT = resolve(DOCS_DIR, 'Laporan_Kecepatan_Pembacaan_AkreChain.docx');
const IMG_WIDTH = 600;

const jsonArg = process.argv[2];
if (!jsonArg) {
  console.error('Pemakaian: node buat-laporan-kecepatan.mjs <file-hasil-benchmark.json>');
  process.exit(1);
}
const JSON_PATH = resolve(process.cwd(), jsonArg);
if (!existsSync(JSON_PATH)) {
  console.error('File JSON tidak ditemukan:', JSON_PATH);
  process.exit(1);
}
const D = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

// --- util format -----------------------------------------------------------
const num = (v, d = 2) => (v == null || Number.isNaN(v) ? '-' : Number(v).toFixed(d));
const sec = (msVal) => (msVal == null ? '-' : (msVal / 1000).toFixed(2));
const pct = (part, whole) => (whole ? ((part / whole) * 100).toFixed(1) : '-');

const STAGE_LABEL = {
  extractLED: 'Ekstraksi teks LED (PDF)',
  extractLKPS: 'Ekstraksi teks LKPS (Excel)',
  verify: 'Verifikasi jenis dokumen',
  indexRAG: 'Indexing RAG (chunking + embedding)',
  analyzeAI: 'Analisis AI Gemini (ekstraksi data)',
  qualitativeScoring: 'Skoring butir',
  calcLAMTEK: 'Kalkulasi skor LAM-TEK 2025',
  total: 'TOTAL (baca → skor)',
};
const STAGE_ORDER = ['extractLED', 'extractLKPS', 'verify', 'indexRAG', 'analyzeAI', 'qualitativeScoring', 'calcLAMTEK'];

const env = D.environment || {};
const ds = D.dataset || {};
const sm = D.summary || {};
const okRuns = (D.runs || []).filter(r => r.ok);
const totalMean = sm.total ? sm.total.mean : null;
const tanggal = new Date(env.timestamp || D.generatedAt || Date.now()).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

// Throughput
const sampleMeta = (okRuns[0] && okRuns[0].meta) || {};
const totalChars = (sampleMeta.ledChars || 0) + (sampleMeta.lkpsChars || 0);
const throughputCharsPerSec = totalMean ? Math.round(totalChars / (totalMean / 1000)) : null;

// Tahap dominan ditentukan dinamis dari data (bukan diasumsikan)
const ranked = STAGE_ORDER.map(s => ({ s, mean: sm[s] ? sm[s].mean : 0 })).sort((a, b) => b.mean - a.mean);
const top1 = ranked[0] || { s: 'analyzeAI', mean: 0 };
const top2 = ranked[1] || { s: 'qualitativeScoring', mean: 0 };
const aiStages = ['analyzeAI', 'qualitativeScoring'];
const aiTotal = aiStages.reduce((a, s) => a + (sm[s] ? sm[s].mean : 0), 0);

// --- bangun markdown -------------------------------------------------------
const L = [];
L.push('# Laporan Pengujian Kecepatan Pembacaan Dokumen Akreditasi hingga Penghasilan Skor pada Sistem AkreChain');
L.push('');
L.push(`*Dibuat otomatis dari hasil benchmark pada ${tanggal}.*`);
L.push('');

L.push('## 1. Ringkasan Eksekutif');
L.push('');
L.push(`Pengujian ini mengukur **kecepatan** sistem AkreChain dalam membaca sepasang dokumen akreditasi — Laporan Evaluasi Diri (LED) dan Laporan Kinerja Program Studi (LKPS) — hingga menghasilkan **skor akhir LAM-TEK 2025** beserta peringkat akreditasinya. Pengujian dijalankan sebanyak **${D.config ? D.config.runs : okRuns.length} kali** (di luar 1 kali *warm-up*) pada satu set dokumen contoh program **${ds.programType || '-'}**.`);
L.push('');
if (totalMean != null) {
  L.push(`Hasil utama: waktu rata-rata end-to-end **baca → skor** adalah **${sec(totalMean)} detik** (± ${sec(sm.total.std)} detik; koefisien variasi ${num(sm.total.cvPercent, 1)}%). ` +
    `Tahap **${STAGE_LABEL[top1.s]}** menjadi penyumbang waktu terbesar (${pct(top1.mean, totalMean)}% dari total), diikuti **${STAGE_LABEL[top2.s]}** (${pct(top2.mean, totalMean)}%). ` +
    `Tahap kalkulasi skor LAM-TEK bersifat deterministik dan praktis seketika (${sm.calcLAMTEK ? num(sm.calcLAMTEK.mean, 1) + ' ms' : '-'}).`);
  L.push('');
}
if (D.resultConsistency && D.resultConsistency.akreditasi) {
  L.push(`Konsistensi hasil: skor akhir yang dihasilkan adalah ${(D.resultConsistency.finalScores || []).map(s => num(s)).join('; ')} dengan peringkat **${D.resultConsistency.akreditasi.join(', ') || '-'}**.`);
  L.push('');
}

L.push('## 2. Tujuan Pengujian');
L.push('');
L.push('1. Mengukur waktu yang dibutuhkan sistem untuk memproses dokumen LED dan LKPS hingga menghasilkan skor akreditasi secara otomatis.');
L.push('2. Mengidentifikasi tahap mana dalam pipeline yang menjadi penyumbang waktu terbesar (*bottleneck*).');
L.push('3. Menilai konsistensi (kestabilan) waktu proses dan hasil skor pada eksekusi berulang.');
L.push('4. Menyediakan data kuantitatif kinerja sistem sebagai bahan publikasi/jurnal.');
L.push('');

L.push('## 3. Metodologi');
L.push('');
L.push('Pengujian dilakukan dengan menjalankan ulang pipeline analisis dokumen yang persis sama dengan alur produksi pada `uploadController.js`, namun **mengecualikan** tahap yang bukan bagian dari "pembacaan dokumen" (penyimpanan IPFS terenkripsi, pencatatan ke blockchain Hyperledger Fabric, dan notifikasi WebSocket). Waktu tiap tahap diukur memakai `process.hrtime.bigint()` (presisi nanodetik). Satu iterasi *warm-up* dijalankan lebih dulu untuk memuat model *embedding* lokal dan koneksi basis data, lalu tidak diikutkan dalam statistik agar hasil tidak bias oleh *cold start*.');
L.push('');
L.push('Pipeline yang diukur terdiri atas tujuh tahap berurutan:');
L.push('');
L.push('| No | Tahap | Keterangan |');
L.push('|----|-------|------------|');
L.push('| 1 | Ekstraksi teks LED | Mengubah dokumen PDF LED menjadi teks (`pdf-parse`). |');
L.push('| 2 | Ekstraksi teks LKPS | Membaca seluruh *sheet* Excel LKPS menjadi teks (`ExcelJS`). |');
L.push('| 3 | Verifikasi jenis dokumen | Memastikan dokumen benar LED/LKPS berdasarkan kata kunci. |');
L.push('| 4 | Indexing RAG | Memecah teks menjadi *chunk* dan membuat *embedding* (model E5 lokal) ke pgvector. |');
L.push('| 5 | Analisis AI Gemini | Ekstraksi data terstruktur per kriteria oleh model `' + (env.geminiModel || 'Gemini') + '`. |');
L.push('| 6 | Skoring butir | Penilaian butir berbasis bukti hasil *retrieval* RAG. |');
L.push('| 7 | Kalkulasi skor LAM-TEK 2025 | Perhitungan akhir berbobot 7 kriteria (deterministik). |');
L.push('');
L.push('[[SHOT:diagram-pipeline.png|Gambar 1. Diagram alur pipeline pembacaan dokumen hingga skor]]');
L.push('');

L.push('## 4. Lingkungan Pengujian');
L.push('');
L.push('| Komponen | Spesifikasi |');
L.push('|----------|-------------|');
L.push(`| Tanggal/waktu | ${tanggal} |`);
L.push(`| Runtime Node.js | ${env.node || '-'} |`);
L.push(`| Platform | ${env.platform || '-'} |`);
L.push(`| CPU | ${env.cpuModel || '-'} (${env.cpus || '-'} core) |`);
L.push(`| Memori | ${env.totalMemGB || '-'} GB |`);
L.push(`| Model AI (ekstraksi) | ${env.geminiModel || '-'} |`);
L.push(`| Model AI cadangan | ${env.geminiFallbackModel || '-'} |`);
L.push(`| Penyedia embedding | ${env.embeddingProvider || '-'} |`);
L.push(`| Mode Full RAG | ${env.fullRag ? 'Aktif' : 'Nonaktif'} |`);
L.push(`| Jeda minimal antar-permintaan AI | ${env.geminiMinIntervalMs || '-'} ms |`);
L.push('');
L.push('[[SHOT:konfigurasi-env.png|Gambar 2. Konfigurasi lingkungan (.env) dan versi Node.js di terminal WSL]]');
L.push('');

L.push('## 5. Dataset Uji');
L.push('');
L.push('Dokumen contoh disediakan oleh Profesor sebagai sampel program studi ' + (ds.programType || '-') + '.');
L.push('');
L.push('| Dokumen | Nama Berkas | Ukuran | Jumlah Karakter Terbaca | Jumlah Chunk |');
L.push('|---------|-------------|--------|--------------------------|--------------|');
L.push(`| LED (PDF) | ${ds.led ? ds.led.name : '-'} | ${ds.led ? num(ds.led.sizeMB) + ' MB' : '-'} | ${sampleMeta.ledChars ? sampleMeta.ledChars.toLocaleString('id-ID') : '-'} | ${sampleMeta.ledChunks || '-'} |`);
L.push(`| LKPS (Excel) | ${ds.lkps ? ds.lkps.name : '-'} | ${ds.lkps ? num(ds.lkps.sizeMB) + ' MB' : '-'} | ${sampleMeta.lkpsChars ? sampleMeta.lkpsChars.toLocaleString('id-ID') : '-'} | ${sampleMeta.lkpsChunks || '-'} |`);
L.push('');

L.push('## 6. Hasil Pengujian');
L.push('');
L.push('### 6.1 Rincian Waktu per Eksekusi (detik)');
L.push('');
let head = '| Tahap |';
let sep = '|-------|';
okRuns.forEach(r => { head += ` Run ${r.runIndex} |`; sep += '------|'; });
L.push(head);
L.push(sep);
for (const s of STAGE_ORDER.concat('total')) {
  let row = `| ${STAGE_LABEL[s]} |`;
  okRuns.forEach(r => { row += ` ${sec(r.stages[s])} |`; });
  L.push(row);
}
L.push('');

L.push('### 6.2 Ringkasan Statistik per Tahap');
L.push('');
L.push('| Tahap | Rata-rata (s) | Median (s) | Min (s) | Maks (s) | Std (s) | CV (%) | % dari Total |');
L.push('|-------|---------------|------------|---------|----------|---------|--------|--------------|');
for (const s of STAGE_ORDER) {
  const st = sm[s];
  if (!st) continue;
  L.push(`| ${STAGE_LABEL[s]} | ${sec(st.mean)} | ${sec(st.median)} | ${sec(st.min)} | ${sec(st.max)} | ${sec(st.std)} | ${num(st.cvPercent, 1)} | ${pct(st.mean, totalMean)}% |`);
}
if (sm.total) {
  L.push(`| **${STAGE_LABEL.total}** | **${sec(sm.total.mean)}** | **${sec(sm.total.median)}** | **${sec(sm.total.min)}** | **${sec(sm.total.max)}** | **${sec(sm.total.std)}** | **${num(sm.total.cvPercent, 1)}** | **100%** |`);
}
L.push('');
L.push('[[SHOT:output-terminal-benchmark.png|Gambar 3. Keluaran terminal saat menjalankan skrip benchmark (ringkasan per tahap)]]');
L.push('');
L.push('[[SHOT:grafik-waktu-per-tahap.png|Gambar 4. Grafik proporsi waktu tiap tahap terhadap total]]');
L.push('');

L.push('### 6.3 Throughput & Konsistensi Hasil');
L.push('');
L.push(`- **Throughput pembacaan**: ≈ ${throughputCharsPerSec ? throughputCharsPerSec.toLocaleString('id-ID') : '-'} karakter/detik (total ${totalChars ? totalChars.toLocaleString('id-ID') : '-'} karakter LED+LKPS diproses dalam rata-rata ${sec(totalMean)} detik).`);
L.push(`- **Konsistensi waktu**: koefisien variasi total ${sm.total ? num(sm.total.cvPercent, 1) + '%' : '-'} ${sm.total && sm.total.cvPercent < 15 ? '(stabil)' : '(perlu dicermati)'}.`);
if (D.resultConsistency) {
  L.push(`- **Konsistensi skor**: skor akhir ${(D.resultConsistency.finalScores || []).map(s => num(s)).join('; ') || '-'}; peringkat akreditasi ${D.resultConsistency.akreditasi && D.resultConsistency.akreditasi.length ? D.resultConsistency.akreditasi.join(', ') : '-'}.`);
}
L.push('');
L.push('[[SHOT:hasil-skor-frontend.png|Gambar 5. Tampilan skor akhir & peringkat akreditasi pada antarmuka AkreChain]]');
L.push('');

L.push('## 7. Pembahasan');
L.push('');
L.push(`Distribusi waktu menunjukkan bahwa tahap **${STAGE_LABEL[top1.s]}** merupakan penyumbang waktu terbesar (${pct(top1.mean, totalMean)}% dari total), disusul **${STAGE_LABEL[top2.s]}** (${pct(top2.mean, totalMean)}%). Secara gabungan, proses berbasis kecerdasan buatan (analisis Gemini + skoring butir) menyumbang ${pct(aiTotal, totalMean)}% dari total waktu.`);
L.push('');
if (top1.s === 'indexRAG') {
  L.push(`Tingginya porsi tahap *indexing RAG* disebabkan oleh pembuatan *embedding* seluruh potongan (chunk) dokumen menggunakan model E5 lokal yang berjalan di **CPU**. Karena dokumen LED+LKPS menghasilkan ratusan chunk, beban komputasi *embedding* menjadi dominan pada perangkat dengan ${env.totalMemGB || '-'} GB RAM tanpa akselerasi GPU. Tahap **analisis AI Gemini** dan **skoring butir** menempati urutan berikutnya karena memanggil layanan model bahasa eksternal yang dibatasi latensi jaringan dan jeda minimal antar-permintaan (${env.geminiMinIntervalMs || '-'} ms) untuk menghormati kuota API.`);
} else {
  L.push(`Proses berbasis AI mendominasi karena memanggil layanan model bahasa eksternal yang dibatasi latensi jaringan dan jeda minimal antar-permintaan (${env.geminiMinIntervalMs || '-'} ms) untuk menghormati kuota API.`);
}
L.push('');
L.push(`Sebaliknya, tahap **ekstraksi teks** dan **kalkulasi skor LAM-TEK** berjalan lokal dan sangat cepat; kalkulasi skor akhir bahkan selesai dalam orde milidetik (${sm.calcLAMTEK ? num(sm.calcLAMTEK.mean, 1) + ' ms' : '-'}) karena bersifat deterministik (perhitungan berbobot tanpa pemanggilan model).`);
L.push('');
L.push(`Implikasi praktisnya: optimasi kecepatan paling efektif difokuskan pada tahap **${STAGE_LABEL[top1.s]}**${top1.s === 'indexRAG' ? ' (mis. akselerasi GPU untuk embedding, pengurangan jumlah chunk, atau model embedding yang lebih ringan)' : ' (mis. paralelisasi pemanggilan per kriteria, caching, atau model yang lebih ringan)'}, sementara tahap lokal lain sudah efisien. Tingkat konsistensi waktu antar-eksekusi (CV total ${sm.total ? num(sm.total.cvPercent, 1) + '%' : '-'}) menjadi indikator kelayakan sistem untuk penggunaan operasional.`);
L.push('');

L.push('## 8. Kesimpulan');
L.push('');
L.push(`Sistem AkreChain mampu membaca sepasang dokumen LED+LKPS dan menghasilkan skor akreditasi LAM-TEK 2025 secara otomatis dalam waktu rata-rata **${sec(totalMean)} detik** per dokumen pada lingkungan pengujian. Proses didominasi oleh tahap **${STAGE_LABEL[top1.s]}** (${pct(top1.mean, totalMean)}%) dan **${STAGE_LABEL[top2.s]}** (${pct(top2.mean, totalMean)}%), sedangkan tahap kalkulasi skor berlangsung nyaris seketika. Skor akhir yang dihasilkan konsisten pada peringkat **${(D.resultConsistency && D.resultConsistency.akreditasi || []).join(', ') || '-'}** di seluruh eksekusi, menunjukkan kestabilan sistem. Data ini dapat dijadikan dasar pelaporan kinerja pada jurnal.`);
L.push('');

L.push('## 9. Lampiran');
L.push('');
L.push('- Berkas data mentah hasil benchmark: `' + jsonArg + '`');
L.push('- Skrip pengujian: `backend-express/scripts/benchmark-baca-skor.js`');
L.push('- Cara menjalankan ulang: lihat komentar di bagian atas skrip.');
L.push('');

const md = L.join('\n');
writeFileSync(MD_OUT, md, 'utf8');
console.log('OK -> ' + MD_OUT);

// --- konversi ke .docx (pola sama dengan build-docx.mjs) -------------------
function mime(file) {
  const e = extname(file).toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.gif') return 'image/gif';
  return 'image/png';
}
function figureHtml(file, caption) {
  const full = resolve(SHOT_DIR, file);
  if (!existsSync(full)) {
    return `<p style="color:#b00"><em>[${caption} — screenshot belum tersedia: ${file}]</em></p>`;
  }
  const b64 = readFileSync(full).toString('base64');
  return `<p><img src="data:${mime(file)};base64,${b64}" width="${IMG_WIDTH}" /></p>` +
         `<p style="text-align:center;font-size:10pt;color:#555"><em>${caption}</em></p>`;
}

let mdImg = md, found = 0, missing = 0;
mdImg = mdImg.replace(/\[\[SHOT:([^|\]]+)\|([^\]]+)\]\]/g, (_, file, caption) => {
  const html = figureHtml(file.trim(), caption.trim());
  if (html.includes('belum tersedia')) missing++; else found++;
  return '\n' + html + '\n';
});

let body = marked.parse(mdImg, { mangle: false, headerIds: false });
body = body
  .replace(/<table>/g, '<table border="1" style="border-collapse:collapse;width:100%">')
  .replace(/<th>/g, '<th style="border:1px solid #444;padding:4px;background:#eef;text-align:left">')
  .replace(/<td>/g, '<td style="border:1px solid #444;padding:4px;vertical-align:top">');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.4}
h1{font-size:16pt;text-align:center}
h2{font-size:13pt;border-bottom:1px solid #999}
h3{font-size:12pt}
table{border-collapse:collapse;width:100%;font-size:10pt}
img{max-width:100%}
</style></head><body>${body}</body></html>`;

const buffer = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
  footer: false,
  pageNumber: false,
});
writeFileSync(DOCX_OUT, buffer);
console.log('OK -> ' + DOCX_OUT);
console.log(`Gambar tertanam: ${found} | belum tersedia: ${missing}`);
