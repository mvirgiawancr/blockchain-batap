/**
 * Submission Controller
 * Handles CRUD operations for submissions
 */

const fabricService = require('../services/fabricService');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { isValidUUID, createPaginationMeta } = require('../utils/helpers');
const assignmentService = require('../services/assignmentService');

/**
 * Get all submissions with optional filtering
 */
const getAllSubmissions = async (req, res, next) => {
  try {
    const { programStudi, institusi, programType, status, limit, offset } = req.query;

    logger.info('Fetching all submissions', { programStudi, institusi, programType, status });

    let submissions = await fabricService.getAllSubmissions();

    // Inject assignment info
    const assignmentMap = await assignmentService.getAssignmentsBySubmissionIds(
      submissions.map(s => s.submissionId || s.id)
    );
    submissions = submissions.map(s => {
      const subId = s.submissionId || s.id;
      const a = assignmentMap[subId];
      return {
        ...s,
        assignedAssessorId: a?.assessor_user_id || null,
        assignedAssessorUsername: a?.assessor_username || null,
        assignedAssessorName: a?.assessor_name || null,
        assignmentNotes: a?.notes || null,
        assignmentAssignedBy: a?.assigned_by_username || a?.assigned_by || null,
        assignmentAssignedAt: a?.created_at || null,
        assignmentStatus: a?.status || 'pending'
      };
    });

    // Apply filters
    if (programStudi) {
      submissions = submissions.filter(s => 
        s.programStudi.toLowerCase().includes(programStudi.toLowerCase())
      );
    }

    if (institusi) {
      submissions = submissions.filter(s => 
        s.institusi.toLowerCase().includes(institusi.toLowerCase())
      );
    }

    if (programType) {
      submissions = submissions.filter(s => s.programType === programType);
    }

    if (status) {
      submissions = submissions.filter(s => s.status === status);
    }

    // Calculate pagination
    const total = submissions.length;
    const paginatedSubmissions = submissions.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedSubmissions,
      pagination: createPaginationMeta(total, limit, offset)
    });

  } catch (error) {
    logger.error('Get all submissions error:', error);
    next(error);
  }
};

/**
 * Get submission by ID
 */
const getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching submission: ${id}`);

    const submission = await fabricService.getSubmission(id);
    const assignment = await assignmentService.getAssignment(id);
    if (assignment) {
      submission.assignedAssessorId = assignment.assessor_user_id;
      submission.assignedAssessorUsername = assignment.assessor_username;
      submission.assignedAssessorName = assignment.assessor_name;
      submission.assignmentNotes = assignment.notes;
      submission.assignmentAssignedBy = assignment.assigned_by_username || assignment.assigned_by;
      submission.assignmentAssignedAt = assignment.created_at;
      submission.assignmentStatus = assignment.status || 'pending';
    }

    // Inject Verification Result from PostgreSQL
    try {
        const verRes = await pool.query('SELECT * FROM verification_results WHERE submission_id = $1', [id]);
        if (verRes.rows.length > 0) {
            const vr = verRes.rows[0];
            submission.verificationResult = {
                finalScore: vr.final_score,
                recommendedRank: vr.recommended_rank,
                notes: vr.notes,
                verifiedAt: vr.verified_at,
                verifiedBy: vr.verified_by
            };
        }
    } catch (pgError) {
        logger.error('Error fetching verification result:', pgError);
        // Don't fail the whole request if this part fails
    }

    // Inject Accreditation Decision from PostgreSQL
    try {
        const decRes = await pool.query('SELECT * FROM accreditation_decisions WHERE submission_id = $1', [id]);
        if (decRes.rows.length > 0) {
            const dr = decRes.rows[0];
            submission.accreditationDecision = {
                decisionId: dr.decision_id,
                finalRank: dr.final_rank,
                finalScore: dr.final_score,
                skNumber: dr.sk_number,
                skDate: dr.sk_date,
                validUntil: dr.valid_until,
                decidedBy: dr.decided_by,
                decidedAt: dr.decided_at,
                certificateCid: dr.certificate_cid
            };
        }
    } catch (pgError) {
        logger.error('Error fetching accreditation decision:', pgError);
    }

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: submission
    });

  } catch (error) {
    logger.error('Get submission error:', error);
    next(error);
  }
};

/**
 * Get submissions by program studi
 */
const getSubmissionsByProgramStudi = async (req, res, next) => {
  try {
    const { programStudi } = req.params;

    logger.info(`Fetching submissions for program studi: ${programStudi}`);

    const submissions = await fabricService.getSubmissionsByProgramStudi(programStudi);

    res.json({
      success: true,
      data: submissions,
      count: submissions.length
    });

  } catch (error) {
    logger.error('Get submissions by program studi error:', error);
    next(error);
  }
};

/**
 * Update submission
 */
const updateSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info(`Updating submission: ${id}`, updates);

    // Verify submission exists
    const existingSubmission = await fabricService.getSubmission(id);
    if (!existingSubmission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`
      });
    }

    // Update on blockchain
    const result = await fabricService.updateSubmission(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: result.data
    });

  } catch (error) {
    logger.error('Update submission error:', error);
    next(error);
  }
};

