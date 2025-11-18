/**
 * Download Routes
 * Routes for downloading encrypted documents from IPFS
 */

const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

/**
 * @route   GET /api/v1/download/:submissionId/:documentType
 * @desc    Download and decrypt document from IPFS
 * @param   submissionId - Submission UUID
 * @param   documentType - LED or LKPS
 * @access  Public (should add auth in production)
 */
router.get('/:submissionId/:documentType', downloadController.downloadDocument);

/**
 * @route   GET /api/v1/download/:submissionId/:documentType/info
 * @desc    Get document information without downloading
 * @param   submissionId - Submission UUID
 * @param   documentType - LED or LKPS
 * @access  Public
 */
router.get('/:submissionId/:documentType/info', downloadController.getDocumentInfo);

module.exports = router;
