/**
 * KEA (Ketua Evaluasi Akreditasi) Routes
 */

const express = require('express');
const router = express.Router();
const keaController = require('../controllers/keaController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Get approved submissions
router.get('/submissions-approved', authenticate, authorize(['kea', 'admin']), keaController.getApprovedSubmissions);

// Get available assessors
router.get('/assessors', authenticate, authorize(['kea', 'admin']), keaController.getAssessors);

// Assign assessors to submission
router.post('/assign/:submissionId', authenticate, authorize(['kea', 'admin']), keaController.assignAssessors);

// Get monitoring data
router.get('/monitoring', authenticate, authorize(['kea', 'admin']), keaController.getMonitoring);

// Get consistency analysis
router.get('/consistency', authenticate, authorize(['kea', 'admin']), keaController.getConsistencyAnalysis);

// Get consistency detail for specific submission
router.get('/consistency/:submissionId/detail', authenticate, authorize(['kea', 'admin']), keaController.getConsistencyDetail);

// Set consistency check result
router.post('/consistency/:submissionId', authenticate, authorize(['kea', 'admin']), keaController.setConsistency);

module.exports = router;
