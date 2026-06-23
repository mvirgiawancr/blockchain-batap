// Generator Word (.docx) untuk Buku Panduan Pengujian AkreChain.
// Membaca markdown + token [[SHOT:file|caption]], menanam gambar dari ../Screenshoot,
// lalu mengonversi ke .docx. Jalankan: npm run build  (dari folder docs/tools)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import HTMLtoDOCX from '@turbodocx/html-to-docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MD_PATH = resolve(__dirname, '..', 'buku_panduan_pengujian_akrechain.md');
const SHOT_DIR = resolve(__dirname, '..', 'Screenshoot');
const OUT_PATH = resolve(__dirname, '..', 'Buku_Panduan_Pengujian_AkreChain.docx');
const IMG_WIDTH = 600; // px, pas untuk A4 portrait

function mime(file) {
  const e = extname(file).toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.gif') return 'image/gif';
  return 'image/png';
}

function figureHtml(file, caption) {
  const full = resolve(SHOT_DIR, file);
  if (!existsSync(full)) {
    console.warn(`  ! Gambar tidak ditemukan: ${file}`);
    return `<p style="color:#b00"><em>[${caption} — screenshot belum tersedia: ${file}]</em></p>`;
  }
  const b64 = readFileSync(full).toString('base64');
  const src = `data:${mime(file)};base64,${b64}`;
  return `<p><img src="${src}" width="${IMG_WIDTH}" /></p>` +
         `<p style="text-align:center;font-size:10pt;color:#555"><em>${caption}</em></p>`;
}

let md = readFileSync(MD_PATH, 'utf8');

let found = 0, missing = 0;
md = md.replace(/\[\[SHOT:([^|\]]+)\|([^\]]+)\]\]/g, (_, file, caption) => {
  const f = file.trim();
  const html = figureHtml(f, caption.trim());
  if (html.includes('belum tersedia')) missing++; else found++;
  return '\n' + html + '\n';
});

let body = marked.parse(md, { mangle: false, headerIds: false });

// Tambahkan border tabel (html-to-docx membaca atribut/inline style).
body = body
  .replace(/<table>/g, '<table border="1" style="border-collapse:collapse;width:100%">')
  .replace(/<th>/g, '<th style="border:1px solid #444;padding:4px;background:#eef;text-align:left">')
  .replace(/<td>/g, '<td style="border:1px solid #444;padding:4px;vertical-align:top">');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.4}
h1{font-size:18pt;text-align:center}
h2{font-size:14pt;border-bottom:1px solid #999}
h3{font-size:12pt}
h4{font-size:11pt}
table{border-collapse:collapse;width:100%}
img{max-width:100%}
</style></head><body>${body}</body></html>`;

const buffer = await HTMLtoDOCX(html, null, {
  orientation: 'portrait',
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
  footer: false,
  pageNumber: false,
});

writeFileSync(OUT_PATH, buffer);
console.log(`\nOK -> ${OUT_PATH}`);
console.log(`Gambar tertanam: ${found} | belum tersedia: ${missing}`);
