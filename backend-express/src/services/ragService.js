/**
 * RAG service: index + hybrid retrieval di atas pgvector.
 * SEMUA kegagalan non-fatal — caller jatuh ke jalur lama.
 */
const chunking = require('./chunkingService');

function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

class RagService {
  constructor(opts = {}) {
    this.db = opts.db || require('../config/database');
    this.embedding = opts.embedding || require('./embeddingServiceSingleton');
  }

  _chunk(docType, content) {
    if (docType === 'LED') return chunking.chunkLED(content);
    if (docType === 'LKPS') return chunking.chunkLKPS(content);
    if (docType === 'PEDOMAN') return chunking.chunkPedoman(content);
    throw new Error(`Unknown docType: ${docType}`);
  }

  async isAvailable() {
    if (!this.embedding.isConfigured()) return false;
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
      if (!this.embedding.isConfigured()) {
        console.warn('[RAG] Embedding tidak terkonfigurasi — skip indexing');
        return;
      }
      if (!content || !content.trim()) return;

      const chunks = this._chunk(docType, content);
      if (!chunks.length) return;

      const vectors = await this.embedding.embedDocuments(chunks.map(c => c.content));

      await this.db.query(
        'DELETE FROM document_chunks WHERE doc_type = $1 AND submission_id IS NOT DISTINCT FROM $2',
        [docType, submissionId || null]
      );

      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await this.db.query(
          `INSERT INTO document_chunks (submission_id, doc_type, chunk_index, content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [submissionId || null, docType, c.chunkIndex, c.content, JSON.stringify(c.metadata), toVectorLiteral(vectors[i])]
        );
      }
      console.log(`[RAG] Indexed ${chunks.length} chunks (${docType}, submission=${submissionId || 'global'})`);
    } catch (err) {
      console.warn(`[RAG] indexDocument gagal (non-fatal): ${err.message}`);
    }
  }
}

module.exports = RagService;
module.exports.toVectorLiteral = toVectorLiteral;
