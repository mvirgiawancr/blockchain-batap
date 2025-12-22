/**
 * KEA (Ketua Evaluasi Akreditasi) Controller
 * Handles KEA-specific operations
 */

const logger = require('../utils/logger');
const notificationController = require('./notificationController');
const fabricService = require('../services/fabricService');

/**
 * Get approved submissions (ready for assessor assignment)
 * GET /api/v1/kea/submissions-approved
 */
exports.getApprovedSubmissions = async (req, res) => {
  try {
    // Get submissions with status 'approved' (from Phase 2) or 'submitted' depending on workflow
    // Assuming 'submitted' or 'under_review' is the initial state, and after desk evaluation it might be 'approved' for AL?
    // Actually, for Phase 3A (Assignment), the submission usually comes from Phase 2 (Desk Evaluation) or just initial submission if simplified.
    // Let's query all and filter or query by status 'submitted' or 'approved'.
    // Based on user request Phase 3A starts after Phase 2.
    
    // For now, let's get all and filter in memory or query by status if we know it.
    // Let's assume 'submitted' is the status waiting for assignment.
    const submissions = await fabricService.getAllSubmissions({ mspOrg: req.user.msp_org });
    
    // Filter for submissions that need assignment (e.g. status 'submitted' or 'approved_desk_eval' and no currentOffer)
    const readySubmissions = submissions.filter(s => 
      (s.status === 'submitted' || s.status === 'approved') && 
      !s.assignedAssessors
    );

    logger.info(`Retrieved ${readySubmissions.length} submissions ready for assignment`);
    res.json(readySubmissions);
  } catch (error) {
    logger.error('Error getting approved submissions:', error);
    res.status(500).json({
      error: 'Failed to retrieve submissions',
      message: error.message
    });
  }
};

/**
 * Get available assessors
 * GET /api/v1/kea/assessors
 * Optional query: ?programStudi=xxx (will use AI to rank by expertise match)
 */
exports.getAssessors = async (req, res) => {
  try {
    const { programStudi } = req.query;
    const geminiService = require('../services/geminiService');
    const db = require('../config/database');

    // Get assessors from database WITH research profiles
    const result = await db.query(
      `SELECT u.id, u.username, u.name, u.institution, u.program_studi, u.phone,
              ap.research_areas, ap.h_index, ap.publication_count
       FROM users u
       LEFT JOIN assessor_profiles ap ON u.id = ap.user_id
       WHERE u.role IN ('asesor', 'assessor') AND u.is_active = TRUE
       ORDER BY u.name`
    );

    let assessors = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      institution: row.institution,
      // Use research_areas if available, otherwise fallback to program_studi
      expertise: row.research_areas?.join(', ') || row.program_studi || 'Tidak diketahui',
      researchAreas: row.research_areas || [],
      hIndex: row.h_index,
      publicationCount: row.publication_count || 0,
      phone: row.phone,
      totalAssignments: 0 // TODO: Count from assignments table
    }));

    // If no assessors in DB, use hardcoded fallback
    if (assessors.length === 0) {
      assessors = [
        { id: 'asesor_001', name: 'Dr. Ahmad Fauzi', expertise: 'Teknik Informatika', totalAssignments: 12 },
        { id: 'asesor_002', name: 'Prof. Dr. Siti Nurhaliza', expertise: 'Teknik Elektro', totalAssignments: 15 },
        { id: 'asesor_003', name: 'Dr. Budi Santoso', expertise: 'Sistem Informasi', totalAssignments: 10 },
        { id: 'asesor_004', name: 'Dr. Dewi Lestari', expertise: 'Teknik Komputer', totalAssignments: 8 }
      ];
    }

    // If programStudi is provided, use AI to rank assessors
    if (programStudi) {
      logger.info(`Ranking assessors for program studi: ${programStudi}`);
      const rankedAssessors = await geminiService.matchAssessorExpertise(programStudi, assessors);
      logger.info(`Retrieved ${rankedAssessors.length} ranked assessors`);
      return res.json({
        success: true,
        programStudi,
        assessors: rankedAssessors
      });
    }

    logger.info(`Retrieved ${assessors.length} assessors for KEA`);
    res.json({
      success: true,
      assessors
    });
  } catch (error) {
    logger.error('Error getting assessors:', error);
    res.status(500).json({
      error: 'Failed to retrieve assessors',
      message: error.message
    });
  }
};

/**
 * Assign assessors to submission
 * POST /api/v1/kea/assign/:submissionId
 */
