/**
 * Sekretariat Controller
 * Handles sekretariat-specific operations
 */

const logger = require('../utils/logger');
const notificationController = require('./notificationController');

/**
 * Get all submissions for verification
 * GET /api/v1/sekretariat/submissions
 */
exports.getSubmissions = async (req, res) => {
  try {
    // TODO: Fetch from blockchain/database
    const submissions = [
      {
        submissionId: 'SUB_001',
        programStudi: 'Teknik Informatika',
        institusi: 'Universitas Indonesia',
        jenjang: 'S1',
        status: 'pending',
        createdAt: new Date().toISOString(),
        assignedAssessors: null,
        uppsUsername: 'upps_ui'
      },
      {
        submissionId: 'SUB_002',
        programStudi: 'Teknik Elektro',
        institusi: 'Institut Teknologi Bandung',
        jenjang: 'S1',
        status: 'under_review',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        assignedAssessors: null,
        uppsUsername: 'upps_itb'
      }
    ];

    logger.info(`Retrieved ${submissions.length} submissions for sekretariat`);
    res.json(submissions);
  } catch (error) {
    logger.error('Error getting submissions:', error);
    res.status(500).json({
      error: 'Failed to retrieve submissions',
      message: error.message
    });
  }
};

/**
 * Verify submission
 * POST /api/v1/sekretariat/verify/:submissionId
 */
exports.verifySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { decision, notes } = req.body;

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // TODO: Update blockchain
    const result = {
      submissionId,
      decision,
      notes,
      decidedBy: req.user.username,
      decidedAt: new Date().toISOString()
    };

    // Create notification for UPPS
    notificationController.createNotification(
      'upps_ui', // TODO: Get actual UPPS username
      decision === 'approve' ? 'Submission Disetujui' : 'Submission Ditolak',
      decision === 'approve'
        ? `Submission ${submissionId} telah disetujui`
        : `Submission ${submissionId} ditolak: ${notes}`,
      decision === 'approve' ? 'success' : 'error'
    );

    logger.info(`Submission ${submissionId} ${decision}d by ${req.user.username}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error verifying submission:', error);
    res.status(500).json({
      error: 'Failed to verify submission',
      message: error.message
    });
  }
};

/**
 * Get all UPPS
 * GET /api/v1/sekretariat/upps
 */
exports.getUPPS = async (req, res) => {
  try {
    // TODO: Fetch from database
    const upps = [
      {
        username: 'upps_ui',
        fullName: 'UPPS Universitas Indonesia',
        institution: 'Universitas Indonesia',
        email: 'upps@ui.ac.id',
        phone: '+6221786000',
        totalSubmissions: 5
      },
      {
        username: 'upps_itb',
        fullName: 'UPPS Institut Teknologi Bandung',
        institution: 'Institut Teknologi Bandung',
        email: 'upps@itb.ac.id',
        phone: '+6222250000',
        totalSubmissions: 3
      },
      {
        username: 'upps_ugm',
        fullName: 'UPPS Universitas Gadjah Mada',
        institution: 'Universitas Gadjah Mada',
        email: 'upps@ugm.ac.id',
        phone: '+6274588000',
        totalSubmissions: 4
      }
    ];

    logger.info(`Retrieved ${upps.length} UPPS`);
    res.json(upps);
  } catch (error) {
    logger.error('Error getting UPPS:', error);
    res.status(500).json({
      error: 'Failed to retrieve UPPS',
      message: error.message
    });
  }
};

/**
 * Get all payments
 * GET /api/v1/sekretariat/payments
 */
exports.getPayments = async (req, res) => {
  try {
    // TODO: Fetch from database
    const payments = [
      {
        id: 'pay_001',
        submissionId: 'SUB_001',
        uppsName: 'UPPS UI',
        amount: 5000000,
        status: 'pending',
        proofUrl: 'https://ipfs.io/ipfs/QmExample1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pay_002',
        submissionId: 'SUB_002',
        uppsName: 'UPPS ITB',
        amount: 5000000,
        status: 'verified',
        proofUrl: 'https://ipfs.io/ipfs/QmExample2',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    logger.info(`Retrieved ${payments.length} payments`);
    res.json(payments);
  } catch (error) {
    logger.error('Error getting payments:', error);
    res.status(500).json({
      error: 'Failed to retrieve payments',
      message: error.message
    });
  }
};

/**
 * Verify payment
 * POST /api/v1/sekretariat/payments/:id/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // TODO: Update database
    const result = {
      paymentId: id,
      decision,
      verifiedBy: req.user.username,
      verifiedAt: new Date().toISOString()
    };

    logger.info(`Payment ${id} ${decision}d by ${req.user.username}`);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
};

/**
 * Get reports/statistics
 * GET /api/v1/sekretariat/reports
 */
exports.getReports = async (req, res) => {
  try {
    const { range = 'month' } = req.query;

    // TODO: Calculate from database
    const statistics = {
      totalSubmissions: 50,
      pending: 10,
      approved: 35,
      rejected: 5,
      totalUPPS: 20,
      totalPayments: 225000000,
      range
    };

    logger.info(`Retrieved statistics for range: ${range}`);
    res.json(statistics);
  } catch (error) {
    logger.error('Error getting reports:', error);
    res.status(500).json({
      error: 'Failed to retrieve reports',
      message: error.message
    });
  }
};

/**
 * Download report
 * GET /api/v1/sekretariat/reports/download
 */
exports.downloadReport = async (req, res) => {
  try {
    const { type, range } = req.query;

    // TODO: Generate actual PDF report
    logger.info(`Report download requested: type=${type}, range=${range}`);

    res.json({
      message: 'Report generation coming soon',
      type,
      range
    });
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      error: 'Failed to download report',
      message: error.message
    });
  }
};
