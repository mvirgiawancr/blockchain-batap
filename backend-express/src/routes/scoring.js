/**
 * Scoring Routes
 * Handles LAM-TEK 2025 scoring endpoints
 */

const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/scoringController');
const { validateBody, validateParams, validateQuery, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/scoring/calculate
 * @desc    Calculate or recalculate LAM-TEK scores for a submission
 * @access  Private (Assessor/Sekretariat/Admin)
 * @body    {
 *            submissionId: string (UUID, required),
 *            programType: 'S'|'M'|'D'|... (optional, defaults to submission's type)
 *          }
 */
router.post(
  '/calculate',
  authenticate,
  authorize('assessor', 'sekretariat', 'admin'),
  validateBody(schemas.scoringRequest),
  asyncHandler(scoringController.calculateScores)
);

/**
 * @route   POST /api/v1/scoring/custom
 * @desc    Calculate scores with custom manual data
 * @access  Private (Assessor/Sekretariat/Admin)
 * @body    {
 *            ledData: object (optional),
 *            lkpsData: object (required),
 *            programType: 'S'|'M'|'D'|... (default: 'S')
 *          }
 */
router.post(
  '/custom',
  authenticate,
  authorize('assessor', 'sekretariat', 'admin'),
  asyncHandler(scoringController.calculateCustomScores)
);

/**
 * @route   GET /api/v1/scoring/:id
 * @desc    Get scoring details for a submission
 * @access  Private (all roles)
 */
router.get(
  '/:id',
  authenticate,
  authorize('upps', 'assessor', 'sekretariat', 'admin'),
  validateParams(schemas.submissionId),
  asyncHandler(scoringController.getScoringDetails)
);

/**
 * @route   GET /api/v1/scoring
 * @desc    Get scoring formulas, thresholds, and criteria info
 * @access  Public
 * @query   programType (optional)
 */
router.get(
  '/',
  asyncHandler(scoringController.getScoringInfo)
);

/**
 * @route   POST /api/v1/scoring/manual
 * @desc    Manual scoring by assessor/sekretariat/admin
 * @access  Private
 */
router.post(
  '/manual',
  authenticate,
  authorize('assessor', 'sekretariat', 'admin'),
  asyncHandler(scoringController.manualScoring)
);

module.exports = router;
