/**
 * Chunking structure-aware untuk 3 jenis dokumen LAM-TEK.
 * Semua fungsi mengembalikan: { content, chunkIndex, metadata }[]
 */

const MAX_CHARS = 6000;       // ~1500 token
const OVERLAP_CHARS = 800;    // ~200 token

function splitWithOverlap(text, baseMeta, startIndex) {
  const out = [];
  let idx = startIndex;
  if (text.length <= MAX_CHARS) {
    out.push({ content: text, chunkIndex: idx, metadata: { ...baseMeta } });
    return out;
  }
  let pos = 0;
  while (pos < text.length) {
    const slice = text.slice(pos, pos + MAX_CHARS);
    out.push({ content: slice, chunkIndex: idx++, metadata: { ...baseMeta } });
    if (pos + MAX_CHARS >= text.length) break;
    pos += MAX_CHARS - OVERLAP_CHARS;
  }
  return out;
}

function chunkLED(text) {
  const headingRe = /^(KRITERIA\s+(\d+)[^\n]*|BAB\s+[IVX0-9]+[^\n]*|\d+\.\s+[A-Z][^\n]{3,80})$/gim;
  const matches = [...text.matchAll(headingRe)];
  const chunks = [];

  if (matches.length === 0) {
    return splitWithOverlap(text.trim() || text, { sectionTitle: null, kriteria: null }, 0);
  }

  let idx = 0;
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const sectionTitle = matches[i][0].trim();
    const kriteriaMatch = sectionTitle.match(/KRITERIA\s+(\d+)/i);
    const kriteria = kriteriaMatch ? parseInt(kriteriaMatch[1]) : null;
    const body = text.slice(start, end).trim();
    const parts = splitWithOverlap(body, { sectionTitle, kriteria }, idx);
    idx += parts.length;
    chunks.push(...parts);
  }
  return chunks;
}

function chunkLKPS(text) {
  const markerRe = /---\s*Sheet:\s*([^\-]+?)\s*---/g;
  const matches = [...text.matchAll(markerRe)];

  if (matches.length === 0) {
    return [{ content: text, chunkIndex: 0, metadata: { sheetName: null, tableTitle: null } }];
  }

  const chunks = [];
  let idx = 0;
  for (let i = 0; i < matches.length; i++) {
    const sheetName = matches[i][1].replace(/[✓✔✅☑]/g, '').trim();
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    const header = `--- Sheet: ${sheetName} ---`;

    if (body.length <= MAX_CHARS) {
      chunks.push({ content: body, chunkIndex: idx++, metadata: { sheetName, tableTitle: null } });
    } else {
      let pos = 0;
      while (pos < body.length) {
        const piece = body.slice(pos, pos + MAX_CHARS);
        const content = piece.includes(header) ? piece : `${header}\n${piece}`;
        chunks.push({ content, chunkIndex: idx++, metadata: { sheetName, tableTitle: null } });
        if (pos + MAX_CHARS >= body.length) break;
        pos += MAX_CHARS - OVERLAP_CHARS;
      }
    }
  }
  return chunks;
}

// Map nomor butir global (1..53) → kode kriteria.butir LAM-TEK 2025.
// Jumlah butir per kriteria (total 53). Filter `kriteria` adalah jalur utama retrieval; butirCode sekunder.
const BUTIR_PER_KRITERIA = [3, 8, 13, 11, 2, 8, 8];
function globalButirToCode(n) {
  let remaining = n;
  for (let k = 0; k < BUTIR_PER_KRITERIA.length; k++) {
    if (remaining <= BUTIR_PER_KRITERIA[k]) { return { kriteria: k + 1, code: `${k + 1}.${remaining}` }; }
    remaining -= BUTIR_PER_KRITERIA[k];
  }
  return { kriteria: null, code: null };
}

function chunkPedoman(text) {
  // Butir pedoman diawali nomor 1..53 di awal baris.
  const butirRe = /^\s*(\d{1,2})\s+[A-Z][^\n]*/gim;
  const matches = [...text.matchAll(butirRe)].filter(m => {
    const n = parseInt(m[1]);
    return n >= 1 && n <= 53;
  });

  if (matches.length === 0) {
    return splitWithOverlap(text, { butirCode: null, kriteria: null, sectionTitle: null }, 0);
  }

  const chunks = [];
  let idx = 0;
  for (let i = 0; i < matches.length; i++) {
    const globalNum = parseInt(matches[i][1]);
    const { kriteria, code } = globalButirToCode(globalNum);
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    const sectionTitle = matches[i][0].trim().slice(0, 80);
    const parts = splitWithOverlap(body, { butirCode: code, kriteria, sectionTitle }, idx);
    idx += parts.length;
    chunks.push(...parts);
  }
  return chunks;
}

module.exports = { chunkLED, chunkLKPS, chunkPedoman, MAX_CHARS, OVERLAP_CHARS, _splitWithOverlap: splitWithOverlap };
