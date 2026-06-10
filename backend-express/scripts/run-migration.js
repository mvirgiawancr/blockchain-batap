/**
 * Jalankan semua file .sql di migrations/ secara berurutan.
 * Idempotent: semua statement pakai IF NOT EXISTS.
 * Usage: node scripts/run-migration.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function run() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`[Migration] Running ${file}...`);
    try {
      await db.query(sql);
      console.log(`[Migration] ✓ ${file}`);
    } catch (err) {
      if (/extension "vector" is not available|could not open extension/i.test(err.message)) {
        console.warn(`[Migration] ⚠ pgvector tidak tersedia — skip vektor. RAG akan jalan di fallback. (${err.message})`);
        return;
      }
      throw err;
    }
  }
  console.log('[Migration] Selesai.');
  process.exit(0);
}

run().catch(err => { console.error('[Migration] Gagal:', err.message); process.exit(1); });
