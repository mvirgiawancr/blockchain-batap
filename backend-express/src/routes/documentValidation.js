/**
 * Document Validation Routes
 *
 * Public (pre-auth, for registration flow):
 *   GET   /api/v1/document-validation/templates                  — list available templates
 *   POST  /api/v1/document-validation/templates/:templateCode    — validate single PDF
 *   POST  /api/v1/document-validation/upps-registration          — validate both UPPS docs
 *
 * Authenticated:
 *   GET   /api/v1/document-validation/history                    — current user's validation history
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/documentValidationController');
const { authenticate } = require('../middleware/authenticate');
const { asyncHandler } = require('../middleware/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1 MB (per SAKTI rule)
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Hanya PDF yang diizinkan.'));
    }
    cb(null, true);
  },
});

router.get('/templates', asyncHandler(ctrl.listTemplates));

router.post(
  '/templates/:templateCode',
  upload.single('file'),
  asyncHandler(ctrl.validate),
);

router.post(
  '/upps-registration',
  upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'surat_pernyataan', maxCount: 1 },
  ]),
  asyncHandler(ctrl.validateBoth),
);

router.get('/history', authenticate, asyncHandler(ctrl.history));

module.exports = router;
