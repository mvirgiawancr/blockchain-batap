const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sekretariatRegistrationController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticate, authorize('sekretariat'));

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.detail));
router.post('/:id/approve', asyncHandler(ctrl.approve));
router.post('/:id/reject', asyncHandler(ctrl.reject));

module.exports = router;
