/**
 * Scoring Routes
 * Handles LAM-TEK 2025 scoring endpoints
 */

const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/scoringController');
const { validateBody, validateParams, validateQuery, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/scoring/calculate
 * @desc    Calculate or recalculate LAM-TEK scores for a submission
 * @access  Public
 * @body    {
 *            submissionId: string (UUID, required),
 *            programType: 'S'|'M'|'D'|... (optional, defaults to submission's type)
 *          }
 */
router.post(
  '/calculate',
  validateBody(schemas.scoringRequest),
  asyncHandler(scoringController.calculateScores)
);

/**
 * @route   POST /api/v1/scoring/custom
 * @desc    Calculate scores with custom manual data
 * @access  Public
 * @body    {
 *            ledData: object (optional),
 *            lkpsData: object (required),
 *            programType: 'S'|'M'|'D'|... (default: 'S')
 *          }
 */
router.post(
  '/custom',
  asyncHandler(scoringController.calculateCustomScores)
);

/**
 * @route   GET /api/v1/scoring/:id
 * @desc    Get scoring details for a submission
 * @access  Public
 */
router.get(
  '/:id',
  validateParams(schemas.submissionId),
  asyncHandler(scoringController.getScoringDetails)
);

/**
 * @route   GET /api/v1/scoring/info
 * @desc    Get scoring formulas, thresholds, and criteria info
 * @access  Public
 * @query   programType (optional)
 */
router.get(
  '/',
  asyncHandler(scoringController.getScoringInfo)
);

module.exports = router;
