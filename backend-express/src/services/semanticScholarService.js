/**
 * Semantic Scholar Service
 * Fetches research data from Semantic Scholar API (FREE!)
 * API Docs: https://api.semanticscholar.org/
 */

const axios = require('axios');
const logger = require('../utils/logger');

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

// Rate limiting: 100 requests per 5 minutes for unauthenticated
const REQUEST_DELAY_MS = 500; // 0.5 second between requests
let lastRequestTime = 0;

/**
 * Wait for rate limit
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Search for author by name
 * @param {string} authorName - Name to search
 * @returns {Object|null} Author data or null
 */
async function searchAuthorByName(authorName) {
  try {
    await waitForRateLimit();
    
    const response = await axios.get(`${SEMANTIC_SCHOLAR_API}/author/search`, {
      params: {
        query: authorName,
        fields: 'authorId,name,affiliations,paperCount,citationCount,hIndex'
      },
      timeout: 10000
    });

    if (response.data?.data && response.data.data.length > 0) {
      // Return the first match (most relevant)
      const author = response.data.data[0];
      logger.info(`[SemanticScholar] Found author: ${author.name} (ID: ${author.authorId})`);
      return author;
    }
    
    logger.warn(`[SemanticScholar] No author found for: ${authorName}`);
    return null;
  } catch (error) {
    logger.error(`[SemanticScholar] Search error for "${authorName}":`, error.message);
    return null;
  }
}

/**
 * Get author details by Semantic Scholar ID
 * @param {string} authorId - Semantic Scholar author ID
 * @returns {Object|null} Author details or null
 */
async function getAuthorById(authorId) {
  try {
    await waitForRateLimit();
    
    const response = await axios.get(`${SEMANTIC_SCHOLAR_API}/author/${authorId}`, {
      params: {
        fields: 'authorId,name,affiliations,paperCount,citationCount,hIndex,papers.title,papers.year,papers.fieldsOfStudy'
      },
      timeout: 10000
    });

    if (response.data) {
      logger.info(`[SemanticScholar] Retrieved author details: ${response.data.name}`);
      return response.data;
    }
    
    return null;
  } catch (error) {
    logger.error(`[SemanticScholar] Get author error for ID ${authorId}:`, error.message);
    return null;
  }
}

/**
 * Extract research areas from author's papers
 * @param {Array} papers - List of papers with fieldsOfStudy
 * @returns {Array} Unique research areas
 */
function extractResearchAreas(papers) {
  if (!papers || papers.length === 0) return [];
  
  const fieldsSet = new Set();
  
  papers.forEach(paper => {
    if (paper.fieldsOfStudy && Array.isArray(paper.fieldsOfStudy)) {
      paper.fieldsOfStudy.forEach(field => fieldsSet.add(field));
    }
  });
  
  return Array.from(fieldsSet).slice(0, 10); // Max 10 areas
}

/**
 * Get recent publications (last 5 years)
 * @param {Array} papers - List of papers
 * @param {number} limit - Max number of publications
 * @returns {Array} Recent publications
 */
function getRecentPublications(papers, limit = 5) {
  if (!papers || papers.length === 0) return [];
  
  const currentYear = new Date().getFullYear();
  const fiveYearsAgo = currentYear - 5;
  
  return papers
    .filter(p => p.year && p.year >= fiveYearsAgo)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, limit)
    .map(p => ({
      title: p.title,
      year: p.year,
      fields: p.fieldsOfStudy || []
    }));
}

/**
 * Fetch complete research profile for an assessor
 * @param {string} assessorName - Assessor name to search
 * @param {string} institution - Optional institution for better matching
 * @returns {Object} Research profile data
 */
async function fetchResearchProfile(assessorName, institution = null) {
  try {
    // Search by name
    let searchQuery = assessorName;
    
    // Clean the name (remove titles like Dr., Prof., M.Si, etc.)
    searchQuery = searchQuery
      .replace(/^(Dr\.|Prof\.|Ir\.)\s*/gi, '')
      .replace(/,?\s*(S\.T\.?|M\.T\.?|M\.Si\.?|M\.Sc\.?|Ph\.D\.?|S\.TP\.?|S\.P\.?)$/gi, '')
      .trim();
    
    logger.info(`[SemanticScholar] Searching for: "${searchQuery}"`);
    
    const author = await searchAuthorByName(searchQuery);
    
    if (!author) {
      return {
        found: false,
        authorName: assessorName,
        scholarId: null,
        hIndex: null,
        paperCount: 0,
        citationCount: 0,
        researchAreas: [],
        recentPublications: [],
        message: 'Author not found in Semantic Scholar'
      };
    }
    
    // Get detailed author info with papers
    const authorDetails = await getAuthorById(author.authorId);
    
    if (!authorDetails) {
      return {
        found: true,
        authorName: author.name,
        scholarId: author.authorId,
        hIndex: author.hIndex,
        paperCount: author.paperCount,
        citationCount: author.citationCount,
        researchAreas: [],
        recentPublications: [],
        affiliations: author.affiliations || [],
        message: 'Basic info only, no papers available'
      };
    }
    
    const researchAreas = extractResearchAreas(authorDetails.papers);
    const recentPublications = getRecentPublications(authorDetails.papers);
    
    return {
      found: true,
      authorName: authorDetails.name,
      scholarId: authorDetails.authorId,
      hIndex: authorDetails.hIndex,
      paperCount: authorDetails.paperCount,
      citationCount: authorDetails.citationCount,
      researchAreas,
      recentPublications,
      affiliations: authorDetails.affiliations || [],
      message: 'Profile fetched successfully'
    };
    
  } catch (error) {
    logger.error(`[SemanticScholar] Profile fetch error:`, error.message);
    return {
      found: false,
      authorName: assessorName,
      scholarId: null,
      hIndex: null,
      paperCount: 0,
      citationCount: 0,
      researchAreas: [],
      recentPublications: [],
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Batch fetch research profiles for multiple assessors
 * @param {Array} assessors - Array of assessor objects with name property
 * @returns {Array} Array of assessors with research profiles
 */
async function fetchBatchProfiles(assessors) {
  const results = [];
  
  for (const assessor of assessors) {
    logger.info(`[SemanticScholar] Processing: ${assessor.name}`);
    
    const profile = await fetchResearchProfile(
      assessor.name, 
      assessor.institution
    );
    
    results.push({
      ...assessor,
      researchProfile: profile
    });
    
    // Small delay between assessors to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return results;
}

module.exports = {
  searchAuthorByName,
  getAuthorById,
  fetchResearchProfile,
  fetchBatchProfiles,
  extractResearchAreas,
  getRecentPublications
};
