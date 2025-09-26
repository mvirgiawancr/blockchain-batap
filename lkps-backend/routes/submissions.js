const express = require('express');
const router = express.Router();
const { getCouchDBConnector } = require('../blockchain/couchdbConnector');

// Initialize CouchDB connector
let couchDB = null;
const initCouchDB = async () => {
  if (!couchDB) {
    couchDB = await getCouchDBConnector();
  }
  return couchDB;
};

// Get all submissions for UPPS (filtered by user)
router.get('/upps/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const db = await initCouchDB();
    
    // Query submissions from blockchain
    const submissions = await db.getSubmissionsByUser(userId);
    
    res.json({
      success: true,
      data: submissions,
      total: submissions.length
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
});

// Create new submission (UPPS)
router.post('/upps/:userId/submit', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { documentType, namaUniversitas, namaProgram, fileName, fileData } = req.body;
    const db = await initCouchDB();
    
    const submissionID = 'sub-' + Date.now();
    const submission = await db.createSubmission(submissionID, {
      documentType,
      namaUniversitas,
      namaProgram,
      fileName,
      submittedBy: userId,
      status: 'draft',
      maxScore: 4,
      version: 1,
      fileData
    });
    
    res.json({
      success: true,
      data: submission,
      message: 'Submission created successfully'
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating submission',
      error: error.message
    });
  }
});

// Submit document for review (UPPS)
router.patch('/upps/:userId/submit/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const db = await initCouchDB();
    
    const submission = await db.updateSubmissionStatus(submissionId, 'pending_review');
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    res.json({
      success: true,
      data: submission,
      message: 'Document submitted for review'
    });
  } catch (error) {
    console.error('Error submitting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting document',
      error: error.message
    });
  }
});

// Get all submissions for Asesor
router.get('/asesor/:assessorId', async (req, res) => {
  try {
    const assessorId = req.params.assessorId;
    const db = await initCouchDB();
    
    // Get submissions that need to be assessed or are assigned to this assessor
    const submissions = await db.getSubmissionsByStatus(['pending_review', 'in_progress']);
    const assessorSubmissions = submissions.filter(sub => 
      sub.assignedTo === assessorId || 
      ['pending_review', 'in_progress'].includes(sub.status)
    );
    
    res.json({
      success: true,
      data: assessorSubmissions,
      total: assessorSubmissions.length
    });
  } catch (error) {
    console.error('Error fetching submissions for assessor:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions for assessor',
      error: error.message
    });
  }
});

// Start assessment (Asesor)
router.post('/asesor/:assessorId/assess/:submissionId', async (req, res) => {
  try {
    const { assessorId, submissionId } = req.params;
    const db = await initCouchDB();
    
    const submission = await db.getSubmission(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Create new assessment
    const assessmentId = 'assess-' + Date.now();
    const assessment = await db.createAssessment(assessmentId, {
      submissionId,
      assessorId,
      criteria: {},
      status: 'in_progress'
    });
    
    // Update submission status and assign to assessor
    const updatedSubmission = await db.updateSubmission(submissionId, {
      status: 'in_progress',
      assignedTo: assessorId,
      assessmentId
    });
    
    res.json({
      success: true,
      data: {
        submission: updatedSubmission,
        assessment: assessment
      },
      message: 'Assessment started'
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting assessment',
      error: error.message
    });
  }
});

// Update assessment scores (Asesor)
router.patch('/asesor/:assessorId/assess/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { criteria, overallScore } = req.body;
    const db = await initCouchDB();
    
    const assessment = await db.updateAssessment(assessmentId, {
      criteria,
      overallScore,
      updatedAt: new Date().toISOString()
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    // Update submission score if assessment has overallScore
    if (overallScore && assessment.submissionId) {
      await db.updateSubmission(assessment.submissionId, {
        currentScore: overallScore
      });
    }
    
    res.json({
      success: true,
      data: assessment,
      message: 'Assessment updated'
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating assessment',
      error: error.message
    });
  }
});

// Complete assessment (Asesor)
router.post('/asesor/:assessorId/complete/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status, finalComments } = req.body; // status: 'approved' or 'rejected'
    const db = await initCouchDB();
    
    const assessment = await db.updateAssessment(assessmentId, {
      status: 'completed',
      finalStatus: status,
      finalComments,
      completedAt: new Date().toISOString()
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    // Update submission status
    const submission = await db.updateSubmission(assessment.submissionId, {
      status: status
    });
    
    res.json({
      success: true,
      data: {
        assessment,
        submission
      },
      message: `Assessment completed with status: ${status}`
    });
  } catch (error) {
    console.error('Error completing assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing assessment',
      error: error.message
    });
  }
});

// Get assessment details
router.get('/assessment/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const db = await initCouchDB();
    
    const assessment = await db.getAssessment(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    const submission = await db.getSubmission(assessment.submissionId);
    
    res.json({
      success: true,
      data: {
        assessment,
        submission
      }
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment',
      error: error.message
    });
  }
});

// Get submission statistics
router.get('/stats/:userId/:role', async (req, res) => {
  try {
    const { userId, role } = req.params;
    const db = await initCouchDB();
    
    let stats = {};
    
    if (role === 'upps') {
      const userSubs = await db.getSubmissionsByUser(userId);
      stats = {
        total: userSubs.length,
        draft: userSubs.filter(s => s.status === 'draft').length,
        pending_review: userSubs.filter(s => s.status === 'pending_review').length,
        in_progress: userSubs.filter(s => s.status === 'in_progress').length,
        approved: userSubs.filter(s => s.status === 'approved').length,
        rejected: userSubs.filter(s => s.status === 'rejected').length
      };
    } else if (role === 'asesor') {
      const allSubmissions = await db.getAllSubmissions();
      const assessorSubs = allSubmissions.filter(sub => sub.assignedTo === userId);
      const pendingReviews = allSubmissions.filter(s => s.status === 'pending_review');
      
      stats = {
        pending_review: pendingReviews.length,
        in_progress: assessorSubs.filter(s => s.status === 'in_progress').length,
        completed: assessorSubs.filter(s => ['approved', 'rejected'].includes(s.status)).length,
        avg_score: assessorSubs.filter(s => s.currentScore).reduce((acc, s) => acc + s.currentScore, 0) / 
                  Math.max(assessorSubs.filter(s => s.currentScore).length, 1)
      };
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;