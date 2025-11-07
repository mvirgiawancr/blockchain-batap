/**
 * Submission Routes
 * Handles submission CRUD operations
 */

const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { validateParams, validateBody, validateQuery, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/submissions
 * @desc    Get all submissions with optional filtering
 * @access  Public
 * @query   programStudi (optional), institusi (optional), programType (optional),
 *          status (optional), limit (default: 20), offset (default: 0)
 */
router.get(
  '/',
  validateQuery(schemas.querySubmissions),
  asyncHandler(submissionController.getAllSubmissions)
);

/**
 * @route   GET /api/v1/submissions/stats
 * @desc    Get submission statistics
 * @access  Public
 */
router.get(
  '/stats',
  asyncHandler(submissionController.getSubmissionStats)
);

/**
 * @route   GET /api/v1/submissions/program-studi/:programStudi
 * @desc    Get submissions by program studi
 * @access  Public
 */
router.get(
  '/program-studi/:programStudi',
  asyncHandler(submissionController.getSubmissionsByProgramStudi)
);

/**
 * @route   GET /api/v1/submissions/:id
 * @desc    Get submission by ID
 * @access  Public
 */
router.get(
  '/:id',
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.getSubmissionById)
);

/**
 * @route   PUT /api/v1/submissions/:id
 * @desc    Update submission
 * @access  Public
 * @body    Any submission fields to update
 */
router.put(
  '/:id',
  validateParams(schemas.submissionId),
  validateBody(schemas.updateSubmission),
  asyncHandler(submissionController.updateSubmission)
);

/**
 * @route   DELETE /api/v1/submissions/:id
 * @desc    Delete submission
 * @access  Public
 */
router.delete(
  '/:id',
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.deleteSubmission)
);

/**
 * @route   POST /api/v1/submissions/:id/decision
 * @desc    Set decision (approve/reject) for a submission
 * @access  Public
 * @body    { decision: 'approved'|'rejected', notes: string, decidedBy: string }
 */
router.post(
  '/:id/decision',
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.setDecision)
);

module.exports = router;
