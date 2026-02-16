/**
 * Submission Routes
 * Handles submission CRUD operations
 */

const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { validateParams, validateBody, validateQuery, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/submissions
 * @desc    Get all submissions with optional filtering
 * @access  Private (all roles)
 * @query   programStudi (optional), institusi (optional), programType (optional),
 *          status (optional), limit (default: 20), offset (default: 0)
 */
router.get(
  '/',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  validateQuery(schemas.querySubmissions),
  asyncHandler(submissionController.getAllSubmissions)
);

/**
 * @route   GET /api/v1/submissions/stats
 * @desc    Get submission statistics
 * @access  Private (all roles)
 */
router.get(
  '/stats',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  asyncHandler(submissionController.getSubmissionStats)
);

/**
 * @route   GET /api/v1/submissions/program-studi/:programStudi
 * @desc    Get submissions by program studi
 * @access  Private (all roles)
 */
router.get(
  '/program-studi/:programStudi',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  asyncHandler(submissionController.getSubmissionsByProgramStudi)
);

/**
 * @route   POST /api/v1/submissions/:id/assign
 * @desc    Assign assessor to a submission
 * @access  Private (Sekretariat/Admin)
 * @body    { assessorUserId: UUID, notes?: string }
 */
router.post(
  '/:id/assign',
  authenticate,
  authorize('sekretariat', 'kea', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.assignAssessor)
);

/**
 * @route   GET /api/v1/submissions/:id/assign
 * @desc    Get current assignment
 * @access  Private (all roles)
 */
router.get(
  '/:id/assign',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.getAssignment)
);

/**
 * @route   DELETE /api/v1/submissions/:id/assign
 * @desc    Clear assignment
 * @access  Private (Sekretariat/Admin)
 */
router.delete(
  '/:id/assign',
  authenticate,
  authorize('sekretariat', 'kea', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.clearAssignment)
);

/**
 * @route   POST /api/v1/submissions/:id/assign/accept
 * @desc    Assessor accepts assignment
 * @access  Private (Assessor/Admin)
 */
router.post(
  '/:id/assign/accept',
  authenticate,
  authorize('assessor', 'asesor', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.acceptAssignment)
);

/**
 * @route   POST /api/v1/submissions/:id/assign/reject
 * @desc    Assessor rejects assignment
 * @access  Private (Assessor/Admin)
 */
router.post(
  '/:id/assign/reject',
  authenticate,
  authorize('assessor', 'asesor', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.rejectAssignment)
);

/**
 * @route   GET /api/v1/submissions/:id/history
 * @desc    Get submission transaction history (traceability)
 * @access  Private (all roles)
 */
router.get(
  '/:id/history',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.getSubmissionHistory)
);

/**
 * @route   GET /api/v1/submissions/:id
 * @desc    Get submission by ID
 * @access  Private (all roles)
 */
router.get(
  '/:id',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'asesor', 'kea', 'admin', 'majelis'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.getSubmissionById)
);

/**
 * @route   PUT /api/v1/submissions/:id
 * @desc    Update submission
 * @access  Private (Sekretariat/Admin)
 * @body    Any submission fields to update
 */
router.put(
  '/:id',
  authenticate,
  authorize('sekretariat', 'admin'),
  validateParams(schemas.submissionId),
  validateBody(schemas.updateSubmission),
  asyncHandler(submissionController.updateSubmission)
);

/**
 * @route   DELETE /api/v1/submissions/:id
 * @desc    Delete submission
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.deleteSubmission)
);

/**
 * @route   POST /api/v1/submissions/:id/decision
 * @desc    Set decision (approve/reject) for a submission
 * @access  Private (Sekretariat/Admin)
 * @body    { decision: 'approved'|'rejected', notes: string, decidedBy: string }
 */
router.post(
  '/:id/decision',
  authenticate,
  authorize('sekretariat', 'kea', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.setDecision)
);

/**
 * @route   POST /api/v1/submissions/:id/upps-response
 * @desc    UPPS responds to assessor offer
 * @access  Private (UPPS/Admin)
 */
router.post(
  '/:id/upps-response',
  authenticate,
  authorize('upps', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(submissionController.respondToAssessorOffer)
);

module.exports = router;
