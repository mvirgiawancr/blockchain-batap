/**
 * Document Validation Controller
 *
 * REST endpoints for validating uploaded PDF documents against LAM Teknik
 * templates via embedding similarity.
 */
const documentValidationService = require('../services/documentValidationService');
const { pool } = require('../config/database');

exports.listTemplates = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT template_code, name, description, min_similarity_threshold,
            max_file_size_kb, allowed_mime_types, is_active, updated_at
     FROM document_templates
     WHERE is_active = TRUE
     ORDER BY template_code`,
  );
  res.json({ templates: rows });
};

exports.validate = async (req, res) => {
  const { templateCode } = req.params;
  if (!req.file) {
    return res.status(400).json({
      error: 'File PDF wajib diunggah (field name: "file").',
    });
  }

  const result = await documentValidationService.validateDocument({
    fileBuffer: req.file.buffer,
    fileName: req.file.originalname,
    templateCode,
    userId: req.user ? req.user.id : null,
    context: req.body.context || 'document_validation',
  });

  res.json({
    template_code: templateCode,
    file_name: req.file.originalname,
    is_valid: result.isValid,
    similarity: result.similarity,
    threshold: result.threshold,
    extracted_text_length: result.extractedTextLength,
    errors: result.errors,
  });
};

exports.validateBoth = async (req, res) => {
  const suratPermohonan = req.files?.surat_permohonan?.[0];
  const suratPernyataan = req.files?.surat_pernyataan?.[0];

  if (!suratPermohonan || !suratPernyataan) {
    return res.status(400).json({
      error:
        "Dua file wajib diunggah: 'surat_permohonan' dan 'surat_pernyataan'.",
    });
  }

  const { allValid, results } = await documentValidationService.validateAll(
    [
      {
        fileBuffer: suratPermohonan.buffer,
        fileName: suratPermohonan.originalname,
        templateCode: 'surat_permohonan_akun',
      },
      {
        fileBuffer: suratPernyataan.buffer,
        fileName: suratPernyataan.originalname,
        templateCode: 'surat_pernyataan_upps',
      },
    ],
    {
      userId: req.user ? req.user.id : null,
      context: req.body.context || 'upps_registration',
    },
  );

  res.json({
    all_valid: allValid,
    results,
  });
};

exports.history = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const { rows } = await pool.query(
    `SELECT id, template_code, file_name, file_size_bytes, similarity_score,
            threshold, is_valid, validation_errors, context, created_at
     FROM document_validations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [req.user.id, limit],
  );
  res.json({ history: rows });
};
