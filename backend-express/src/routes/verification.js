/**
 * Verification Routes
 * Phase 5: Verification & Decision
 */

const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticate: authenticateToken } = require('../middleware/authenticate');
const { authorize: authorizeRoles } = require('../middleware/authorize');

// Get pending verifications (KEA/Sekretariat)
router.get('/list/pending',
    authenticateToken,
    authorizeRoles(['kea', 'sekretariat', 'admin']),
    verificationController.getPendingVerifications
);

// Get pending decisions (Majelis)
router.get('/list/decisions',
    authenticateToken,
    authorizeRoles(['majelis', 'sekretariat', 'admin']),
    verificationController.getPendingDecisions
);

// Get already decided submissions (Majelis)
router.get('/list/decided',
    authenticateToken,
    authorizeRoles(['majelis', 'sekretariat', 'admin']),
    verificationController.getDecidedSubmissions
);

// Verify AL Result (KEA/Sekretariat)
router.post('/:submissionId/verify',
    authenticateToken,
    authorizeRoles(['kea', 'sekretariat', 'admin']),
    verificationController.verifyALResult
);

// Finalize Accreditation (Majelis)
router.post('/:submissionId/finalize',
    authenticateToken,
    authorizeRoles(['majelis', 'sekretariat', 'admin']),
    verificationController.finalizeAccreditation
);

module.exports = router;
