const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/referenceController');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/institutions', asyncHandler(ctrl.listInstitutions));
router.get('/program-studi', asyncHandler(ctrl.listProgramStudi));
router.get('/jenjang', asyncHandler(ctrl.listJenjang));

module.exports = router;
