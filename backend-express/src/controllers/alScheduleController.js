/**
 * AL Schedule Controller
 * Handles AL (Asesmen Lapangan) scheduling operations - Phase 3B
 */

const logger = require('../utils/logger');
const fabricService = require('../services/fabricService');
const notificationController = require('./notificationController');
const certificateService = require('../services/certificateService');
const { pool } = require('../config/database');

/**
 * Step 18: KEA proposes AL schedule
 * POST /api/v1/al-schedule/propose/:submissionId
 * NOTE: Temporarily using PostgreSQL only until chaincode is upgraded
 */
exports.proposeSchedule = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { proposedDate, proposedEndDate, proposedVenue } = req.body;
    const proposedBy = req.user?.username || 'kea';

    if (!proposedDate || !proposedVenue) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['proposedDate', 'proposedVenue']
      });
    }

    logger.info(`Proposing AL schedule for ${submissionId} by ${proposedBy}`);

    // Store in PostgreSQL (chaincode call disabled until upgrade)
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO al_schedules (submission_id, proposed_date, proposed_end_date, proposed_venue, proposed_by, status)
        VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE username = $5 LIMIT 1), 'proposed')
        ON CONFLICT (submission_id) DO UPDATE SET
          proposed_date = EXCLUDED.proposed_date,
          proposed_end_date = EXCLUDED.proposed_end_date,
          proposed_venue = EXCLUDED.proposed_venue,
          status = 'proposed',
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [submissionId, proposedDate, proposedEndDate || null, proposedVenue, proposedBy]);

      // Create notification for Sekretariat Admin
      notificationController.createNotification(
        'sekretariat',
        'Usulan Jadwal AL Baru',
        `KEA mengusulkan jadwal AL untuk submission ${submissionId}. Tanggal: ${proposedDate}`,
        'info'
      );

      logger.info(`AL schedule proposed for ${submissionId}`);
      res.json({
        success: true,
        message: 'Jadwal AL berhasil diusulkan!',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error proposing AL schedule:', error);
    res.status(500).json({
      error: 'Failed to propose AL schedule',
      message: error.message
    });
  }
};

/**
 * Step 19-20: Sekretariat Admin approves/rejects AL schedule
 * POST /api/v1/al-schedule/approve/:submissionId
 * NOTE: Temporarily using PostgreSQL only until chaincode is upgraded
 */
exports.approveSchedule = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { approved, notes } = req.body;
    const approvedBy = req.user?.username || 'sekretariat';

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required field: approved (boolean)'
      });
    }

    logger.info(`${approved ? 'Approving' : 'Rejecting'} AL schedule for ${submissionId}`);

    // Update PostgreSQL (chaincode call disabled until upgrade)
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE al_schedules 
        SET status = $1,
            approved_by = (SELECT id FROM users WHERE username = $2 LIMIT 1),
            approved_at = CURRENT_TIMESTAMP,
            approval_notes = $3,
            rejection_reason = $4,
            flow_b_completed = $5,
            flow_b_completed_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE submission_id = $6
        RETURNING *
      `, [
        approved ? 'approved' : 'rejected',
        approvedBy,
        notes || null,
        approved ? null : notes,
        approved,
        submissionId
      ]);

      // Check for sync completion
      if (approved) {
        const syncCheck = await client.query(`
          SELECT flow_a_completed FROM al_schedules WHERE submission_id = $1
        `, [submissionId]);
        
        if (syncCheck.rows[0]?.flow_a_completed) {
          await client.query(`
            UPDATE al_schedules 
            SET sync_completed = TRUE,
                sync_completed_at = CURRENT_TIMESTAMP,
                ready_for_al = TRUE
            WHERE submission_id = $1
          `, [submissionId]);
        }
      }

      // Create notification for KEA
      notificationController.createNotification(
        'kea',
        approved ? 'Jadwal AL Disetujui' : 'Jadwal AL Ditolak',
        approved 
          ? `Jadwal AL untuk submission ${submissionId} telah disetujui`
          : `Jadwal AL untuk submission ${submissionId} ditolak: ${notes}`,
        approved ? 'success' : 'warning'
      );

      logger.info(`AL schedule ${approved ? 'approved' : 'rejected'} for ${submissionId}`);
      res.json({
        success: true,
        message: approved ? 'Jadwal AL berhasil disetujui!' : 'Jadwal AL ditolak.',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error approving AL schedule:', error);
    res.status(500).json({
      error: 'Failed to approve AL schedule',
      message: error.message
    });
  }
};

/**
 * Get AL schedule by submission ID
 * GET /api/v1/al-schedule/:submissionId
 */
exports.getSchedule = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          als.*,
          u1.name as proposed_by_name,
          u2.name as approved_by_name
        FROM al_schedules als
        LEFT JOIN users u1 ON als.proposed_by = u1.id
        LEFT JOIN users u2 ON als.approved_by = u2.id
        WHERE als.submission_id = $1
      `, [submissionId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'AL schedule not found' 
        });
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error getting AL schedule:', error);
    res.status(500).json({
      error: 'Failed to get AL schedule',
      message: error.message
    });
  }
};

