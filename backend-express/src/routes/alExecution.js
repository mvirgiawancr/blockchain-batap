/**
 * AL Execution Routes
 * Phase 4: Field Assessment (Asesmen Lapangan) and Responses
 */

const express = require('express');
const router = express.Router();
const alExecutionController = require('../controllers/alExecutionController');
const { authenticate: authenticateToken } = require('../middleware/authenticate');
const { authorize: authorizeRoles } = require('../middleware/authorize');

// Phase 4: Submit Berita Acara (Assessor only)
router.post(
    '/:submissionId/execution',
    authenticateToken,
    authorizeRoles(['asesor', 'assessor', 'admin']),
    alExecutionController.submitALExecution
);

// Phase 4: Submit UPPS Response (UPPS only)
router.post(
    '/:submissionId/response',
    authenticateToken,
    authorizeRoles(['upps', 'admin']),
    alExecutionController.submitUPPSResponse
);

// Get AL Details
router.get(
    '/:submissionId',
    authenticateToken,
    alExecutionController.getALDetails
);

module.exports = router;
