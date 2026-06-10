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

module.exports = { chunkLED, MAX_CHARS, OVERLAP_CHARS, _splitWithOverlap: splitWithOverlap };