/**
 * Delete submission
 */
const deleteSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Deleting submission: ${id}`);

    // Verify submission exists
    const existingSubmission = await fabricService.getSubmission(id);
    if (!existingSubmission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`
      });
    }

    await fabricService.deleteSubmission(id);

    res.json({
      success: true,
      message: 'Submission deleted successfully',
      id
    });

  } catch (error) {
    logger.error('Delete submission error:', error);
    next(error);
  }
};

/**
 * Get submission statistics
 */
const getSubmissionStats = async (req, res, next) => {
  try {
    logger.info('Fetching submission statistics');

    const submissions = await fabricService.getAllSubmissions();

    const stats = {
      total: submissions.length,
      byStatus: {},
      byProgramType: {},
      byAkreditasi: {},
      recentSubmissions: []
    };

    // Count by status
    submissions.forEach(s => {
      stats.byStatus[s.status] = (stats.byStatus[s.status] || 0) + 1;
      stats.byProgramType[s.programType] = (stats.byProgramType[s.programType] || 0) + 1;
      
      if (s.scoringResult && s.scoringResult.akreditasi) {
        stats.byAkreditasi[s.scoringResult.akreditasi] = 
          (stats.byAkreditasi[s.scoringResult.akreditasi] || 0) + 1;
      }
    });

    // Get 5 most recent submissions
    stats.recentSubmissions = submissions
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        programStudi: s.programStudi,
        institusi: s.institusi,
        status: s.status,
        submittedAt: s.submittedAt
      }));

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Get submission stats error:', error);
    next(error);
  }
};

/**
 * Set decision (approve/reject) for a submission
 */
const setDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, notes, decidedBy } = req.body;
    const actor = req.user || {};

    logger.info(`Setting decision for submission ${id}: ${decision} by ${actor.username || decidedBy || 'unknown'}`);

    // Verify submission exists
    const submission = await fabricService.getSubmission(id);
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`
      });
    }

    // Validate decision
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: 'Invalid decision',
        message: 'Decision must be either "approved" or "rejected"'
      });
    }

    // Create decision object
    const decisionData = {
      decision,
      notes: notes || '',
      decidedBy: decidedBy || actor.username || 'unknown',
      decidedByRole: actor.role || null,
      decidedAt: new Date().toISOString()
    };

    // Update submission on blockchain
    const result = await fabricService.setDecision(
      id,
      decision,
      notes,
      decisionData.decidedBy,
      { userId: actor.id }
    );

    logger.info(`Decision set successfully for submission ${id}: ${decision}`);
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;

    res.json({
      success: true,
      message: `Submission ${decision} successfully`,
      data: parsed
    });

  } catch (error) {
    logger.error('Set decision error:', error);
    next(error);
  }
};

module.exports = {
  getAllSubmissions,
  getSubmissionById,
  getSubmissionsByProgramStudi,
  updateSubmission,
  deleteSubmission,
  getSubmissionStats,
  setDecision,
  assignAssessor,
  getAssignment,
  clearAssignment,
  acceptAssignment,
  rejectAssignment
};

/**
 * Assign assessor to a submission
 */
async function assignAssessor(req, res, next) {
  try {
    const { id } = req.params;
    const { assessorUserId, notes } = req.body;
    const actor = req.user || {};

    if (!assessorUserId) {
      return res.status(400).json({
        error: 'assessorUserId is required'
      });
    }

    // Verify submission exists on blockchain
    const submission = await fabricService.getSubmission(id);
    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found'
      });
    }

    const result = await assignmentService.assignAssessor(
      id,
      assessorUserId,
      actor.id,
      notes || null
    );

    logger.info(`Assessor assigned for submission ${id}: ${assessorUserId} by ${actor.username}`);

    res.json({
      success: true,
      message: 'Assessor assigned successfully',
      data: result
    });
  } catch (error) {
    logger.error('Assign assessor error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get current assignment for a submission
 */
async function getAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignment(id);

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    logger.error('Get assignment error:', error);
    next(error);
  }
}

/**
 * Clear assignment for a submission
 */
async function clearAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const actor = req.user || {};

    const deleted = await assignmentService.clearAssignment(id);
    logger.info(`Assignment cleared for submission ${id} by ${actor.username}`);

    res.json({
      success: true,
      message: 'Assessor assignment cleared',
      data: deleted
    });
  } catch (error) {
    logger.error('Clear assignment error:', error);
    next(error);
  }
}

async function acceptAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const actor = req.user || {};

    const updated = await assignmentService.updateStatus(id, 'accepted', actor.id, 'Accepted by assessor');
    res.json({
      success: true,
      message: 'Assignment accepted',
      data: updated
    });
  } catch (error) {
    logger.error('Accept assignment error:', error);
    next(error);
  }
}

async function rejectAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const actor = req.user || {};
    const { notes } = req.body;

    const updated = await assignmentService.updateStatus(id, 'rejected', actor.id, notes || 'Rejected by assessor');
    res.json({
      success: true,
      message: 'Assignment rejected',
      data: updated
    });
  } catch (error) {
    logger.error('Reject assignment error:', error);
    next(error);
  }
}

/**
 * UPPS responds to assessor offer
 */
const respondToAssessorOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response, notes } = req.body;
    const actor = req.user;

    const result = await fabricService.uppsRespondToOffer(
      id,
      response,
      notes,
      actor.username,
      { userId: actor.id }
    );

    res.json({ success: true, result });
  } catch (error) {
    logger.error('UPPS respond to offer error:', error);
    next(error);
  }
};

/**
 * Get submission history (traceability)
 * Returns all blockchain transactions for a submission
 */
const getSubmissionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actor = req.user || {};

    logger.info(`Fetching submission history: ${id}`);

    const history = await fabricService.getSubmissionHistory(id, {
      userId: actor.id
    });

    // Parse history if it's a string
    let parsedHistory = history;
    if (typeof history === 'string') {
      try {
        parsedHistory = JSON.parse(history);
      } catch (e) {
        // Keep as-is if not JSON
      }
    }

    res.json({
      success: true,
      submissionId: id,
      history: parsedHistory
    });

  } catch (error) {
    logger.error('Get submission history error:', error);
    next(error);
  }
};

module.exports = {
  getAllSubmissions,
  getSubmissionById,
  getSubmissionsByProgramStudi,
  updateSubmission,
  deleteSubmission,
  getSubmissionStats,
  setDecision,
  assignAssessor,
  getAssignment,
  clearAssignment,
  acceptAssignment,
  rejectAssignment,
  respondToAssessorOffer,
  getSubmissionHistory
};
