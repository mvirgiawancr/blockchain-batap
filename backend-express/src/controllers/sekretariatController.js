/**
 * Sekretariat Controller
 * Handles sekretariat-specific operations including payment management
 */
const logger = require('../utils/logger');
const notificationController = require('./notificationController');
const db = require('../config/database');
const fs = require('fs');
const pinataService = require('../services/pinataService');

let inMemoryPayments = [];

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
    // Try to fetch from database first
    let upps = [];
    try {
      const result = await db.query(
        `SELECT id, username, name AS "fullName", institution, program_studi, phone 
         FROM users WHERE role = 'upps' AND is_active = true ORDER BY name`
      );
      upps = result.rows.map(u => ({
        ...u,
        email: `${u.username}@university.ac.id`,
        totalSubmissions: 0
      }));
    } catch (dbErr) {
      // Fallback to static data (all known UPPS users)
      upps = [
        {
          id: 'upps_tip',
          username: 'upps_tip',
          fullName: 'UPPS TIP IPB',
          institution: 'Institut Pertanian Bogor',
          program_studi: 'Teknik Industri Pertanian',
          email: 'upps_tip@ipb.ac.id',
          phone: '+62251625000',
          totalSubmissions: 3
        },
        {
          id: 'upps_ti',
          username: 'upps_ti',
          fullName: 'UPPS Teknik Informatika UI',
          institution: 'Universitas Indonesia',
          program_studi: 'Teknik Informatika',
          email: 'upps_ti@ui.ac.id',
          phone: '+6221786000',
          totalSubmissions: 2
        },
        {
          id: 'upps_te',
          username: 'upps_te',
          fullName: 'UPPS Teknik Elektro ITB',
          institution: 'Institut Teknologi Bandung',
          program_studi: 'Teknik Elektro',
          email: 'upps_te@itb.ac.id',
          phone: '+6222250000',
          totalSubmissions: 1
        }
      ];
    }

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
 * Create/Issue Invoice (Tagihan) - Sekretariat menerbitkan tagihan
 * POST /api/v1/sekretariat/payments/invoice
 */
