/**
 * Sekretariat Routes
 * Includes payment management (invoice creation, verification)
 * and UPPS payment endpoints (view invoices, upload proof)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sekretariatController = require('../controllers/sekretariatController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Configure multer for payment proof uploads
const uploadsDir = path.join(__dirname, '../../uploads/payments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau PDF.'));
    }
  }
});

// ==========================================
// SEKRETARIAT ENDPOINTS
// ==========================================

// Get all submissions for verification
router.get('/submissions', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getSubmissions);

// Verify submission
router.post('/verify/:submissionId', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.verifySubmission);

// Get all UPPS
router.get('/upps', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getUPPS);

// Create/Issue invoice (tagihan)
router.post('/payments/invoice', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.createInvoice);

// Get all payments (sekretariat view)
router.get('/payments', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getPayments);

// Verify payment
router.post('/payments/:id/verify', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.verifyPayment);

// Get reports/statistics
router.get('/reports', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.getReports);

// Download report
router.get('/reports/download', authenticate, authorize(['sekretariat', 'admin']), sekretariatController.downloadReport);

// ==========================================
// UPPS PAYMENT ENDPOINTS
// ==========================================

// UPPS: Get my payments/invoices
router.get('/payments/my', authenticate, authorize(['upps', 'admin']), sekretariatController.getMyPayments);

// UPPS: Upload payment proof
router.post('/payments/:id/upload-proof', authenticate, authorize(['upps', 'admin']), upload.single('proof_file'), sekretariatController.uploadPaymentProof);

// UPPS: Check payment verification status (gate for document upload)
router.get('/payments/check-status', authenticate, authorize(['upps', 'admin']), sekretariatController.checkPaymentStatus);

module.exports = router;
