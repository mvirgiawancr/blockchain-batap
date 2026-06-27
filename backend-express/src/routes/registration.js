const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/registrationController');
const { asyncHandler } = require('../middleware/errorHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Hanya PDF yang diizinkan.'));
    }
    cb(null, true);
  },
});

router.get('/check-username', asyncHandler(ctrl.checkUsername));
router.post(
  '/',
  upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'surat_pernyataan', maxCount: 1 },
  ]),
  asyncHandler(ctrl.submit),
);
router.post(
  '/:requestId/resubmit',
  upload.fields([
    { name: 'surat_permohonan', maxCount: 1 },
    { name: 'surat_pernyataan', maxCount: 1 },
  ]),
  asyncHandler(ctrl.resubmit),
);
router.get('/resubmit-data', asyncHandler(ctrl.getRequestByToken));

module.exports = router;
