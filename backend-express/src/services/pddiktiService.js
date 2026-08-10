/**
 * PDDikti Service
 * Mengambil data Perguruan Tinggi & Program Studi dari API publik PDDikti.
 * API ini tidak resmi (pihak ketiga) dan READ-ONLY — hanya membaca data publik PDDikti.
 * API Docs: https://pddikti.fastapicloud.dev/api/docs
 * Atribusi data: © PDDikti, API maintained by ridwaanhall / RoneAI.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const PDDIKTI_API = process.env.PDDIKTI_API_URL || 'https://pddikti.fastapicloud.dev/api';
const REQUEST_TIMEOUT_MS = 5000;

// Cache sederhana in-memory (hasil pencarian jarang berubah)
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
const cache = new Map(); // key -> { expires, data }

function getCache(key) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (hit) cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

// PDDikti banyak mengembalikan string dengan padding spasi → rapikan.
function clean(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Cari Perguruan Tinggi berdasarkan kata kunci.
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<Array<{id:string, kode:string, namaSingkat:string, nama:string}>>}
 */
async function searchPt(keyword, limit = 10) {
  const term = clean(keyword);
  if (!term || term.length < 3) return [];

  const cacheKey = `pt:${term.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const url = `${PDDIKTI_API}/search/pt/${encodeURIComponent(term)}/`;
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    const rows = Array.isArray(response.data) ? response.data : [];

    const result = rows.map(row => ({
      id: clean(row.id),
      kode: clean(row.kode),
      namaSingkat: clean(row.nama_singkat),
      nama: clean(row.nama),
    })).filter(r => r.nama);

    setCache(cacheKey, result);
    logger.info(`[PDDikti] searchPt "${term}" -> ${result.length} hasil`);
    return result.slice(0, limit);
  } catch (error) {
    logger.error(`[PDDikti] searchPt error untuk "${term}": ${error.message}`);
    return [];
  }
}

/**
 * Cari Program Studi berdasarkan kata kunci.
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<Array<{id:string, nama:string, jenjang:string, pt:string, ptSingkat:string}>>}
 */
async function searchProdi(keyword, limit = 10) {
  const term = clean(keyword);
  if (!term || term.length < 3) return [];

  const cacheKey = `prodi:${term.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached.slice(0, limit);

  try {
    const url = `${PDDIKTI_API}/search/prodi/${encodeURIComponent(term)}/`;
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    const rows = Array.isArray(response.data) ? response.data : [];

    const result = rows.map(row => ({
      id: clean(row.id),
      nama: clean(row.nama),
      jenjang: clean(row.jenjang),
      pt: clean(row.pt),
      ptSingkat: clean(row.pt_singkat),
    })).filter(r => r.nama);

    setCache(cacheKey, result);
    logger.info(`[PDDikti] searchProdi "${term}" -> ${result.length} hasil`);
    return result.slice(0, limit);
  } catch (error) {
    logger.error(`[PDDikti] searchProdi error untuk "${term}": ${error.message}`);
    return [];
  }
}

/**
 * Daftar kandidat tahun-semester (id_thsmt) terbaru, dari yang paling baru.
 * Format: YYYY + semester (1 = ganjil, 2 = genap).
 */
function termCandidates() {
  const y = new Date().getFullYear();
  return [`${y}1`, `${y - 1}2`, `${y - 1}1`, `${y - 2}2`, `${y - 2}1`];
}

/**
 * Ambil daftar Program Studi milik satu Perguruan Tinggi.
 * Mencoba beberapa term terbaru, mengembalikan term pertama yang berisi data.
 * @param {string} idPt - id PT (dari hasil searchPt)
 * @returns {Promise<Array<{id:string, kode:string, nama:string, jenjang:string, akreditasi:string, status:string}>>}
 */
async function getProdiByPt(idPt) {
  const id = clean(idPt);
  if (!id) return [];

  const cacheKey = `ptprodi:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  for (const thsmt of termCandidates()) {
    try {
      const url = `${PDDIKTI_API}/pt/prodi/${id}/${thsmt}`;
      const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
      const rows = Array.isArray(response.data) ? response.data : [];
      if (rows.length === 0) continue;

      const result = rows.map(row => ({
        id: clean(row.id_sms),
        kode: clean(row.kode_prodi),
        nama: clean(row.nama_prodi),
        jenjang: clean(row.jenjang_prodi),
        akreditasi: clean(row.akreditasi),
        status: clean(row.status_prodi),
      })).filter(r => r.nama);

      setCache(cacheKey, result);
      logger.info(`[PDDikti] getProdiByPt ${id} (term ${thsmt}) -> ${result.length} prodi`);
      return result;
    } catch (error) {
      logger.error(`[PDDikti] getProdiByPt ${id} term ${thsmt}: ${error.message}`);
    }
  }
  return [];
}

module.exports = {
  searchPt,
  searchProdi,
  getProdiByPt,
};
