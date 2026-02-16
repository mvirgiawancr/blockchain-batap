/**
 * AL Schedule Routes
 * Routes for AL (Asesmen Lapangan) scheduling - Phase 3B
 */

const express = require('express');
const router = express.Router();
const alScheduleController = require('../controllers/alScheduleController');
const { authenticate: authenticateToken } = require('../middleware/authenticate');
const { authorize: authorizeRoles } = require('../middleware/authorize');

// IMPORTANT: Static routes must come BEFORE parameterized routes

// Get all pending schedules (for both KEA and Sekretariat Admin)
router.get('/list/pending',
  authenticateToken,
  authorizeRoles(['kea', 'sekretariat', 'admin']),
  alScheduleController.getPendingSchedules
);

// Get all approved schedules
router.get('/list/approved',
  authenticateToken,
  authorizeRoles(['kea', 'sekretariat', 'asesor', 'upps', 'admin']),
  alScheduleController.getApprovedSchedules
);

// Get submissions ready for AL (both flows synchronized)
router.get('/list/ready-for-al',
  authenticateToken,
  authorizeRoles(['kea', 'sekretariat', 'asesor', 'admin']),
  alScheduleController.getReadyForAL
);

// Step 18: KEA proposes AL schedule
router.post('/propose/:submissionId', 
  authenticateToken, 
  authorizeRoles(['kea', 'sekretariat', 'admin']),
  alScheduleController.proposeSchedule
);

// Step 19-20: Sekretariat Admin approves/rejects AL schedule
router.post('/approve/:submissionId',
  authenticateToken,
  authorizeRoles(['sekretariat', 'admin']),
  alScheduleController.approveSchedule
);

// Generate Surat Tugas
router.post('/generate-letter/:submissionId',
  authenticateToken,
  authorizeRoles(['sekretariat', 'admin']),
  alScheduleController.generateAssignmentLetter
);

// Step 21: Check sync status
router.post('/check-sync/:submissionId',
  authenticateToken,
  authorizeRoles(['kea', 'sekretariat', 'admin']),
  alScheduleController.checkSyncStatus
);

// Get specific schedule (must be last because of :submissionId param)
router.get('/:submissionId',
  authenticateToken,
  alScheduleController.getSchedule
);

module.exports = router;
