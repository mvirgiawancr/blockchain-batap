/**
 * Asesor Routes
 */

const express = require('express');
const router = express.Router();
const asesorController = require('../controllers/asesorController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Get assignments for current asesor
router.get('/assignments', authenticate, authorize('asesor', 'assessor', 'admin'), asesorController.getAssignments);

// Accept assignment
router.post('/assignments/:id/accept', authenticate, authorize('asesor', 'assessor', 'admin'), asesorController.acceptAssignment);

// Respond to offer
router.post('/respond-offer', authenticate, authorize('asesor', 'assessor', 'admin'), asesorController.respondToOffer);

// Submit assessment
router.post('/assignments/:id/submit', authenticate, authorize('asesor', 'assessor', 'admin'), asesorController.submitAssessment);

// Get assessment history
router.get('/history', authenticate, authorize('asesor', 'assessor', 'admin'), asesorController.getHistory);

module.exports = router;
