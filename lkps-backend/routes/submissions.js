const express = require('express');
const router = express.Router();

// Mock data untuk submissions
let submissions = [
  {
    id: 'sub-1',
    documentType: 'LKPS',
    namaUniversitas: 'Universitas Indonesia',
    namaProgram: 'Teknik Informatika',
    fileName: 'LKPS_TI_2024.xlsx',
    submittedDate: '2024-09-20',
    submittedBy: 'upps1',
    status: 'pending_review',
    maxScore: 4,
    assignedTo: 'asesor1',
    version: 1,
    fileData: null // In production, this would reference file storage
  },
  {
    id: 'sub-2',
    documentType: 'LED',
    namaUniversitas: 'Institut Teknologi Bandung',
    namaProgram: 'Sistem Informasi',
    fileName: 'LED_SI_2024.xlsx',
    submittedDate: '2024-09-22',
    submittedBy: 'upps2',
    status: 'in_progress',
    maxScore: 4,
    currentScore: 3.2,
    assignedTo: 'asesor1',
    assessmentId: 'assess-1',
    version: 1
  }
];

let assessments = [
  {
    id: 'assess-1',
    submissionId: 'sub-2',
    assessorId: 'asesor1',
    criteria: {
      'visi-misi': {
        components: [
          { id: 'vm-1', score: 3, notes: 'Visi misi cukup jelas namun perlu diperkuat keterlibatan stakeholder' },
          { id: 'vm-2', score: 4, notes: 'Tujuan sangat selaras dengan visi misi' },
          { id: 'vm-3', score: 3, notes: 'Sasaran spesifik dan terukur' }
        ]
      },
      'tata-pamong': {
        components: [
          { id: 'tp-1', score: 3, notes: 'Struktur organisasi lengkap' },
          { id: 'tp-2', score: 3, notes: 'Kepemimpinan efektif' },
          { id: 'tp-3', score: 4, notes: 'Sistem pengelolaan sangat baik' }
        ]
      }
    },
    overallScore: 3.2,
    status: 'in_progress',
    createdAt: '2024-09-22',
    updatedAt: '2024-09-25'
  }
];

// Get all submissions for UPPS (filtered by user)
router.get('/upps/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const userSubmissions = submissions.filter(sub => sub.submittedBy === userId);
    
    res.json({
      success: true,
      data: userSubmissions,
      total: userSubmissions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions',
      error: error.message
    });
  }
});

// Create new submission (UPPS)
router.post('/upps/:userId/submit', (req, res) => {
  try {
    const userId = req.params.userId;
    const { documentType, namaUniversitas, namaProgram, fileName, fileData } = req.body;
    
    const newSubmission = {
      id: 'sub-' + Date.now(),
      documentType,
      namaUniversitas,
      namaProgram,
      fileName,
      submittedDate: new Date().toISOString().split('T')[0],
      submittedBy: userId,
      status: 'draft',
      maxScore: 4,
      version: 1,
      fileData // In production, store file reference
    };
    
    submissions.push(newSubmission);
    
    res.json({
      success: true,
      data: newSubmission,
      message: 'Submission created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating submission',
      error: error.message
    });
  }
});

// Submit document for review (UPPS)
router.patch('/upps/:userId/submit/:submissionId', (req, res) => {
  try {
    const { submissionId } = req.params;
    const submissionIndex = submissions.findIndex(sub => sub.id === submissionId);
    
    if (submissionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    submissions[submissionIndex] = {
      ...submissions[submissionIndex],
      status: 'pending_review',
      submittedDate: new Date().toISOString().split('T')[0]
    };
    
    res.json({
      success: true,
      data: submissions[submissionIndex],
      message: 'Document submitted for review'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting document',
      error: error.message
    });
  }
});

// Get all submissions for Asesor
router.get('/asesor/:assessorId', (req, res) => {
  try {
    const assessorId = req.params.assessorId;
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
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions for assessor',
      error: error.message
    });
  }
});

