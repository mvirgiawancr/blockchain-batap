/**
 * Submission Controller
 * Handles CRUD operations for submissions
 */

const fabricService = require('../services/fabricService');
const logger = require('../utils/logger');
const { isValidUUID, createPaginationMeta } = require('../utils/helpers');

/**
 * Get all submissions with optional filtering
 */
const getAllSubmissions = async (req, res, next) => {
  try {
    const { programStudi, institusi, programType, status, limit, offset } = req.query;

    logger.info('Fetching all submissions', { programStudi, institusi, programType, status });

    let submissions = await fabricService.getAllSubmissions();

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

    logger.info(`Setting decision for submission ${id}: ${decision}`);

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
      decidedBy: decidedBy || 'Sekretariat',
      decidedAt: new Date().toISOString()
    };

    // Update submission on blockchain
    const result = await fabricService.updateSubmission(id, {
      status: decision, // Set status to 'approved' or 'rejected'
      decision: decisionData,
      updatedAt: new Date().toISOString()
    });

    logger.info(`Decision set successfully for submission ${id}: ${decision}`);

    res.json({
      success: true,
      message: `Submission ${decision} successfully`,
      data: result.data
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
  setDecision
};
