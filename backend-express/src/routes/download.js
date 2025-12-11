/**
 * Download Routes
 * Routes for downloading encrypted documents from IPFS
 */

const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

/**
 * @route   GET /api/v1/download/:submissionId/:documentType
 * @desc    Download and decrypt document from IPFS
 * @param   submissionId - Submission UUID
 * @param   documentType - LED or LKPS
 * @access  Private (RBAC protected)
 */
router.get(
  '/:submissionId/:documentType',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  downloadController.downloadDocument
);

/**
 * @route   GET /api/v1/download/:submissionId/:documentType/info
 * @desc    Get document information without downloading
 * @param   submissionId - Submission UUID
 * @param   documentType - LED or LKPS
 * @access  Private (RBAC protected)
 */
router.get(
  '/:submissionId/:documentType/info',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  downloadController.getDocumentInfo
);

module.exports = router;
