/**
 * Document Validation Service
 *
 * Validates uploaded PDF documents against LAM Teknik templates (Surat Pengajuan
 * Permohonan Akun, Surat Pernyataan UPPS) using local E5 embedding + cosine
 * similarity. Templates are extracted once from .docx, embedded, and cached in
 * the document_templates table.
 *
 * Flow:
 *   1. loadTemplate(templateCode) — read from DB; if embedding NULL, extract +
 *      embed from file_path; persist back.
 *   2. validateDocument(pdfBuffer, templateCode, ctx) — extract text from PDF,
 *      embed, compute cosine similarity, return verdict + log row.
 */
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { pool } = require('../config/database');
const embeddingService = require('./embeddingServiceSingleton');

const TEMPLATE_BASE_DIR = path.resolve(__dirname, '../..');
const DEFAULT_THRESHOLD = 0.75;
const MAX_FILE_SIZE_KB = 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class DocumentValidationService {
  /**
   * Load template row from DB. If extracted_text or embedding is missing,
   * read the source file, extract text, embed, and persist.
   */
  async loadTemplate(templateCode) {
    const { rows } = await pool.query(
      `SELECT id, template_code, name, file_path, file_hash, extracted_text,
              embedding, min_similarity_threshold, max_file_size_kb,
              allowed_mime_types, is_active
       FROM document_templates
       WHERE template_code = $1 AND is_active = TRUE`,
      [templateCode],
    );
    if (rows.length === 0) {
      throw new Error(`Template not found: ${templateCode}`);
    }
    const tpl = rows[0];

    // pgvector returns the embedding column as a string "[0.1,0.2,...]" — parse
    // back to a number[] so cosineSimilarity can index it numerically.
    if (typeof tpl.embedding === 'string' && tpl.embedding) {
      try {
        tpl.embedding = JSON.parse(tpl.embedding);
      } catch {
        tpl.embedding = null;
      }
    }

    const needsRebuild =
      !tpl.extracted_text ||
      !tpl.embedding ||
      (await this._templateFileChanged(tpl));

    if (needsRebuild) {
      const absolutePath = path.isAbsolute(tpl.file_path)
        ? tpl.file_path
        : path.join(TEMPLATE_BASE_DIR, tpl.file_path);
      const fileBuffer = await fs.readFile(absolutePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const extractedText = await this._extractTextFromFile(fileBuffer, absolutePath);

      const emb = await embeddingService.embedDocuments([extractedText.trim()]);
      const vector = emb[0];

      await pool.query(
        `UPDATE document_templates
         SET extracted_text = $1,
             embedding = $2,
             file_hash = $3
         WHERE id = $4`,
        [extractedText, JSON.stringify(vector), fileHash, tpl.id],
      );

      tpl.extracted_text = extractedText;
      tpl.embedding = vector;
      tpl.file_hash = fileHash;
    }

    return tpl;
  }

  async _templateFileChanged(tpl) {
    try {
      const absolutePath = path.isAbsolute(tpl.file_path)
        ? tpl.file_path
        : path.join(TEMPLATE_BASE_DIR, tpl.file_path);
      const stat = await fs.stat(absolutePath);
      const fileBuffer = await fs.readFile(absolutePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return tpl.file_hash !== fileHash;
    } catch {
      return false;
    }
  }

  async _extractTextFromFile(buffer, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    }
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').trim();
    }
    if (ext === '.txt') {
      return buffer.toString('utf8').trim();
    }
    throw new Error(`Unsupported template file type: ${ext}`);
  }

  /**
   * Validate uploaded PDF buffer against a template.
   * @param {Object} params
   * @param {Buffer} params.fileBuffer - Uploaded PDF bytes
   * @param {string} params.fileName - Original filename (for logging)
   * @param {string} params.templateCode - e.g. 'surat_permohonan_akun'
   * @param {string} [params.userId] - Optional user UUID
   * @param {string} [params.context] - e.g. 'upps_registration'
   * @returns {Promise<{isValid: boolean, similarity: number, threshold: number, templateCode: string, errors: string[]}>}
   */
  async validateDocument({ fileBuffer, fileName, templateCode, userId = null, context = null }) {
    const errors = [];

    if (!fileBuffer || fileBuffer.length === 0) {
      errors.push('File kosong.');
    }
    const tpl = await this.loadTemplate(templateCode);

    const maxBytes = (tpl.max_file_size_kb || MAX_FILE_SIZE_KB) * 1024;
    if (fileBuffer && fileBuffer.length > maxBytes) {
      errors.push(`Ukuran file melebihi ${tpl.max_file_size_kb} KB.`);
    }

    let extractedText = '';
    let fileHash = null;
    if (fileBuffer && fileBuffer.length > 0) {
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      try {
        const data = await pdfParse(fileBuffer);
        extractedText = (data.text || '').trim();
      } catch (err) {
        errors.push(`Gagal mengekstrak teks PDF: ${err.message}`);
      }
    }

    if (!extractedText && errors.length === 0) {
      errors.push('Tidak ada teks yang bisa diekstrak dari PDF.');
    }

    let embedding = null;
    let similarity = 0;
    const threshold = Number(tpl.min_similarity_threshold || DEFAULT_THRESHOLD);

    if (extractedText) {
      const emb = await embeddingService.embedDocuments([extractedText]);
      embedding = emb[0];
      similarity = cosineSimilarity(embedding, tpl.embedding);
    }

    const isValid = errors.length === 0 && similarity >= threshold;

    await pool.query(
      `INSERT INTO document_validations
        (user_id, template_id, template_code, file_name, file_hash,
         file_size_bytes, mime_type, extracted_text, extracted_text_length,
         embedding, similarity_score, threshold, is_valid, validation_errors,
         context, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        userId,
        tpl.id,
        templateCode,
        fileName,
        fileHash,
        fileBuffer ? fileBuffer.length : 0,
        fileBuffer ? 'application/pdf' : null,
        extractedText || null,
        extractedText.length,
        embedding ? JSON.stringify(embedding) : null,
        similarity,
        threshold,
        isValid,
        errors.length > 0 ? JSON.stringify(errors) : null,
        context,
        JSON.stringify({ source: 'lam-teknik-sakti', fileName }),
      ],
    );

    return {
      isValid,
      similarity: Number(similarity.toFixed(4)),
      threshold,
      templateCode,
      templateName: tpl.name,
      extractedTextLength: extractedText.length,
      errors,
    };
  }

  /**
   * Validate multiple required documents in one call.
   * @param {Array<{fileBuffer: Buffer, fileName: string, templateCode: string}>} docs
   * @param {Object} opts — { userId, context }
   */
  async validateAll(documents, opts = {}) {
    const results = [];
    for (const doc of documents) {
      const result = await this.validateDocument({
        fileBuffer: doc.fileBuffer,
        fileName: doc.fileName,
        templateCode: doc.templateCode,
        userId: opts.userId,
        context: opts.context,
      });
      results.push(result);
    }
    const allValid = results.every((r) => r.isValid);
    return { allValid, results };
  }
}

module.exports = new DocumentValidationService();
module.exports.DocumentValidationService = DocumentValidationService;
module.exports._cosineSimilarity = cosineSimilarity;