/**
 * Get all pending AL schedules (for Sekretariat Admin)
 * GET /api/v1/al-schedule/pending
 */
exports.getPendingSchedules = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          als.*,
          u.name as proposed_by_name
        FROM al_schedules als
        LEFT JOIN users u ON als.proposed_by = u.id
        WHERE als.status = 'proposed'
        ORDER BY als.proposed_at DESC
      `);

      // Fetch submission data to get assessor information
      const schedulesWithAssessors = await Promise.all(
        result.rows.map(async (schedule) => {
          try {
            const submission = await fabricService.getSubmission(
              schedule.submission_id, 
              { mspOrg: req.user?.msp_org || 'UPPSMSP' }
            );
            return {
              ...schedule,
              programStudi: submission?.programStudi || 'N/A',
              institusi: submission?.institusi || 'N/A',
              assessor1Name: submission?.assignedAssessors?.assessor1Name || null,
              assessor2Name: submission?.assignedAssessors?.assessor2Name || null
            };
          } catch (err) {
            logger.warn(`Could not fetch submission ${schedule.submission_id}:`, err.message);
            return schedule;
          }
        })
      );

      logger.info(`Retrieved ${schedulesWithAssessors.length} pending AL schedules with assessor info`);
      res.json(schedulesWithAssessors);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error getting pending AL schedules:', error);
    res.status(500).json({
      error: 'Failed to get pending AL schedules',
      message: error.message
    });
  }
};

/**
 * Get all approved AL schedules (ready for AL)
 * GET /api/v1/al-schedule/approved
 */
exports.getApprovedSchedules = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          als.*,
          u1.name as proposed_by_name,
          u2.name as approved_by_name
        FROM al_schedules als
        LEFT JOIN users u1 ON als.proposed_by = u1.id
        LEFT JOIN users u2 ON als.approved_by = u2.id
        WHERE als.status IN ('approved', 'completed')
        ORDER BY als.proposed_date ASC
      `);

      logger.info(`Retrieved ${result.rows.length} approved AL schedules`);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error getting approved AL schedules:', error);
    res.status(500).json({
      error: 'Failed to get approved AL schedules',
      message: error.message
    });
  }
};

/**
 * Get submissions ready for AL (both flows synchronized)
 * GET /api/v1/al-schedule/ready-for-al
 */
