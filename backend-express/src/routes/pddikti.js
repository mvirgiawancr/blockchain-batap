const express = require('express');
const router = express.Router();
const pddiktiController = require('../controllers/pddiktiController');

/**
 * @route   GET /api/v1/pddikti/search/pt
 * @desc    Cari Perguruan Tinggi dari PDDikti (autocomplete pendaftaran)
 * @access  Public
 */
router.get('/search/pt', pddiktiController.searchPt);

/**
 * @route   GET /api/v1/pddikti/search/prodi
 * @desc    Cari Program Studi dari PDDikti (autocomplete pendaftaran)
 * @access  Public
 */
router.get('/search/prodi', pddiktiController.searchProdi);

module.exports = router;
