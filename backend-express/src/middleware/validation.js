/**
 * Request Validation Middleware using Joi
 * Validates request bodies, params, and query strings
 */

const Joi = require('joi');

/**
 * Validate request body against Joi schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate request params against Joi schema
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    req.params = value;
    next();
  };
};

/**
 * Validate request query against Joi schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    req.query = value;
    next();
  };
};

// ============================================
// VALIDATION SCHEMAS FOR LAM-TEK 2025
// ============================================

/**
 * Schema for submission upload
 */
const uploadSubmissionSchema = Joi.object({
  programStudi: Joi.string().required().min(3).max(200)
    .messages({
      'string.empty': 'Program Studi is required',
      'string.min': 'Program Studi must be at least 3 characters',
      'string.max': 'Program Studi must not exceed 200 characters'
    }),
  
  institusi: Joi.string().required().min(3).max(200)
    .messages({
      'string.empty': 'Institusi is required',
      'string.min': 'Institusi must be at least 3 characters',
      'string.max': 'Institusi must not exceed 200 characters'
    }),
  
  programType: Joi.string().valid('S1', 'S2', 'S3', 'D1', 'D2', 'D3', 'STr', 'MTr', 'DTr', 'Prof')
    .default('S1')
    .messages({
      'any.only': 'Program type must be one of: S1, S2, S3, D1, D2, D3, STr, MTr, DTr, Prof'
    }),
  
  submittedBy: Joi.string().optional().max(100),
  
  notes: Joi.string().optional().max(1000)
});

/**
 * Schema for submission ID param
 */
const submissionIdSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Invalid submission ID format. Must be a valid UUID',
      'any.required': 'Submission ID is required'
    })
});

/**
 * Schema for query submissions
 */
const querySubmissionsSchema = Joi.object({
  programStudi: Joi.string().optional(),
  institusi: Joi.string().optional(),
  programType: Joi.string().valid('S1', 'S2', 'S3', 'D1', 'D2', 'D3', 'STr', 'MTr', 'DTr', 'Prof').optional(),
  status: Joi.string().valid('uploaded', 'processing', 'completed', 'failed', 'under_review', 'approved', 'rejected').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

/**
 * Schema for scoring request
 */
const scoringRequestSchema = Joi.object({
  submissionId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Invalid submission ID format',
      'any.required': 'Submission ID is required'
    }),

  programType: Joi.string().valid('S1', 'S2', 'S3', 'D1', 'D2', 'D3', 'STr', 'MTr', 'DTr', 'Prof')
    .default('S1')
});

/**
 * Schema for updating submission
 */
const updateSubmissionSchema = Joi.object({
  programStudi: Joi.string().min(3).max(200).optional(),
  institusi: Joi.string().min(3).max(200).optional(),
  programType: Joi.string().valid('S1', 'S2', 'S3', 'D1', 'D2', 'D3', 'STr', 'MTr', 'DTr', 'Prof').optional(),
  status: Joi.string().valid('uploaded', 'processing', 'completed', 'failed', 'under_review', 'approved', 'rejected').optional(),
  notes: Joi.string().max(1000).optional()
}).min(1);

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  
  // Export schemas
  schemas: {
    uploadSubmission: uploadSubmissionSchema,
    submissionId: submissionIdSchema,
    querySubmissions: querySubmissionsSchema,
    scoringRequest: scoringRequestSchema,
    updateSubmission: updateSubmissionSchema
  }
};
