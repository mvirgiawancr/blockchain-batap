/**
 * benchmark-baca-skor.js
 * ----------------------------------------------------------------------------
 * Mengukur KECEPATAN pipeline "baca dokumen Akreditasi (LED + LKPS) -> skor".
 *
 * Mereplikasi alur analisis pada uploadController.js, TANPA bagian non-pembacaan
 * (IPFS, enkripsi, blockchain, websocket) supaya yang diukur murni:
 *   1) Ekstraksi teks LED (PDF)        -> extractTextFromPDF
 *   2) Ekstraksi teks LKPS (Excel)     -> extractTextFromExcel
 *   3) Verifikasi jenis dokumen        -> verifyDocumentType (LED & LKPS)
 *   4) Indexing RAG (chunk + embedding)-> ragService.indexDocument (LED & LKPS)
 *   5) Analisis AI Gemini              -> analyzeDocumentsForScoring
 *   6) Skoring kualitatif butir (RAG)  -> scoreAllQualitativeButir
 *   7) Kalkulasi skor LAM-TEK 2025     -> calculateDetailedLAMTEKScores
 *   = TOTAL (end-to-end baca -> skor)
 *
 * Setiap tahap diukur dengan process.hrtime.bigint() (presisi nanodetik).
 * Dijalankan N kali (default 5) + 1 warm-up (tidak dihitung, untuk memuat
 * model embedding lokal E5 & koneksi DB). Hasil ditulis ke JSON.
 *
 * CARA PAKAI (dari folder backend-express, Node 22 di WSL):
 *   node scripts/benchmark-baca-skor.js
 *   node scripts/benchmark-baca-skor.js --runs 5 \
 *        --led "../skoring/Dokumen_led_S3 (6).pdf" \
 *        --lkps "../skoring/LKPS  S3 AKREDITASI 2026 (6).xlsx" \
 *        --program D --prodi "Doktor Teknik" --institusi "Universitas Contoh"
 *
 * Prasyarat: DB Postgres/pgvector hidup, GEMINI_API_KEY terisi di .env,
 * pedoman sudah di-ingest (scripts/ingest-pedoman.js) agar rubrik RAG tersedia.
 * ----------------------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');

// Muat .env relatif ke backend-express agar config (Gemini/DB) terbaca walau
// dijalankan dari direktori lain.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = require('../src/config');
const geminiService = require('../src/services/geminiService');
const lamtekScoringService = require('../src/services/lamtekScoringService');
const chunking = require('../src/services/chunkingService');
const RagService = require('../src/services/ragService');

// ---------------------------------------------------------------------------
// Argumen CLI sederhana
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const RUNS = parseInt(args.runs || '5', 10);
const LED_PATH = args.led || path.join(__dirname, '..', '..', 'skoring', 'Dokumen_led_S3 (6).pdf');
const LKPS_PATH = args.lkps || path.join(__dirname, '..', '..', 'skoring', 'LKPS  S3 AKREDITASI 2026 (6).xlsx');
const PROGRAM_TYPE = args.program || 'D'; // D = Doktor (S3)
const PRODI = args.prodi || 'Program Studi Doktor (Contoh Prof)';
const INSTITUSI = args.institusi || 'Perguruan Tinggi Contoh';
const OUT_PATH = args.out || path.join(__dirname, '..', '..', 'docs', `benchmark-kecepatan-${Date.now()}.json`);

// ---------------------------------------------------------------------------
// Util waktu & statistik
// ---------------------------------------------------------------------------
function now() { return process.hrtime.bigint(); }
function ms(startNs) { return Number(now() - startNs) / 1e6; }

async function timed(fn) {
  const t0 = now();
  const result = await fn();
  return { durationMs: ms(t0), result };
}

function stats(values) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    mean: +mean.toFixed(2),
    std: +std.toFixed(2),
    min: +Math.min(...values).toFixed(2),
    max: +Math.max(...values).toFixed(2),
    median: +median.toFixed(2),
    cvPercent: mean ? +((std / mean) * 100).toFixed(1) : 0,
  };
}

// ---------------------------------------------------------------------------
// Skoring kualitatif butir (replika blok di uploadController.js)
// ---------------------------------------------------------------------------
async function scoreQualitative({ ragService, ragOn, submissionId, ledContent }) {
  const evidenceList = [];
  for (const k of [1, 2, 3, 5, 7]) {
    const crit = geminiService.criteriaConfig[k];
    if (!crit || !crit.ledKeys || crit.ledKeys.length === 0) continue;
    let ledEvidence = '';
    let pedomanRubric = '';
    if (ragOn) {
      try {
        const ledRows = await ragService.search({ query: `${crit.name} ${crit.ledKeys.join(' ')}`, submissionId, docType: 'LED', kriteria: k, topK: 6 });
        ledEvidence = ledRows.map(r => r.content).join('\n\n');
        const pedomanRows = await ragService.getPedomanContext({ kriteria: k, query: crit.name, topK: 3 });
        pedomanRubric = pedomanRows.map(r => r.content).join('\n\n');
      } catch (rErr) {
        // retrieval gagal -> kriteria dinilai tanpa bukti (akan di-floor)
      }
    } else {
      ledEvidence = geminiService.findRelevantSnippet(ledContent, [crit.name, `KRITERIA ${k}`, `Kriteria ${k}`], 12000);
      pedomanRubric = geminiService.getLEDFieldDescriptions(k) || '';
    }
    evidenceList.push({ criterionNum: k, butirList: crit.butir, ledEvidence, pedomanRubric });
  }
  if (evidenceList.length) {
    return await geminiService.scoreAllQualitativeButir(evidenceList);
  }
  return {};
}

// ---------------------------------------------------------------------------
// Satu kali jalan pipeline penuh
// ---------------------------------------------------------------------------
async function runOnce({ ledBuffer, lkpsBuffer, runIndex }) {
  const submissionId = `BENCH-${Date.now()}-${runIndex}`;
  const stages = {};
  const r = { runIndex, submissionId, stages, ok: true, error: null };

  const totalStart = now();
  try {
    // 1) Ekstraksi LED (PDF)
    const led = await timed(() => geminiService.extractTextFromPDF(ledBuffer));
    stages.extractLED = led.durationMs;
    const ledContent = led.result;

    // 2) Ekstraksi LKPS (Excel)
    const lkps = await timed(() => geminiService.extractTextFromExcel(lkpsBuffer));
    stages.extractLKPS = lkps.durationMs;
    const lkpsContent = lkps.result;

    // 3) Verifikasi jenis dokumen (LED + LKPS)
    const verify = await timed(async () => {
      await geminiService.verifyDocumentType(ledContent, 'LED');
      await geminiService.verifyDocumentType(lkpsContent, 'LKPS');
    });
    stages.verify = verify.durationMs;

    // 4) Indexing RAG (chunk + embedding) LED + LKPS
    const ragService = new RagService();
    const ragOn = await ragService.isAvailable().catch(() => false);
    const index = await timed(async () => {
      await ragService.indexDocument({ submissionId, docType: 'LED', content: ledContent });
      await ragService.indexDocument({ submissionId, docType: 'LKPS', content: lkpsContent });
    });
    stages.indexRAG = index.durationMs;

    // 5) Analisis AI Gemini (ekstraksi data terstruktur untuk skoring)
    const analyze = await timed(() => geminiService.analyzeDocumentsForScoring(
      PRODI, INSTITUSI, ledContent, lkpsContent, PROGRAM_TYPE, { submissionId, ragService }
    ));
    stages.analyzeAI = analyze.durationMs;
    const analysisResult = analyze.result;

    // 6) Skoring kualitatif butir (RAG retrieval + 1 panggilan generasi)
    const qual = await timed(() => scoreQualitative({ ragService, ragOn, submissionId, ledContent }));
    stages.qualitativeScoring = qual.durationMs;
    const qualitativeScores = qual.result;

    // 7) Kalkulasi skor LAM-TEK 2025 (deterministik)
    const calc = await timed(() => lamtekScoringService.calculateDetailedLAMTEKScores(
      analysisResult.led_data, analysisResult.lkps_data, PROGRAM_TYPE, qualitativeScores
    ));
    stages.calcLAMTEK = calc.durationMs;
    const scoringResult = calc.result;

    stages.total = Number(now() - totalStart) / 1e6;

    // Metadata hasil
    r.meta = {
      ledChars: ledContent.length,
      lkpsChars: lkpsContent.length,
      ledChunks: chunking.chunkLED(ledContent).length,
      lkpsChunks: chunking.chunkLKPS(lkpsContent).length,
      ragAvailable: ragOn,
      ledFieldsExtracted: analysisResult.led_data ? Object.keys(analysisResult.led_data).length : 0,
      lkpsFieldsExtracted: analysisResult.lkps_data ? Object.keys(analysisResult.lkps_data).length : 0,
      readyForScoring: !!(analysisResult.scoring_readiness && analysisResult.scoring_readiness.ready_for_lamtek_scoring),
      finalScore: scoringResult ? +Number(scoringResult.finalScore).toFixed(2) : null,
      maxPossibleScore: scoringResult ? scoringResult.maxPossibleScore : null,
      percentage: scoringResult ? scoringResult.percentage : null,
      akreditasi: scoringResult ? scoringResult.akreditasi : null,
    };
  } catch (err) {
    r.ok = false;
    r.error = err && err.message ? err.message : String(err);
    stages.total = Number(now() - totalStart) / 1e6;
  }
  return r;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log('='.repeat(70));
  console.log('BENCHMARK KECEPATAN: Baca Dokumen Akreditasi -> Skor');
  console.log('='.repeat(70));

  for (const p of [LED_PATH, LKPS_PATH]) {
    if (!fs.existsSync(p)) {
      console.error(`\n[FATAL] File tidak ditemukan: ${p}`);
      console.error('Sesuaikan path dengan --led dan --lkps.');
      process.exit(1);
    }
  }

  const ledStat = fs.statSync(LED_PATH);
  const lkpsStat = fs.statSync(LKPS_PATH);
  const ledBuffer = fs.readFileSync(LED_PATH);
  const lkpsBuffer = fs.readFileSync(LKPS_PATH);

  const os = require('os');
  const environment = {
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpus: os.cpus().length,
    cpuModel: (os.cpus()[0] || {}).model || 'unknown',
    totalMemGB: +(os.totalmem() / 1024 ** 3).toFixed(1),
    geminiModel: config.gemini.model,
    geminiFallbackModel: config.gemini.fallbackModel,
    geminiMinIntervalMs: config.gemini.minRequestIntervalMs,
    embeddingProvider: config.rag.embeddingProvider,
    fullRag: config.rag.enabled,
    embeddingEnabled: config.rag.embeddingEnabled,
  };

  const dataset = {
    led: { path: LED_PATH, name: path.basename(LED_PATH), sizeBytes: ledStat.size, sizeMB: +(ledStat.size / 1024 ** 2).toFixed(2) },
    lkps: { path: LKPS_PATH, name: path.basename(LKPS_PATH), sizeBytes: lkpsStat.size, sizeMB: +(lkpsStat.size / 1024 ** 2).toFixed(2) },
    programType: PROGRAM_TYPE,
    prodi: PRODI,
    institusi: INSTITUSI,
  };

  console.log('\nLingkungan:', JSON.stringify(environment, null, 2));
  console.log('\nDataset:', JSON.stringify({ led: dataset.led.name, lkps: dataset.lkps.name, program: PROGRAM_TYPE }, null, 2));

  // Warm-up (tidak dihitung) -> memuat model embedding lokal + koneksi DB
  console.log('\n[Warm-up] Memuat model & koneksi (tidak dihitung)...');
  const warm = await runOnce({ ledBuffer, lkpsBuffer, runIndex: 0 });
  console.log(`[Warm-up] selesai dalam ${(warm.stages.total / 1000).toFixed(1)} s${warm.ok ? '' : ' (ERROR: ' + warm.error + ')'}`);

  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    console.log(`\n[Run ${i}/${RUNS}] mulai...`);
    const r = await runOnce({ ledBuffer, lkpsBuffer, runIndex: i });
    if (r.ok) {
      console.log(`[Run ${i}/${RUNS}] selesai: total=${(r.stages.total / 1000).toFixed(1)}s, ` +
        `skor=${r.meta.finalScore}/${r.meta.maxPossibleScore} (${r.meta.akreditasi})`);
    } else {
      console.log(`[Run ${i}/${RUNS}] GAGAL: ${r.error}`);
    }
    runs.push(r);
  }

  // Agregasi per tahap (hanya run yang sukses)
  const okRuns = runs.filter(r => r.ok);
  const stageNames = ['extractLED', 'extractLKPS', 'verify', 'indexRAG', 'analyzeAI', 'qualitativeScoring', 'calcLAMTEK', 'total'];
  const summary = {};
  for (const s of stageNames) {
    summary[s] = stats(okRuns.map(r => r.stages[s]).filter(v => typeof v === 'number'));
  }

  const output = {
    title: 'Benchmark Kecepatan Pembacaan Dokumen Akreditasi hingga Skor (AkreChain)',
    environment,
    dataset,
    config: { runs: RUNS, warmupExcluded: true, timingUnit: 'milliseconds' },
    warmup: { stages: warm.stages, ok: warm.ok, error: warm.error },
    runs,
    summary,
    resultConsistency: {
      finalScores: okRuns.map(r => r.meta && r.meta.finalScore).filter(v => v != null),
      akreditasi: [...new Set(okRuns.map(r => r.meta && r.meta.akreditasi).filter(Boolean))],
    },
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('RINGKASAN (rata-rata dari ' + okRuns.length + ' run sukses)');
  console.log('='.repeat(70));
  for (const s of stageNames) {
    const st = summary[s];
    if (st) console.log(`  ${s.padEnd(20)} ${String(st.mean).padStart(10)} ms  (±${st.std} ms, CV ${st.cvPercent}%)`);
  }
  console.log('\nHasil JSON tersimpan di:\n  ' + OUT_PATH);
  console.log('\nLangkah berikutnya: kirim file JSON ini, atau jalankan:');
  console.log('  node ../docs/tools/buat-laporan-kecepatan.mjs "' + OUT_PATH + '"');

  process.exit(0);
})().catch(err => {
  console.error('\n[FATAL] Benchmark gagal:', err);
  process.exit(1);
});
