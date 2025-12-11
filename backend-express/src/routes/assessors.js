/**
 * Assessor Routes
 */

const express = require('express');
const router = express.Router();
const assessorController = require('../controllers/assessorController');
const { authenticate } = require('../middleware/authenticate');

// Get all assessors
router.get('/', authenticate, assessorController.getAllAssessors);

// Get assessor by ID
router.get('/:id', authenticate, assessorController.getAssessorById);

module.exports = router;
