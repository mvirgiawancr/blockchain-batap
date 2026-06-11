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
    const db = require('../config/database');
    const submissions = await fabricService.getAllSubmissions({ mspOrg: req.user.msp_org });
    
    // Filter for submissions that need assignment (e.g. status 'submitted' or 'approved' and no currentOffer)
    const readySubmissions = submissions.filter(s => 
      (s.status === 'submitted' || s.status === 'approved') && 
      !s.assignedAssessors
    );

    // Fetch and attach payment status from database
    if (readySubmissions.length > 0) {
      const submissionIds = readySubmissions.map(s => s.submissionId);
      try {
        const paymentResult = await db.query(
          `SELECT submission_id, status FROM accreditation_payments WHERE submission_id = ANY($1)`,
          [submissionIds]
        );

        const paymentMap = {};
        paymentResult.rows.forEach(row => {
          paymentMap[row.submission_id] = row.status;
        });

        readySubmissions.forEach(s => {
          s.paymentStatus = paymentMap[s.submissionId] || null; // null if not invoiced/found
        });
      } catch (dbErr) {
        logger.error('Error fetching payment status for submissions:', dbErr);
        readySubmissions.forEach(s => {
          s.paymentStatus = null;
        });
      }
    }

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

    // Gating Validation: Check database if the payment is verified
    const db = require('../config/database');
    try {
      const paymentCheck = await db.query(
        `SELECT status FROM accreditation_payments WHERE submission_id = $1`,
        [submissionId]
      );
      
      if (paymentCheck.rows.length === 0 || paymentCheck.rows[0].status !== 'verified') {
        const paymentStatus = paymentCheck.rows.length > 0 ? paymentCheck.rows[0].status : 'uninvoiced';
        let explanation = 'belum ditagih';
        if (paymentStatus === 'invoiced') explanation = 'belum dibayar';
        if (paymentStatus === 'submitted') explanation = 'menunggu verifikasi';
        if (paymentStatus === 'rejected') explanation = 'ditolak';

        logger.warn(`Assessor assignment blocked for submission ${submissionId} because payment is ${paymentStatus}`);
        return res.status(403).json({
          error: 'Pembayaran Belum Terverifikasi',
          message: `Penugasan asesor diblokir karena status pembayaran untuk submisi ini ${explanation}.`
        });
      }
    } catch (dbErr) {
      logger.error('Error validating payment before assignment:', dbErr);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Gagal melakukan verifikasi pembayaran. Silakan coba lagi.'
      });
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

/**
 * Get detailed consistency data for a specific submission
 * GET /api/v1/kea/consistency/:submissionId/detail
 */
exports.getConsistencyDetail = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Get the specific submission
    const submission = await fabricService.getSubmission(submissionId, { mspOrg: req.user.msp_org });
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (!submission.akAssessments || submission.akAssessments.length < 2) {
      return res.status(400).json({ 
        error: 'Submission does not have 2 AK assessments yet',
        assessmentCount: submission.akAssessments?.length || 0
      });
    }

    const a1 = submission.akAssessments[0];
    const a2 = submission.akAssessments[1];
    const diff = Math.abs(a1.totalScore - a2.totalScore);

    const result = {
      submissionId: submission.submissionId,
      programStudi: submission.programStudi,
      institusi: submission.institusi,
      assessor1: {
        id: a1.assessorId,
        name: a1.assessorName,
        scores: a1.scores || {},
        totalScore: a1.totalScore,
        submittedAt: a1.submittedAt
      },
      assessor2: {
        id: a2.assessorId,
        name: a2.assessorName,
        scores: a2.scores || {},
        totalScore: a2.totalScore,
        submittedAt: a2.submittedAt
      },
      scoreDifference: diff,
      isConsistent: diff <= 15,
      akConsistent: submission.akConsistent
    };

    logger.info(`Retrieved consistency detail for ${submissionId}`);
    res.json(result);
  } catch (error) {
    logger.error('Error getting consistency detail:', error);
    res.status(500).json({
      error: 'Failed to retrieve consistency detail',
      message: error.message
    });
  }
};

/**
 * Get pending UPPS rejections that need KEA review
 * GET /api/v1/kea/pending-rejections
 */
exports.getPendingRejections = async (req, res) => {
  try {
    const submissions = await fabricService.getAllSubmissions({ mspOrg: req.user.msp_org });
    
    // Filter for submissions where UPPS rejected the offer and KEA review is pending
    const pendingRejections = submissions.filter(s => 
      s.currentOffer && 
      s.currentOffer.status === 'pending_kea_review' &&
      s.currentOffer.keaReviewStatus === 'pending'
    ).map(s => ({
      submissionId: s.submissionId,
      programStudi: s.programStudi,
      institusi: s.institusi,
      assessor1Name: s.currentOffer.assessor1Name,
      assessor2Name: s.currentOffer.assessor2Name,
      rejectionReason: s.currentOffer.rejectionReason,
      uppsNotes: s.currentOffer.uppsNotes,
      uppsResponseAt: s.currentOffer.uppsResponseAt,
      offeredAt: s.currentOffer.offeredAt
    }));

    logger.info(`Retrieved ${pendingRejections.length} pending rejections for KEA review`);
    res.json({
      success: true,
      count: pendingRejections.length,
      data: pendingRejections
    });
  } catch (error) {
    logger.error('Error getting pending rejections:', error);
    res.status(500).json({
      error: 'Failed to retrieve pending rejections',
      message: error.message
    });
  }
};

/**
 * KEA reviews UPPS rejection reason
 * POST /api/v1/kea/review-rejection/:submissionId
 * Body: { decision: 'reason_accepted' | 'reason_rejected', notes?: string }
 */
exports.reviewRejection = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { decision, notes } = req.body;

    if (!decision || !['reason_accepted', 'reason_rejected'].includes(decision)) {
      return res.status(400).json({ 
        error: 'Invalid decision. Must be "reason_accepted" or "reason_rejected"' 
      });
    }

    const result = await fabricService.keaReviewRejection(
      submissionId,
      decision,
      notes || '',
      req.user.username,
      { mspOrg: req.user.msp_org }
    );

    // Create notification for UPPS
    const submission = await fabricService.getSubmission(submissionId, { mspOrg: req.user.msp_org });
    if (submission && submission.submittedBy) {
      const message = decision === 'reason_accepted'
        ? `Alasan penolakan asesor untuk ${submission.programStudi} diterima. Asesor baru akan ditugaskan.`
        : `Alasan penolakan asesor untuk ${submission.programStudi} ditolak. Asesor telah ditugaskan.`;
      
      notificationController.createNotification(
        submission.submittedBy,
        'Hasil Review KEA',
        message,
        decision === 'reason_accepted' ? 'info' : 'warning'
      );
    }

    logger.info(`KEA reviewed rejection for ${submissionId}: ${decision}`);
    res.json({ 
      success: true, 
      message: decision === 'reason_accepted' 
        ? 'Alasan diterima. Silakan tugaskan asesor baru.'
        : 'Alasan ditolak. Asesor telah ditugaskan secara paksa.',
      result 
    });
  } catch (error) {
    logger.error('Error reviewing rejection:', error);
    res.status(500).json({
      error: 'Failed to review rejection',
      message: error.message
    });
  }
};
