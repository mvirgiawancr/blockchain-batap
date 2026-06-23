/**
 * RAG service: index + hybrid retrieval di atas pgvector.
 * SEMUA kegagalan non-fatal — caller jatuh ke jalur lama.
 */
const chunking = require('./chunkingService');
const config = require('../config');

function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

class RagService {
  constructor(opts = {}) {
    this.db = opts.db || require('../config/database');
    this.embedding = opts.embedding || require('./embeddingServiceSingleton');
    // FULL_RAG=false → mode lightweight: isAvailable() selalu false & indexing dilewati,
    // sehingga seluruh sistem otomatis memakai jalur kata kunci versi sebelumnya.
    this.enabled = opts.enabled != null ? opts.enabled : config.rag.enabled;
    this.embeddingEnabled = opts.embeddingEnabled != null ? opts.embeddingEnabled : config.rag.embeddingEnabled;
  }

  _chunk(docType, content) {
    if (docType === 'LED') return chunking.chunkLED(content);
    if (docType === 'LKPS') return chunking.chunkLKPS(content);
    if (docType === 'PEDOMAN') return chunking.chunkPedoman(content);
    throw new Error(`Unknown docType: ${docType}`);
  }

  async isAvailable() {
    if (!this.enabled) return false; // FULL_RAG=false → paksa jalur lightweight
    if (this.embeddingEnabled && !this.embedding.isConfigured()) return false;
    try {
      await this.db.query('SELECT 1 FROM document_chunks LIMIT 1');
      return true;
    } catch (err) {
      console.warn('[RAG] isAvailable false:', err.message);
      return false;
    }
  }

  async indexDocument({ submissionId, docType, content }) {
    try {
      if (!this.enabled) {
        console.log('[RAG] FULL_RAG=false → mode lightweight, lewati indexing');
        return;
      }
      if (this.embeddingEnabled && !this.embedding.isConfigured()) {
        console.warn('[RAG] Embedding tidak terkonfigurasi — skip indexing');
        return;
      }
      if (!content || !content.trim()) return;

      const chunks = this._chunk(docType, content);
      if (!chunks.length) return;

      let vectors = null;
      if (this.embeddingEnabled) {
        vectors = await this.embedding.embedDocuments(chunks.map(c => c.content));
      }

      await this.db.query(
        'DELETE FROM document_chunks WHERE doc_type = $1 AND submission_id IS NOT DISTINCT FROM $2',
        [docType, submissionId || null]
      );

      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const embeddingVal = vectors ? toVectorLiteral(vectors[i]) : null;
        await this.db.query(
          `INSERT INTO document_chunks (submission_id, doc_type, chunk_index, content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [submissionId || null, docType, c.chunkIndex, c.content, JSON.stringify(c.metadata), embeddingVal]
        );
      }
      console.log(`[RAG] Indexed ${chunks.length} chunks (${docType}, submission=${submissionId || 'global'})${this.embeddingEnabled ? ' with embeddings' : ' (no embedding)'}`);
    } catch (err) {
      console.warn(`[RAG] indexDocument gagal (non-fatal): ${err.message}`);
    }
  }

  // Reciprocal Rank Fusion
  _rrf(lists, k = 60) {
    const scores = new Map();
    const byId = new Map();
    for (const list of lists) {
      list.forEach((row, i) => {
        byId.set(row.id, row);
        scores.set(row.id, (scores.get(row.id) || 0) + 1 / (k + i + 1));
      });
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => byId.get(id));
  }

  async search({ query, submissionId = null, docType, kriteria = null, sheetNames = null, topK = 6 }) {
    let semRows = [];
    
    if (this.embeddingEnabled) {
      try {
        const qVec = toVectorLiteral(await this.embedding.embedQuery(query));

        // Semantic query params: $1=qVec, lalu filter, terakhir LIMIT
        const semFilters = ['doc_type = $2'];
        const semParams = [qVec, docType];
        let p = 3;
        if (submissionId !== null) { semFilters.push(`submission_id = $${p++}`); semParams.push(submissionId); }
        if (kriteria !== null)     { semFilters.push(`(metadata->>'kriteria')::int = $${p++}`); semParams.push(kriteria); }
        if (sheetNames)            { semFilters.push(`metadata->>'sheetName' = ANY($${p++})`); semParams.push(sheetNames); }
        const semLimitIdx = p;
        semParams.push(topK * 2);
        const semSql = `SELECT id, content, metadata FROM document_chunks
                        WHERE ${semFilters.join(' AND ')} ORDER BY embedding <=> $1 LIMIT $${semLimitIdx}`;
        const semRes = await this.db.query(semSql, semParams);
        semRows = semRes.rows;
      } catch (err) {
        console.warn('[RAG] Semantic search gagal, lanjut ke FTS:', err.message);
      }
    }

    // FTS query params: $1=docType, filter, $N=query text, $N+1=limit
    let ftsRows = [];
    try {
      const ftsFilters = ['doc_type = $1'];
      const ftsParams = [docType];
      let fp = 2;
      if (submissionId !== null) { ftsFilters.push(`submission_id = $${fp++}`); ftsParams.push(submissionId); }
      if (kriteria !== null)     { ftsFilters.push(`(metadata->>'kriteria')::int = $${fp++}`); ftsParams.push(kriteria); }
      if (sheetNames)            { ftsFilters.push(`metadata->>'sheetName' = ANY($${fp++})`); ftsParams.push(sheetNames); }
      const qIdx = fp++;
      const limIdx = fp;
      ftsParams.push(query, topK * 2);
      const ftsSql = `SELECT id, content, metadata FROM document_chunks
                      WHERE ${ftsFilters.join(' AND ')} AND content_tsv @@ plainto_tsquery('simple', $${qIdx})
                      ORDER BY ts_rank(content_tsv, plainto_tsquery('simple', $${qIdx})) DESC
                      LIMIT $${limIdx}`;
      ftsRows = (await this.db.query(ftsSql, ftsParams)).rows;
    } catch (err) {
      console.warn('[RAG] FTS gagal:', err.message);
    }

    if (this.embeddingEnabled) {
      return this._rrf([semRows, ftsRows]).slice(0, topK);
    } else {
      return ftsRows.slice(0, topK);
    }
  }

  async getLKPSSheets(submissionId, sheetNames) {
    const res = await this.db.query(
      `SELECT id, content, metadata, chunk_index FROM document_chunks
       WHERE doc_type = 'LKPS' AND submission_id = $1 AND metadata->>'sheetName' = ANY($2)
       ORDER BY chunk_index`,
      [submissionId, sheetNames]
    );
    return res.rows;
  }

  async getPedomanContext({ kriteria = null, butirCode = null, query = null, topK = 3 }) {
    if (butirCode) {
      const res = await this.db.query(
        `SELECT id, content, metadata FROM document_chunks
         WHERE doc_type = 'PEDOMAN' AND metadata->>'butirCode' = $1 ORDER BY chunk_index LIMIT $2`,
        [butirCode, topK]
      );
      if (res.rows.length) return res.rows;
    }
    if (query) {
      return this.search({ query, submissionId: null, docType: 'PEDOMAN', kriteria, topK });
    }
    if (kriteria !== null) {
      const res = await this.db.query(
        `SELECT id, content, metadata FROM document_chunks
         WHERE doc_type = 'PEDOMAN' AND (metadata->>'kriteria')::int = $1 ORDER BY chunk_index LIMIT $2`,
        [kriteria, topK]
      );
      return res.rows;
    }
    return [];
  }
}

module.exports = RagService;
module.exports.toVectorLiteral = toVectorLiteral;
