const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authController.register.bind(authController));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login.bind(authController));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

/**
 * @route   POST /api/v1/auth/msp
 * @desc    Store encrypted MSP credentials for current user
 * @access  Private (all roles)
 */
router.post(
  '/msp',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  authController.saveMspCredentials.bind(authController)
);

/**
 * @route   GET /api/v1/auth/msp
 * @desc    Get MSP credential status for current user
 * @access  Private (all roles)
 */
router.get(
  '/msp',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  authController.getMspStatus.bind(authController)
);

/**
 * @route   DELETE /api/v1/auth/msp
 * @desc    Delete stored MSP credentials
 * @access  Private (all roles)
 */
router.delete(
  '/msp',
  authenticate,
  authorize('upps', 'sekretariat', 'assessor', 'admin'),
  authController.deleteMspCredentials.bind(authController)
);

module.exports = router;
