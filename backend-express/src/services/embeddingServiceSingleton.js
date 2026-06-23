const EmbeddingService = require('./embeddingService');
const config = require('../config');

module.exports = new EmbeddingService({ 
  minIntervalMs: config.gemini.minRequestIntervalMs != null ? config.gemini.minRequestIntervalMs : 4000 
});
