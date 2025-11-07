/**
 * Upload Routes
 * Handles document upload endpoints
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadDocuments, handleUploadError, validateDocuments } = require('../middleware/fileUpload');
const { validateBody, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/upload
 * @desc    Upload LED and/or LKPS documents
 * @access  Public
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
  uploadDocuments,
  handleUploadError,
  validateDocuments,
  validateBody(schemas.uploadSubmission),
  asyncHandler(uploadController.uploadDocuments)
);

/**
 * @route   GET /api/v1/upload/:id
 * @desc    Get submission status by ID
 * @access  Public
 */
router.get(
  '/:id',
  asyncHandler(uploadController.getSubmissionStatus)
);

module.exports = router;
