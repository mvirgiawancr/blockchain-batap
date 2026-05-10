/**
 * Traceability Routes
 * Public endpoints for certificate search and blockchain traceability
 */

const express = require('express');
const router = express.Router();
const traceabilityController = require('../controllers/traceabilityController');
const { authenticate } = require('../middleware/authenticate');

// PUBLIC endpoints (no auth)
router.get('/search', traceabilityController.searchAccreditation);
router.get('/history/:submissionId', traceabilityController.getBlockchainHistory);

// AUTHENTICATED endpoint (needs login)
router.get('/detail/:submissionId', authenticate, traceabilityController.getAccreditationDetail);

module.exports = router;
