/**
 * Utility Functions
 * Common helper functions used across the application
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique submission ID
 */
const generateSubmissionId = () => {
  return uuidv4();
};

/**
 * Calculate SHA-256 hash of buffer
 */
const calculateHash = (buffer) => {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
};

/**
 * Format file size in human-readable format
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Sanitize filename (remove special characters)
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
};

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Sleep/delay function
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Convert LAM-TEK criteria number to name
 */
const getCriteriaName = (criterionNum) => {
  const criteriaNames = {
    1: 'Diferensiasi Misi',
    2: 'Akuntabilitas',
    3: 'Relevansi Pendidikan, Penelitian, dan PkM',
    4: 'Sumber Daya Manusia',
    5: 'Sarana, Prasarana, dan K3L',
    6: 'Mahasiswa dan Luaran Mahasiswa',
    7: 'Sistem Penjaminan Mutu'
  };
  
  return criteriaNames[criterionNum] || `Kriteria ${criterionNum}`;
};

/**
 * Get program type display name
 */
const getProgramTypeName = (programType) => {
  const typeNames = {
    'S': 'Sarjana (S1)',
    'M': 'Magister (S2)',
    'D': 'Doktor (S3)',
    'D1': 'Diploma 1',
    'D2': 'Diploma 2',
    'D3': 'Diploma 3',
    'STr': 'Sarjana Terapan',
    'MTr': 'Magister Terapan',
    'DTr': 'Doktor Terapan',
    'PPI': 'Program Profesi/Internship'
  };
  
  return typeNames[programType] || programType;
};

/**
 * Format date to ISO string
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Round number to specified decimal places
 */
const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Clamp number between min and max
 */
const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Check if value is empty (null, undefined, empty string)
 */
const isEmpty = (value) => {
  return value === null || value === undefined || value === '';
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove null/undefined values from object
 */
const removeEmpty = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
};

/**
 * Generate random string
 */
const randomString = (length = 16) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Parse boolean from string
 */
const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

/**
 * Get error message from error object
 */
const getErrorMessage = (error) => {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  return error.message || 'An unknown error occurred';
};

/**
 * Create pagination metadata
 */
const createPaginationMeta = (total, limit, offset) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    limit,
    offset,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
};

/**
 * Retry async function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

module.exports = {
  generateSubmissionId,
  calculateHash,
  formatFileSize,
  sanitizeFilename,
  getFileExtension,
  isValidUUID,
  sleep,
  getCriteriaName,
  getProgramTypeName,
  formatDate,
  roundTo,
  clamp,
  isEmpty,
  deepClone,
  removeEmpty,
  randomString,
  parseBoolean,
  getErrorMessage,
  createPaginationMeta,
  retryWithBackoff
};