// Start assessment (Asesor)
router.post('/asesor/:assessorId/assess/:submissionId', (req, res) => {
  try {
    const { assessorId, submissionId } = req.params;
    
    const submissionIndex = submissions.findIndex(sub => sub.id === submissionId);
    if (submissionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Create new assessment
    const assessmentId = 'assess-' + Date.now();
    const newAssessment = {
      id: assessmentId,
      submissionId,
      assessorId,
      criteria: {},
      status: 'in_progress',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    assessments.push(newAssessment);
    
    // Update submission status
    submissions[submissionIndex] = {
      ...submissions[submissionIndex],
      status: 'in_progress',
      assignedTo: assessorId,
      assessmentId
    };
    
    res.json({
      success: true,
      data: {
        submission: submissions[submissionIndex],
        assessment: newAssessment
      },
      message: 'Assessment started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting assessment',
      error: error.message
    });
  }
});

// Update assessment scores (Asesor)
router.patch('/asesor/:assessorId/assess/:assessmentId', (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { criteria, overallScore } = req.body;
    
    const assessmentIndex = assessments.findIndex(assess => assess.id === assessmentId);
    if (assessmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    assessments[assessmentIndex] = {
      ...assessments[assessmentIndex],
      criteria,
      overallScore,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    // Update submission score
    const submissionIndex = submissions.findIndex(sub => sub.assessmentId === assessmentId);
    if (submissionIndex !== -1) {
      submissions[submissionIndex].currentScore = overallScore;
    }
    
    res.json({
      success: true,
      data: assessments[assessmentIndex],
      message: 'Assessment updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating assessment',
      error: error.message
    });
  }
});

// Complete assessment (Asesor)
router.post('/asesor/:assessorId/complete/:assessmentId', (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status, finalComments } = req.body; // status: 'approved' or 'rejected'
    
    const assessmentIndex = assessments.findIndex(assess => assess.id === assessmentId);
    if (assessmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    assessments[assessmentIndex] = {
      ...assessments[assessmentIndex],
      status: 'completed',
      finalStatus: status,
      finalComments,
      completedAt: new Date().toISOString().split('T')[0]
    };
    
    // Update submission status
    const submissionIndex = submissions.findIndex(sub => sub.assessmentId === assessmentId);
    if (submissionIndex !== -1) {
      submissions[submissionIndex].status = status;
    }
    
    res.json({
      success: true,
      data: {
        assessment: assessments[assessmentIndex],
        submission: submissions[submissionIndex]
      },
      message: `Assessment completed with status: ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing assessment',
      error: error.message
    });
  }
});

// Get assessment details
router.get('/assessment/:assessmentId', (req, res) => {
  try {
    const { assessmentId } = req.params;
    const assessment = assessments.find(assess => assess.id === assessmentId);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    const submission = submissions.find(sub => sub.assessmentId === assessmentId);
    
    res.json({
      success: true,
      data: {
        assessment,
        submission
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment',
      error: error.message
    });
  }
});

// Get submission statistics
router.get('/stats/:userId/:role', (req, res) => {
  try {
    const { userId, role } = req.params;
    
    let stats = {};
    
    if (role === 'upps') {
      const userSubs = submissions.filter(sub => sub.submittedBy === userId);
      stats = {
        total: userSubs.length,
        draft: userSubs.filter(s => s.status === 'draft').length,
        pending_review: userSubs.filter(s => s.status === 'pending_review').length,
        in_progress: userSubs.filter(s => s.status === 'in_progress').length,
        approved: userSubs.filter(s => s.status === 'approved').length,
        rejected: userSubs.filter(s => s.status === 'rejected').length
      };
    } else if (role === 'asesor') {
      const assessorSubs = submissions.filter(sub => sub.assignedTo === userId);
      stats = {
        pending_review: submissions.filter(s => s.status === 'pending_review').length,
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
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;