/**
 * Google Scholar Scraper Service
 * Scrapes research data from Google Scholar profiles
 * 
 * IMPORTANT: Use with caution - Google may block IPs with too many requests
 * Recommended: 3-5 second delay between requests
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

// Safe delay between requests (milliseconds)
const REQUEST_DELAY_MS = 4000; // 4 seconds
let lastRequestTime = 0;

/**
 * Wait for rate limit to avoid blocking
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    logger.info(`[GoogleScholar] Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Extract Google Scholar ID from URL
 * @param {string} url - Google Scholar profile URL
 * @returns {string|null} Scholar ID
 */
function extractScholarId(url) {
  if (!url) return null;
  
  // Match patterns like: 
  // https://scholar.google.com/citations?user=XXXX&hl=en
  // https://scholar.google.co.id/citations?user=XXXX
  const match = url.match(/[?&]user=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Scrape Google Scholar profile page
 * @param {string} scholarUrl - Full Google Scholar profile URL or user ID
 * @returns {Object} Research profile data
 */
async function scrapeScholarProfile(scholarUrl) {
  try {
    await waitForRateLimit();
    
    // Build URL
    let url = scholarUrl;
    if (!scholarUrl.startsWith('http')) {
      // Assume it's just a user ID
      url = `https://scholar.google.com/citations?user=${scholarUrl}&hl=en`;
    }
    
    // Add hl=en if not present for consistent language
    if (!url.includes('hl=')) {
      url += (url.includes('?') ? '&' : '?') + 'hl=en';
    }
    
    logger.info(`[GoogleScholar] Scraping: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract profile data
    const name = $('#gsc_prf_in').text().trim();
    const affiliation = $('#gsc_prf_in + .gsc_prf_il').text().trim();
    
    // Extract interests/research areas
    const interests = [];
    $('#gsc_prf_int a.gsc_prf_inta').each((i, el) => {
      interests.push($(el).text().trim());
    });
    
    // Extract citation metrics
    const citations = parseInt($('#gsc_rsb_st td.gsc_rsb_std').eq(0).text()) || 0;
    const hIndex = parseInt($('#gsc_rsb_st td.gsc_rsb_std').eq(2).text()) || 0;
    const i10Index = parseInt($('#gsc_rsb_st td.gsc_rsb_std').eq(4).text()) || 0;
    
    // Extract recent publications (top 5)
    const publications = [];
    $('.gsc_a_tr').slice(0, 5).each((i, el) => {
      const title = $(el).find('.gsc_a_at').text().trim();
      const year = parseInt($(el).find('.gsc_a_y span').text()) || null;
      const citedBy = parseInt($(el).find('.gsc_a_ac').text()) || 0;
      
      if (title) {
        publications.push({ title, year, citedBy });
      }
    });
    
    logger.info(`[GoogleScholar] ✅ Found: ${name}, H-Index: ${hIndex}, Interests: ${interests.length}`);
    
    return {
      found: true,
      name,
      affiliation,
      researchAreas: interests,
      hIndex,
      citations,
      i10Index,
      publications,
      scholarUrl: url,
      message: 'Profile scraped successfully'
    };
    
  } catch (error) {
    if (error.response?.status === 429) {
      logger.error('[GoogleScholar] ⚠️ Rate limited by Google! Wait a few minutes.');
      return {
        found: false,
        researchAreas: [],
        hIndex: null,
        publications: [],
        message: 'Rate limited by Google. Please try again later.'
      };
    }
    
    if (error.response?.status === 404) {
      logger.warn('[GoogleScholar] Profile not found');
      return {
        found: false,
        researchAreas: [],
        hIndex: null,
        publications: [],
        message: 'Profile not found'
      };
    }
    
    logger.error(`[GoogleScholar] Scrape error:`, error.message);
    return {
      found: false,
      researchAreas: [],
      hIndex: null,
      publications: [],
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Search Google Scholar for an author by name
 * @param {string} authorName - Name to search
 * @returns {Object} Search result with profile link if found
 */
async function searchAuthor(authorName) {
  try {
    await waitForRateLimit();
    
    const searchUrl = `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(authorName)}&hl=en`;
    
    logger.info(`[GoogleScholar] Searching: ${authorName}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Get first author result
    const firstResult = $('.gs_ai_t a').first();
    if (firstResult.length > 0) {
      const profileUrl = 'https://scholar.google.com' + firstResult.attr('href');
      const foundName = firstResult.text().trim();
      
      logger.info(`[GoogleScholar] Found author: ${foundName}`);
      return {
        found: true,
        name: foundName,
        profileUrl,
        message: 'Author found'
      };
    }
    
    logger.warn(`[GoogleScholar] No results for: ${authorName}`);
    return {
      found: false,
      message: 'No author found with this name'
    };
    
  } catch (error) {
    logger.error(`[GoogleScholar] Search error:`, error.message);
    return {
      found: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Fetch complete profile - first by URL if available, then by name search
 * @param {string} name - Assessor name
 * @param {string} scholarUrl - Optional Google Scholar URL
 * @returns {Object} Research profile data
 */
async function fetchProfile(name, scholarUrl = null) {
  // If we have a Scholar URL, use it directly
  if (scholarUrl) {
    return await scrapeScholarProfile(scholarUrl);
  }
  
  // Otherwise, search by name first
  const searchResult = await searchAuthor(name);
  
  if (searchResult.found && searchResult.profileUrl) {
    // Found profile, now scrape it
    return await scrapeScholarProfile(searchResult.profileUrl);
  }
  
  return {
    found: false,
    name,
    researchAreas: [],
    hIndex: null,
    publications: [],
    message: searchResult.message
  };
}

module.exports = {
  extractScholarId,
  scrapeScholarProfile,
  searchAuthor,
  fetchProfile
};