exports.createInvoice = async (req, res) => {
  try {
    const { submissionId, uppsUserId, uppsName, institution, programStudi, amount, description, dueDate } = req.body;

    if (!uppsUserId || !amount) {
      return res.status(400).json({ error: 'uppsUserId dan amount wajib diisi' });
    }

    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const invoiceNumber = `INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    // Resolve uppsUserId: if it's a username (not UUID) or unknown, look up the actual UUID
    let resolvedUppsUserId = uppsUserId;
    let resolvedUppsUsername = uppsUserId; // store username for fallback matching
    try {
      // Check if uppsUserId looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uppsUserId) || uppsUserId === 'unknown') {
        // Look up by username first
        let userLookup = await db.query(
          'SELECT id, username FROM users WHERE username = $1',
          [uppsUserId]
        );
        
        // If not found, try to look up by institution
        if (userLookup.rows.length === 0 && institution) {
          userLookup = await db.query(
            "SELECT id, username FROM users WHERE role = 'upps' AND LOWER(institution) = LOWER($1)",
            [institution]
          );
        }
        
        if (userLookup.rows.length > 0) {
          resolvedUppsUserId = userLookup.rows[0].id;
          resolvedUppsUsername = userLookup.rows[0].username;
          logger.info(`Resolved UPPS to UUID: ${resolvedUppsUserId} (${resolvedUppsUsername})`);
        }
      } else {
        // It's a UUID, look up username for fallback matching
        const userLookup = await db.query(
          'SELECT id, username FROM users WHERE id = $1',
          [uppsUserId]
        );
        if (userLookup.rows.length > 0) {
          resolvedUppsUsername = userLookup.rows[0].username;
        }
      }
    } catch (lookupErr) {
      logger.warn('Could not resolve UPPS user ID:', lookupErr.message);
    }

    try {
      const dbUppsUserId = (resolvedUppsUserId === 'unknown' || resolvedUppsUserId === '') ? null : resolvedUppsUserId;
      const result = await db.query(
        `INSERT INTO accreditation_payments 
         (payment_id, submission_id, upps_user_id, upps_name, institution, program_studi, invoice_number, amount, description, due_date, invoiced_by, invoiced_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 'invoiced')
         RETURNING *`,
        [paymentId, submissionId || null, dbUppsUserId, uppsName, institution, programStudi, invoiceNumber, amount, description || 'Biaya Akreditasi LAM-TEK 2025', dueDate || null, req.user.id]
      );

      // Also store in inMemoryPayments (with username for cross-reference)
      const dbPayment = result.rows[0];
      const memPayment = {
        id: dbPayment.payment_id,
        paymentId: dbPayment.payment_id,
        submissionId: dbPayment.submission_id,
        submission_id: dbPayment.submission_id,
        upps_user_id: resolvedUppsUsername, // store username for easy matching
        uppsUserId: resolvedUppsUsername,
        uppsName: dbPayment.upps_name,
        institution: dbPayment.institution,
        programStudi: dbPayment.program_studi,
        invoiceNumber: dbPayment.invoice_number,
        amount: Number(dbPayment.amount),
        description: dbPayment.description,
        status: dbPayment.status,
        createdAt: dbPayment.created_at
      };
      inMemoryPayments.unshift(memPayment);

      // Send notification to UPPS
      try {
        notificationController.createNotification(
          resolvedUppsUsername,
          'Tagihan Akreditasi Diterbitkan',
          `Tagihan akreditasi senilai Rp ${Number(amount).toLocaleString('id-ID')} telah diterbitkan. Nomor Invoice: ${invoiceNumber}. Silakan lakukan pembayaran dan unggah bukti transfer.`,
          'info'
        );
      } catch (notifErr) {
        logger.warn('Failed to send notification:', notifErr.message);
      }

      logger.info(`Invoice ${invoiceNumber} created by ${req.user.username} for UPPS ${uppsName} (UUID: ${resolvedUppsUserId})`);
      res.status(201).json({ success: true, payment: result.rows[0] });
    } catch (dbErr) {
      logger.warn(`DB insert failed (${dbErr.message}), using in-memory fallback`);
      // Fallback: store in inMemoryPayments with username for matching
      const mockPayment = {
        id: paymentId,
        paymentId: paymentId,
        submissionId: submissionId || null,
        submission_id: submissionId || null,
        upps_user_id: resolvedUppsUsername,
        uppsUserId: resolvedUppsUsername,
        uppsName: uppsName,
        upps_name: uppsName,
        institution,
        programStudi: programStudi,
        program_studi: programStudi,
        invoiceNumber: invoiceNumber,
        invoice_number: invoiceNumber,
        amount: Number(amount),
        description: description || 'Biaya Akreditasi LAM-TEK 2025',
        dueDate: dueDate,
        due_date: dueDate,
        status: 'invoiced',
        invoicedAt: new Date().toISOString(),
        invoiced_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      inMemoryPayments.unshift(mockPayment);
      logger.info(`Invoice ${invoiceNumber} created (in-memory fallback) by ${req.user.username} for UPPS ${resolvedUppsUsername}`);
      res.status(201).json({ success: true, payment: mockPayment });
    }
  } catch (error) {
    logger.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice', message: error.message });
  }
};

/**
 * Get all payments (for Sekretariat view)
 * GET /api/v1/sekretariat/payments
 */
exports.getPayments = async (req, res) => {
  try {
    let dbPayments = [];
    try {
      const result = await db.query(
        `SELECT ap.*, u.name as invoiced_by_name
         FROM accreditation_payments ap
         LEFT JOIN users u ON ap.invoiced_by = u.id
         ORDER BY ap.created_at DESC`
      );
      dbPayments = result.rows.map(p => ({
        id: p.payment_id,
        paymentId: p.payment_id,
        submissionId: p.submission_id,
        uppsName: p.upps_name,
        institution: p.institution,
        programStudi: p.program_studi,
        invoiceNumber: p.invoice_number,
        amount: Number(p.amount),
        description: p.description,
        dueDate: p.due_date,
        status: p.status,
        proofUrl: p.proof_url,
        proofFilename: p.proof_filename,
        paymentMethod: p.payment_method,
        paidAt: p.paid_at,
        rejectionReason: p.rejection_reason,
        invoicedAt: p.invoiced_at,
        verifiedAt: p.verified_at,
        createdAt: p.created_at
      }));
    } catch (dbErr) {
      logger.warn('DB query failed for getPayments, using in-memory only:', dbErr.message);
    }

    // Always merge in-memory payments not already persisted to DB
    const dbPaymentIds = new Set(dbPayments.map(p => p.paymentId || p.id));
    const uniqueMemPayments = inMemoryPayments.filter(p => !dbPaymentIds.has(p.paymentId || p.id));
    const payments = [...dbPayments, ...uniqueMemPayments].sort(
      (a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
    );

    logger.info(`Retrieved ${payments.length} payments (${dbPayments.length} DB + ${uniqueMemPayments.length} in-memory)`);
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
    const { decision, rejectionReason } = req.body;

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const newStatus = decision === 'approve' ? 'verified' : 'rejected';

    try {
      const result = await db.query(
        `UPDATE accreditation_payments 
         SET status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, rejection_reason = $3
         WHERE payment_id = $4
         RETURNING *`,
        [newStatus, req.user.id, decision === 'reject' ? rejectionReason : null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const payment = result.rows[0];

      // Notify UPPS
      try {
        notificationController.createNotification(
          payment.upps_user_id,
          decision === 'approve' ? 'Pembayaran Terverifikasi' : 'Pembayaran Ditolak',
          decision === 'approve'
            ? `Pembayaran Anda (${payment.invoice_number}) telah diverifikasi. Anda sekarang dapat mengunggah dokumen LED dan LKPS.`
            : `Pembayaran Anda (${payment.invoice_number}) ditolak. Alasan: ${rejectionReason || '-'}. Silakan unggah ulang bukti pembayaran.`,
          decision === 'approve' ? 'success' : 'error'
        );
      } catch (notifErr) {
        logger.warn('Failed to send notification:', notifErr.message);
      }

      logger.info(`Payment ${id} ${decision}d by ${req.user.username}`);
      res.json({ success: true, result: { paymentId: id, decision, status: newStatus } });
    } catch (dbErr) {
      // Fallback
      const paymentIndex = inMemoryPayments.findIndex(p => p.id === id || p.paymentId === id);
      if (paymentIndex !== -1) {
        inMemoryPayments[paymentIndex].status = newStatus;
        if (decision === 'reject') {
          inMemoryPayments[paymentIndex].rejectionReason = rejectionReason;
          inMemoryPayments[paymentIndex].rejection_reason = rejectionReason;
        }
      }
      const result = {
        paymentId: id,
        decision,
        status: newStatus,
        verifiedBy: req.user.username,
        verifiedAt: new Date().toISOString()
      };
      logger.info(`Payment ${id} ${decision}d by ${req.user.username} (mock in-memory)`);
      res.json({ success: true, result });
    }
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

    let totalSubmissions = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalUPPS = 0;
    let totalPayments = 0;

    try {
      const fabricService = require('../services/fabricService');
      const subs = await fabricService.getAllSubmissions();
      totalSubmissions = subs.length;
      pending = subs.filter(s => s.status === 'under_review' || s.status === 'pending').length;
      approved = subs.filter(s => s.status === 'approved').length;
      rejected = subs.filter(s => s.status === 'rejected').length;
    } catch (e) {
      logger.error('Error fetching submissions for reports:', e);
    }

    try {
      const uppsRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'upps'");
      totalUPPS = parseInt(uppsRes.rows[0]?.count || 0);
    } catch (e) {
      logger.error('Error fetching UPPS count:', e);
    }

    try {
      const payRes = await db.query("SELECT SUM(amount) FROM accreditation_payments WHERE status = 'verified'");
      totalPayments = parseFloat(payRes.rows[0]?.sum || 0);
    } catch (e) {
      logger.error('Error fetching payments sum:', e);
    }

    const statistics = {
      totalSubmissions,
      pending,
      approved,
      rejected,
      totalUPPS,
      totalPayments,
      range
    };

    logger.info(`Retrieved live statistics for range: ${range}`);
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

/**
 * UPPS: Get my payments (invoices and their status)
 * GET /api/v1/sekretariat/payments/my
 */
exports.getMyPayments = async (req, res) => {
  try {
    let dbPayments = [];
    let dbSuccess = false;

    try {
      const result = await db.query(
        `SELECT * FROM accreditation_payments 
         WHERE upps_user_id = $1 OR (upps_user_id IS NULL AND LOWER(institution) = LOWER($2))
         ORDER BY created_at DESC`,
        [req.user.id, req.user.institution]
      );
      dbPayments = result.rows.map(p => ({
        id: p.payment_id,
        paymentId: p.payment_id,
        submissionId: p.submission_id,
        submission_id: p.submission_id,
        invoiceNumber: p.invoice_number,
        amount: Number(p.amount),
        description: p.description,
        dueDate: p.due_date,
        status: p.status,
        proofUrl: p.proof_url,
        proofFilename: p.proof_filename,
        paymentMethod: p.payment_method,
        paidAt: p.paid_at,
        rejectionReason: p.rejection_reason,
        invoicedAt: p.invoiced_at,
        verifiedAt: p.verified_at,
        createdAt: p.created_at
      }));
      dbSuccess = true;
    } catch (dbErr) {
      logger.warn('DB query failed for getMyPayments, using in-memory only:', dbErr.message);
    }

    // Always also include matching inMemoryPayments (for invoices just issued this session)
    const userId = (req.user?.id || '').toString().toLowerCase();
    const username = (req.user?.username || '').toString().toLowerCase();
    const userInst = (req.user?.institution || '').toString().toLowerCase();
    const memPayments = inMemoryPayments.filter(p => {
      const paymentUppsUserId = (p.upps_user_id || p.uppsUserId || '').toString().toLowerCase();
      const paymentInst = (p.institution || '').toString().toLowerCase();
      
      const isDirectMatch = (userId && paymentUppsUserId === userId) || (username && paymentUppsUserId === username);
      const isFallbackMatch = (paymentUppsUserId === 'unknown' || paymentUppsUserId === '') && userInst && paymentInst && (userInst.includes(paymentInst) || paymentInst.includes(userInst));
      
      return isDirectMatch || isFallbackMatch;
    });

    // Merge: DB payments take priority, add in-memory ones not in DB
    const dbPaymentIds = new Set(dbPayments.map(p => p.paymentId || p.id));
    const uniqueMemPayments = memPayments.filter(p => !dbPaymentIds.has(p.paymentId || p.id));
    const payments = [...dbPayments, ...uniqueMemPayments].sort(
      (a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
    );

    logger.info(`getMyPayments for ${username}: ${dbPayments.length} from DB + ${uniqueMemPayments.length} from memory = ${payments.length} total`);
    res.json(payments);
  } catch (error) {
    logger.error('Error getting my payments:', error);
    res.status(500).json({ error: 'Failed to retrieve payments', message: error.message });
  }
};

/**
 * UPPS: Upload payment proof
 * POST /api/v1/sekretariat/payments/:id/upload-proof
 */
exports.uploadPaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    // Handle file upload (multer will add req.file)
    const proofFile = req.file;
    if (!proofFile) {
      return res.status(400).json({ error: 'Bukti pembayaran wajib diunggah' });
    }

    // Try to upload proof to IPFS with local fallback
    let proofUrl = `/uploads/payments/${proofFile.filename}`;
    try {
      if (pinataService.jwt) {
        const fileBuffer = fs.readFileSync(proofFile.path);
        const ipfsResult = await pinataService.uploadFile(
          fileBuffer,
          `payment-proof-${id}-${proofFile.originalname}`,
          {
            paymentId: id,
            uploadedBy: req.user.username,
            role: 'upps'
          }
        );
        proofUrl = ipfsResult.gateway_url;
        logger.info(`Payment proof successfully uploaded to IPFS: ${ipfsResult.cid}`);
      }
    } catch (ipfsErr) {
      logger.warn('Failed to upload proof to IPFS, falling back to local path:', ipfsErr.message);
    }

    try {
      const result = await db.query(
        `UPDATE accreditation_payments 
         SET status = 'submitted', 
             proof_filename = $1, 
             proof_url = $2,
             payment_method = $3, 
             paid_at = CURRENT_TIMESTAMP
         WHERE payment_id = $4 AND (upps_user_id = $5 OR upps_user_id IS NULL)
         RETURNING *`,
        [proofFile.originalname, proofUrl, paymentMethod || 'Transfer Bank', id, req.user.id]
      );

      if (result.rows.length === 0) {
        // Payment not in DB — try in-memory fallback before returning 404
        const paymentIndex = inMemoryPayments.findIndex(p => (p.id === id || p.paymentId === id));
        if (paymentIndex === -1) {
          return res.status(404).json({ error: 'Tagihan tidak ditemukan atau bukan milik Anda' });
        }
        inMemoryPayments[paymentIndex].status = 'submitted';
        inMemoryPayments[paymentIndex].proof_filename = proofFile.originalname;
        inMemoryPayments[paymentIndex].proofFilename = proofFile.originalname;
        inMemoryPayments[paymentIndex].proof_url = proofUrl;
        inMemoryPayments[paymentIndex].proofUrl = proofUrl;
        inMemoryPayments[paymentIndex].payment_method = paymentMethod || 'Transfer Bank';
        inMemoryPayments[paymentIndex].paymentMethod = paymentMethod || 'Transfer Bank';
        inMemoryPayments[paymentIndex].paid_at = new Date().toISOString();
        inMemoryPayments[paymentIndex].paidAt = new Date().toISOString();
        logger.info(`Payment proof uploaded for ${id} by ${req.user.username} (in-memory fallback)`);
        return res.json({ success: true, message: 'Bukti pembayaran berhasil diunggah' });
      }

      // Notify Sekretariat
      try {
        const sekretariatUsers = await db.query(`SELECT id FROM users WHERE role = 'sekretariat' AND is_active = true LIMIT 1`);
        if (sekretariatUsers.rows.length > 0) {
          notificationController.createNotification(
            sekretariatUsers.rows[0].id,
            'Bukti Pembayaran Diunggah',
            `UPPS ${result.rows[0].upps_name} telah mengunggah bukti pembayaran untuk invoice ${result.rows[0].invoice_number}. Silakan verifikasi.`,
            'info'
          );
        }
      } catch (notifErr) {
        logger.warn('Failed to send notification:', notifErr.message);
      }

      logger.info(`Payment proof uploaded for ${id} by ${req.user.username}`);
      res.json({ success: true, message: 'Bukti pembayaran berhasil diunggah' });
    } catch (dbErr) {
      // Fallback: update inside inMemoryPayments
      const paymentIndex = inMemoryPayments.findIndex(p => p.id === id || p.paymentId === id);
      if (paymentIndex !== -1) {
        inMemoryPayments[paymentIndex].status = 'submitted';
        inMemoryPayments[paymentIndex].proof_filename = proofFile.originalname;
        inMemoryPayments[paymentIndex].proof_url = proofUrl;
        inMemoryPayments[paymentIndex].proofUrl = proofUrl;
        inMemoryPayments[paymentIndex].payment_method = paymentMethod || 'Transfer Bank';
        inMemoryPayments[paymentIndex].paymentMethod = paymentMethod || 'Transfer Bank';
        inMemoryPayments[paymentIndex].paid_at = new Date().toISOString();
        inMemoryPayments[paymentIndex].paidAt = new Date().toISOString();
      }
      logger.info(`Payment proof uploaded for ${id} by ${req.user.username} (mock in-memory)`);
      res.json({ success: true, message: 'Bukti pembayaran berhasil diunggah' });
    }
  } catch (error) {
    logger.error('Error uploading payment proof:', error);
    res.status(500).json({ error: 'Failed to upload payment proof', message: error.message });
  }
};

/**
 * UPPS: Check if payment is verified (gate for document upload)
 * GET /api/v1/sekretariat/payments/check-status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const userId = (req.user?.id || '').toString().toLowerCase();
    const username = (req.user?.username || '').toString().toLowerCase();

    let dbVerified = null;
    let dbPending = null;

    try {
      const verifiedRes = await db.query(
        `SELECT * FROM accreditation_payments 
         WHERE upps_user_id = $1 AND status = 'verified'
         ORDER BY verified_at DESC LIMIT 1`,
        [req.user.id]
      );
      if (verifiedRes.rows.length > 0) {
        dbVerified = verifiedRes.rows[0];
      } else {
        const pendingRes = await db.query(
          `SELECT * FROM accreditation_payments 
           WHERE upps_user_id = $1 AND status IN ('invoiced', 'submitted')
           ORDER BY created_at DESC LIMIT 1`,
          [req.user.id]
        );
        if (pendingRes.rows.length > 0) dbPending = pendingRes.rows[0];
      }
    } catch (dbErr) {
      logger.warn('DB query failed for checkPaymentStatus, checking memory:', dbErr.message);
    }

    // Also check inMemoryPayments
    const myMemPayments = inMemoryPayments.filter(p => {
      const paymentUppsUserId = (p.upps_user_id || p.uppsUserId || '').toString().toLowerCase();
      return (userId && paymentUppsUserId === userId) || (username && paymentUppsUserId === username);
    });

    const memVerified = myMemPayments
      .filter(p => p.status === 'verified')
      .sort((a, b) => new Date(b.verifiedAt || b.verified_at || b.createdAt) - new Date(a.verifiedAt || a.verified_at || a.createdAt))[0];

    const memPending = myMemPayments
      .filter(p => ['invoiced', 'submitted'].includes(p.status))
      .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))[0];

    // DB takes priority, memory is fallback
    if (dbVerified || memVerified) {
      res.json({ paymentVerified: true, payment: dbVerified || memVerified });
    } else {
      res.json({
        paymentVerified: false,
        pendingPayment: dbPending || memPending || null
      });
    }
  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status', message: error.message });
  }
};
