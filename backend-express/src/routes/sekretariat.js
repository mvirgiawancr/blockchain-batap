/**
 * Sekretariat Routes
 */

const express = require('express');
const router = express.Router();
const sekretariatController = require('../controllers/sekretariatController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Get all submissions for verification
router.get('/submissions', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getSubmissions);

// Verify submission
router.post('/verify/:submissionId', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.verifySubmission);

// Get all UPPS
router.get('/upps', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getUPPS);

// Get all payments
router.get('/payments', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getPayments);

// Verify payment
router.post('/payments/:id/verify', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.verifyPayment);

// Get reports/statistics
router.get('/reports', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getReports);

// Download report
router.get('/reports/download', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.downloadReport);

module.exports = router;
