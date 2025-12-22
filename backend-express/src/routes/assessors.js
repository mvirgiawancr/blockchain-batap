/**
 * Assessor Routes
 */

const express = require('express');
const router = express.Router();
const assessorController = require('../controllers/assessorController');
const { authenticate } = require('../middleware/authenticate');

// Get all assessors
router.get('/', authenticate, assessorController.getAllAssessors);

// Sync research data from Semantic Scholar for all assessors
router.post('/sync-scholar', authenticate, assessorController.syncScholarData);

// Sync research data from Google Scholar for all assessors (scraping)
router.post('/sync-google-scholar', authenticate, assessorController.syncGoogleScholar);

// Populate research areas manually (for demo)
router.post('/populate-research-areas', authenticate, assessorController.populateResearchAreas);

// Get assessor by ID
router.get('/:id', authenticate, assessorController.getAssessorById);

// Sync research data for single assessor
router.post('/:id/sync-scholar', authenticate, assessorController.syncSingleAssessor);

module.exports = router;
