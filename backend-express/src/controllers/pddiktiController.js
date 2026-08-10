/**
 * PDDikti Controller
 * Proxy publik untuk pencarian Perguruan Tinggi & Program Studi dari PDDikti.
 * Dipakai untuk autocomplete saat UPPS mendaftar (frontend Register).
 */

const logger = require('../utils/logger');
const pddikti = require('../services/pddiktiService');

function parseLimit(raw, fallback = 10) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return Math.min(n, 25);
}

/**
 * GET /api/v1/pddikti/search/pt?keyword=...&limit=10
 */
exports.searchPt = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    if (keyword.length < 3) {
      return res.json({ success: true, data: [] });
    }
    const data = await pddikti.searchPt(keyword, parseLimit(req.query.limit));
    return res.json({ success: true, data });
  } catch (error) {
    logger.error(`[PDDikti] searchPt controller error: ${error.message}`);
    return res.status(502).json({ success: false, error: 'Gagal mengambil data PT dari PDDikti' });
  }
};

/**
 * GET /api/v1/pddikti/search/prodi?keyword=...&limit=10
 */
exports.searchProdi = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    if (keyword.length < 3) {
      return res.json({ success: true, data: [] });
    }
    const data = await pddikti.searchProdi(keyword, parseLimit(req.query.limit));
    return res.json({ success: true, data });
  } catch (error) {
    logger.error(`[PDDikti] searchProdi controller error: ${error.message}`);
    return res.status(502).json({ success: false, error: 'Gagal mengambil data Prodi dari PDDikti' });
  }
};

/**
 * GET /api/v1/pddikti/pt/prodi?idPt=...
 * Daftar Program Studi milik satu Perguruan Tinggi (untuk autocomplete prodi yang dependent).
 */
exports.prodiByPt = async (req, res) => {
  try {
    const idPt = (req.query.idPt || '').trim();
    if (!idPt) {
      return res.json({ success: true, data: [] });
    }
    const data = await pddikti.getProdiByPt(idPt);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error(`[PDDikti] prodiByPt controller error: ${error.message}`);
    return res.status(502).json({ success: false, error: 'Gagal mengambil data Prodi PT dari PDDikti' });
  }
};
