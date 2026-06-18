/**
 * Release Routes
 * Phase 6: Certificate Release
 */

const express = require('express');
const router = express.Router();
const releaseController = require('../controllers/releaseController');
const { authenticate: authenticateToken } = require('../middleware/authenticate');
const { authorize: authorizeRoles } = require('../middleware/authorize');

// Get ready for release (Sekretariat)
router.get('/list/ready',
    authenticateToken,
    authorizeRoles(['sekretariat', 'admin']),
    releaseController.getReadyForRelease
);

// Preview Certificate
router.get('/:submissionId/preview-certificate',
    authenticateToken,
    authorizeRoles(['sekretariat', 'admin', 'majelis', 'upps']),
    releaseController.previewCertificate
);

// Publish Certificate
router.post('/:submissionId/publish',
    authenticateToken,
    authorizeRoles(['sekretariat', 'admin', 'majelis']),
    releaseController.publishCertificate
);

// Download Certificate (akses UPPS dari notifikasi, juga sekretariat/admin)
router.get('/:submissionId/certificate/download',
    authenticateToken,
    authorizeRoles(['upps', 'sekretariat', 'admin', 'majelis']),
    releaseController.downloadCertificate
);

module.exports = router;
