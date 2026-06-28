/**
 * Asesor Controller
 * Handles asesor-specific operations (different from general assessor)
 */

const logger = require('../utils/logger');
const fabricService = require('../services/fabricService');
const notificationController = require('./notificationController');
const { pool } = require('../config/database');

/**
 * Get assignments for current asesor
 * GET /api/v1/asesor/assignments or /api/v1/assessor/assignments
 */
exports.getAssignments = async (req, res) => {
  try {
    const asesorId = req.user.id;
    
    // Get all submissions and filter for this assessor
    const submissions = await fabricService.getAllSubmissions({ userId: req.user.id });
    
    const filteredSubmissions = submissions.filter(s => {
      // Check for offers
      if (s.currentOffer) {
        if (s.currentOffer.assessor1Id === asesorId || s.currentOffer.assessor2Id === asesorId) {
          return true;
        }
      }
      // Check for confirmed assignments
      if (s.assignedAssessors) {
        if (s.assignedAssessors.assessor1Id === asesorId || s.assignedAssessors.assessor2Id === asesorId) {
          return true;
        }
      }
      return false;
    });

    // Query all schedule statuses from PostgreSQL in one go
    let scheduleMap = {};
    try {
      const dbResult = await pool.query('SELECT submission_id, status FROM al_schedules');
      dbResult.rows.forEach(row => {
        scheduleMap[row.submission_id] = row.status;
      });
    } catch (dbErr) {
      logger.warn('Failed to query al_schedules database in getAssignments:', dbErr.message);
    }

    const assignments = filteredSubmissions.map(s => {
      // Map to assignment format
      let status = 'pending';
      let partnerAssessor = '';
      let isOffer = false;
      
      if (s.currentOffer && !s.assignedAssessors) {
        isOffer = true;
        if (s.currentOffer.assessor1Id === asesorId) {
          status = s.currentOffer.assessor1Response === 'pending' ? 'offered' : s.currentOffer.assessor1Response;
          partnerAssessor = s.currentOffer.assessor2Name;
        } else {
          status = s.currentOffer.assessor2Response === 'pending' ? 'offered' : s.currentOffer.assessor2Response;
          partnerAssessor = s.currentOffer.assessor1Name;
        }
      } else if (s.assignedAssessors) {
        status = 'assigned';
        if (s.assignedAssessors.assessor1Id === asesorId) {
          partnerAssessor = s.assignedAssessors.assessor2Name;
        } else {
          partnerAssessor = s.assignedAssessors.assessor1Name;
        }
        
        // Check if AK submitted
        if (s.akAssessments && s.akAssessments.find(a => a.assessorId === asesorId)) {
          status = 'ak_submitted';
        }

        // Sync with PostgreSQL AL schedules status if approved/completed
        const dbScheduleStatus = scheduleMap[s.submissionId];
        if (dbScheduleStatus === 'approved') {
          status = 'al_ready';
        } else if (dbScheduleStatus === 'completed') {
          status = 'completed';
        }

        // Fallback sync with global status if it has advanced to AL or completed phase
        if (s.status && ['al_ready', 'al_in_progress', 'completed'].includes(s.status)) {
          status = s.status;
        }
      }

      return {
        id: s.submissionId, // Use submissionId as assignment ID for simplicity
        submissionId: s.submissionId,
        programStudi: s.programStudi,
        institusi: s.institusi,
        jenjang: s.programType || 'S1',
        status: status,
        assignedAt: s.assignedAssessors?.assignedAt || s.currentOffer?.offeredAt,
        dueDate: new Date(Date.now() + 2592000000).toISOString(), // Mock due date
        partnerAssessor: partnerAssessor,
        isOffer: isOffer
      };
    });

    logger.info(`Retrieved ${assignments.length} assignments for asesor ${asesorId}`);
    res.json(assignments);
  } catch (error) {
    logger.error('Error getting asesor assignments:', error);
    res.status(500).json({
      error: 'Failed to retrieve assignments',
      message: error.message
    });
  }
};

/**
 * Accept assignment
 * POST /api/v1/asesor/assignments/:id/accept
 */
exports.acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params; // id is submissionId
    const { response, notes } = req.body; // response: 'accepted' or 'rejected'
    const asesorId = req.user.id;

    const result = await fabricService.respondToOffer(
      id,
      asesorId,
      response || 'accepted',
      notes || '',
      { userId: req.user.id }
    );

    logger.info(`Assignment ${id} ${response || 'accepted'} by ${asesorId}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error accepting assignment:', error);
    res.status(500).json({
      error: 'Failed to accept assignment',
      message: error.message
    });
  }
};

/**
 * Respond to offer (generic)
 * POST /api/v1/asesor/respond-offer
 */
exports.respondToOffer = async (req, res) => {
  try {
    const { submissionId, response, notes } = req.body;
    const asesorId = req.user.id;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    const result = await fabricService.respondToOffer(
      submissionId,
      asesorId,
      response || 'accepted',
      notes || '',
      { userId: req.user.id }
    );

    logger.info(`Offer for ${submissionId} ${response || 'accepted'} by ${asesorId}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error responding to offer:', error);
    res.status(500).json({
      error: 'Failed to respond to offer',
      message: error.message
    });
  }
};

/**
 * Submit assessment/scoring
 * POST /api/v1/asesor/assignments/:id/submit
 */
exports.submitAssessment = async (req, res) => {
  try {
    const { id } = req.params; // id is submissionId
    const { scores, notes } = req.body;
    const asesorId = req.user.id;
    const asesorName = req.user.name || req.user.username;

    const result = await fabricService.submitAKAssessment(
      id,
      asesorId,
      asesorName,
      scores,
      notes || '',
      { userId: req.user.id }
    );

    logger.info(`Assessment submitted for assignment ${id} by ${asesorId}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error submitting assessment:', error);
    res.status(500).json({
      error: 'Failed to submit assessment',
      message: error.message
    });
  }
};

/**
 * Get assessment history
 * GET /api/v1/asesor/history
 */
exports.getHistory = async (req, res) => {
  try {
    const asesorId = req.user.id;
    const submissions = await fabricService.getAllSubmissions({ userId: req.user.id });

    const history = submissions.filter(s => 
      s.akAssessments && s.akAssessments.find(a => a.assessorId === asesorId)
    ).map(s => {
      const assessment = s.akAssessments.find(a => a.assessorId === asesorId);
      return {
        id: s.submissionId,
        submissionId: s.submissionId,
        programStudi: s.programStudi,
        institusi: s.institusi,
        finalScore: assessment.totalScore,
        assessedAt: assessment.submittedAt
      };
    });

    logger.info(`Retrieved ${history.length} history items for asesor ${asesorId}`);
    res.json(history);
  } catch (error) {
    logger.error('Error getting asesor history:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: error.message
    });
  }
};
