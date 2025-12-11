const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

/**
 * @route   GET /api/v1/users
 * @desc    List users (optional filter by role)
 * @access  Private (Sekretariat/Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('sekretariat', 'admin'),
  userController.listUsers
);

module.exports = router;