exports.getReadyForAL = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          als.*,
          u1.name as proposed_by_name,
          u2.name as approved_by_name
        FROM al_schedules als
        LEFT JOIN users u1 ON als.proposed_by = u1.id
        LEFT JOIN users u2 ON als.approved_by = u2.id
        WHERE als.ready_for_al = TRUE
        ORDER BY als.proposed_date ASC
      `);

      logger.info(`Retrieved ${result.rows.length} submissions ready for AL`);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error getting ready for AL:', error);
    res.status(500).json({
      error: 'Failed to get submissions ready for AL',
      message: error.message
    });
  }
};

/**
 * Step 21: Check flows synchronization status
 * POST /api/v1/al-schedule/check-sync/:submissionId
 */
exports.checkSyncStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const checkedBy = req.user?.username || 'kea';

    // Call chaincode to check sync
    const result = await fabricService.invokeChaincode(
      'CheckFlowsSynchronized',
      [submissionId, checkedBy]
    );

    const submission = JSON.parse(result);

    // Update PostgreSQL sync status
    if (submission.flowSyncStatus) {
      const client = await pool.connect();
      try {
        await client.query(`
          UPDATE al_schedules 
          SET flow_a_completed = $1,
              flow_a_completed_at = $2,
              flow_b_completed = $3,
              flow_b_completed_at = $4,
              sync_completed = $5,
              sync_completed_at = $6,
              ready_for_al = $7,
              updated_at = CURRENT_TIMESTAMP
          WHERE submission_id = $8
        `, [
          submission.flowSyncStatus.flowACompleted,
          submission.flowSyncStatus.flowACompletedAt || null,
          submission.flowSyncStatus.flowBCompleted,
          submission.flowSyncStatus.flowBCompletedAt || null,
          submission.flowSyncStatus.syncCompleted,
          submission.flowSyncStatus.syncCompletedAt || null,
          submission.flowSyncStatus.readyForAL,
          submissionId
        ]);
      } finally {
        client.release();
      }
    }

    res.json({
      success: true,
      syncStatus: submission.flowSyncStatus,
      readyForAL: submission.flowSyncStatus?.readyForAL || false
    });
  } catch (error) {
    logger.error('Error checking sync status:', error);
    res.status(500).json({
      error: 'Failed to check sync status',
      message: error.message
    });
  }
};

/**
 * Update Flow A completion status (called after AK consistency check)
 * Internal use - called from keaController
 */
exports.updateFlowAStatus = async (submissionId, completed) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE al_schedules 
        SET flow_a_completed = $1,
            flow_a_completed_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
            sync_completed = CASE WHEN $1 AND flow_b_completed THEN TRUE ELSE FALSE END,
            sync_completed_at = CASE WHEN $1 AND flow_b_completed THEN CURRENT_TIMESTAMP ELSE NULL END,
            ready_for_al = CASE WHEN $1 AND flow_b_completed THEN TRUE ELSE FALSE END,
            updated_at = CURRENT_TIMESTAMP
        WHERE submission_id = $2
      `, [completed, submissionId]);
      
      logger.info(`Flow A status updated for ${submissionId}: ${completed}`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating Flow A status:', error);
    throw error;
  }
};
/**
 * Generate Assignment Letter (Surat Tugas) PDF
 * POST /api/v1/al-schedule/generate-letter/:submissionId
 */
exports.generateAssignmentLetter = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { letterNumber } = req.body; // Surat Tugas Number from input

    // Get schedule and submission info from PostgreSQL
    const client = await pool.connect();
    let schedule = null;
    let submissionInfo = null;
    try {
        const resSchedule = await client.query('SELECT * FROM al_schedules WHERE submission_id = $1', [submissionId]);
        schedule = resSchedule.rows[0];
        
        // Try to get submission info from submissions table if exists
        try {
          const resSub = await client.query('SELECT * FROM submissions WHERE submission_id = $1', [submissionId]);
          submissionInfo = resSub.rows[0];
        } catch (e) {
          // submissions table might not exist, that's ok
        }
    } finally {
        client.release();
    }

    if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.status !== 'approved') {
        return res.status(400).json({ error: 'Schedule must be approved to generate letter' });
    }

    // Try to get submission details from blockchain, with fallback
    let submission = null;
    try {
      submission = await fabricService.getSubmission(submissionId, { mspOrg: req.user?.msp_org || 'SekretariatMSP' });
    } catch (error) {
      logger.warn(`Could not fetch submission from blockchain for letter generation: ${error.message}. Using fallback data.`);
    }

    // Build data with fallbacks
    const programName = submission?.programStudi || submissionInfo?.program_name || 'Program Studi';
    const institutionName = submission?.institusi || submissionInfo?.institution_name || schedule.proposed_venue || 'Institusi';
    const assessor1Name = submission?.assignedAssessors?.assessor1Name || 'Asesor 1';
    const assessor2Name = submission?.assignedAssessors?.assessor2Name || 'Asesor 2';

    const pdfBuffer = await certificateService.generateAssignmentLetterPDF({
        submissionId,
        programName,
        institutionName,
        letterNumber: letterNumber || `ST/${submissionId.substring(0,8).toUpperCase()}/${new Date().getFullYear()}`,
        letterDate: new Date().toISOString(),
        assessor1Name,
        assessor2Name,
        visitDateStart: new Date(schedule.proposed_date).toLocaleDateString('id-ID'),
        visitDateEnd: schedule.proposed_end_date ? new Date(schedule.proposed_end_date).toLocaleDateString('id-ID') : '-',
        venue: schedule.proposed_venue
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Surat_Tugas_${submissionId}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating assignment letter:', error);
    res.status(500).json({ error: 'Failed to generate assignment letter', message: error.message });
  }
};