exports.assignAssessors = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { assessor1Id, assessor1Name, assessor2Id, assessor2Name } = req.body;

    if (!assessor1Id || !assessor2Id) {
      return res.status(400).json({ error: 'Two assessors are required (assessor1Id, assessor2Id)' });
    }

    const result = await fabricService.offerAssessorPair(
      submissionId,
      assessor1Id,
      assessor1Name || assessor1Id,
      assessor2Id,
      assessor2Name || assessor2Id,
      req.user.username,
      { mspOrg: req.user.msp_org }
    );

    // Create notifications for assessors
    [assessor1Id, assessor2Id].forEach(assessorId => {
      notificationController.createNotification(
        assessorId,
        'Penugasan Baru',
        `Anda ditawarkan untuk menilai submission ${submissionId}`,
        'info'
      );
    });

    logger.info(`Assessors offered for ${submissionId}: ${assessor1Id}, ${assessor2Id}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error assigning assessors:', error);
    res.status(500).json({
      error: 'Failed to assign assessors',
      message: error.message
    });
  }
};

/**
 * Get monitoring data for all assignments
 * GET /api/v1/kea/monitoring
 */
exports.getMonitoring = async (req, res) => {
  try {
    const submissions = await fabricService.getAllSubmissions({ mspOrg: req.user.msp_org });
    
    // Transform submissions into monitoring data
    const monitoringData = submissions.map(s => {
      let status = 'pending';
      let progress = 0;
      let assessorInfo = 'Not Assigned';

      if (s.assignedAssessors) {
        status = 'assigned';
        assessorInfo = `${s.assignedAssessors.assessor1Name}, ${s.assignedAssessors.assessor2Name}`;
        progress = 20;
      } else if (s.currentOffer) {
        status = 'offered';
        assessorInfo = `${s.currentOffer.assessor1Name}, ${s.currentOffer.assessor2Name}`;
        progress = 10;
      }

      if (s.akAssessments && s.akAssessments.length > 0) {
        status = 'ak_in_progress';
        progress = 20 + (s.akAssessments.length * 30); // 50% if 1, 80% if 2
      }

      if (s.akConsistent) {
        status = 'ak_completed';
        progress = 100;
      }

      return {
        id: s.submissionId,
        submissionId: s.submissionId,
        programStudi: s.programStudi,
        institusi: s.institusi,
        assessorName: assessorInfo,
        status,
        progress,
        assignedAt: s.assignedAssessors?.assignedAt || s.currentOffer?.offeredAt,
        score: s.scoringResult?.totalScore
      };
    });

    logger.info(`Retrieved ${monitoringData.length} assignments for monitoring`);
    res.json(monitoringData);
  } catch (error) {
    logger.error('Error getting monitoring data:', error);
    res.status(500).json({
      error: 'Failed to retrieve monitoring data',
      message: error.message
    });
  }
};

/**
 * Get consistency analysis
 * GET /api/v1/kea/consistency
 */
exports.getConsistencyAnalysis = async (req, res) => {
  try {
    const submissions = await fabricService.getAllSubmissions({ mspOrg: req.user.msp_org });
    
    // Filter for submissions where both assessors have submitted AK
    const readyForCheck = submissions.filter(s => 
      s.akAssessments && s.akAssessments.length === 2 && !s.akConsistent
    ).map(s => {
      const a1 = s.akAssessments[0];
      const a2 = s.akAssessments[1];
      const diff = Math.abs(a1.totalScore - a2.totalScore);
      
      return {
        id: s.submissionId,
        submissionId: s.submissionId,
        programStudi: s.programStudi,
        institusi: s.institusi,
        assessor1: { name: a1.assessorName, score: a1.totalScore },
        assessor2: { name: a2.assessorName, score: a2.totalScore },
        scoreDifference: diff,
        isConsistent: diff <= 15, // Example threshold
        status: 'ready_for_check'
      };
    });

    logger.info(`Retrieved ${readyForCheck.length} submissions for consistency check`);
    res.json(readyForCheck);
  } catch (error) {
    logger.error('Error getting consistency analysis:', error);
    res.status(500).json({
      error: 'Failed to retrieve consistency analysis',
      message: error.message
    });
  }
};

/**
 * Set consistency check result
 * POST /api/v1/kea/consistency/:submissionId
 */
exports.setConsistency = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { consistent, notes } = req.body;

    const result = await fabricService.checkAKConsistency(
      submissionId,
      consistent,
      req.user.username,
      notes || '',
      { mspOrg: req.user.msp_org }
    );

    logger.info(`Consistency set for ${submissionId}: ${consistent}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error setting consistency:', error);
    res.status(500).json({
      error: 'Failed to set consistency',
      message: error.message
    });
  }
};
