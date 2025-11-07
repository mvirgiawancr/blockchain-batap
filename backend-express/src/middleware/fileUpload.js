/**
 * File Upload Middleware using Multer
 * Handles LED and LKPS file uploads with validation
 */

const multer = require('multer');
const config = require('../config');

// Memory storage (files stored in buffer for processing)
const storage = multer.memoryStorage();

// File filter to validate document types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv'
  ];

  const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.csv'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: PDF, Excel (.xlsx, .xls), CSV. Got: ${file.mimetype}`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 2 // LED + LKPS
  }
});

/**
 * Middleware for uploading LED and LKPS files
 * Expected fields: led_file, lkps_file
 */
const uploadDocuments = upload.fields([
  { name: 'led_file', maxCount: 1 },
  { name: 'lkps_file', maxCount: 1 }
]);

/**
 * Middleware for uploading single file
 */
const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Error handler for multer errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `Maximum file size is ${config.upload.maxFileSize / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 2 files allowed (LED and LKPS)',
        code: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Only led_file and lkps_file fields are allowed',
        code: 'UNEXPECTED_FIELD'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  next(error);
};

/**
 * Validate uploaded files
 */
const validateDocuments = (req, res, next) => {
  if (!req.files || (!req.files.led_file && !req.files.lkps_file)) {
    return res.status(400).json({
      error: 'Missing files',
      message: 'At least one document (LED or LKPS) is required',
      code: 'MISSING_FILES'
    });
  }

  // Validate LED file if present
  if (req.files.led_file) {
    const ledFile = req.files.led_file[0];
    if (ledFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        error: 'Invalid LED format',
        message: 'LED file must be PDF format',
        code: 'INVALID_LED_FORMAT'
      });
    }
  }

  // Validate LKPS file if present
  if (req.files.lkps_file) {
    const lkpsFile = req.files.lkps_file[0];
    const validLkpsMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validLkpsMimeTypes.includes(lkpsFile.mimetype)) {
      return res.status(400).json({
        error: 'Invalid LKPS format',
        message: 'LKPS file must be Excel (.xlsx, .xls) or CSV format',
        code: 'INVALID_LKPS_FORMAT'
      });
    }
  }

  next();
};

module.exports = {
  uploadDocuments,
  uploadSingle,
  handleUploadError,
  validateDocuments
};
