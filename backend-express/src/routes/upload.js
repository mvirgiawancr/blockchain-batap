/**
 * Upload Routes
 * Handles document upload endpoints
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadDocuments, handleUploadError, validateDocuments } = require('../middleware/fileUpload');
const { validateBody, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/upload
 * @desc    Upload LED and/or LKPS documents
 * @access  Private (UPPS/Admin)
 * @body    {
 *            programStudi: string (required),
 *            institusi: string (required),
 *            programType: 'S'|'M'|'D'|'D1'|'D2'|'D3'|'STr'|'MTr'|'DTr'|'PPI' (default: 'S'),
 *            submittedBy: string (optional),
 *            notes: string (optional)
 *          }
 * @files   led_file: PDF file (optional)
 *          lkps_file: Excel/CSV file (optional)
 */
router.post(
  '/',
  authenticate,
  authorize('upps', 'admin'),
  uploadDocuments,
  handleUploadError,
  validateDocuments,
  validateBody(schemas.uploadSubmission),
  asyncHandler(uploadController.uploadDocuments)
);

/**
 * @route   GET /api/v1/upload/:id
 * @desc    Get submission status by ID
 * @access  Private (all roles)
 */
router.get(
  '/:id',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  asyncHandler(uploadController.getSubmissionStatus)
);

module.exports = router;
