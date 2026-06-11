/**
 * Gemini Embedding Service (text-embedding-004, 768 dim).
 * Limiter & retry SENDIRI — kuota embedding terpisah dari generation (jangan pakai limiter geminiService).
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const EMBED_DIM = 768;
const BATCH_SIZE = 100;

class EmbeddingService {
  constructor(opts = {}) {
    this.minIntervalMs = opts.minIntervalMs != null ? opts.minIntervalMs : 1500;
    this.lastRequestTime = 0;

    if (opts.embedModel !== undefined) {
      this.embedModel = opts.embedModel; // injeksi untuk test
    } else if (config.gemini.apiKey) {
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.embedModel = genAI.getGenerativeModel({ model: config.gemini.embeddingModel });
    } else {
      this.embedModel = null;
    }
  }

  isConfigured() {
    return !!this.embedModel;
  }

  async _throttle() {
    if (this.minIntervalMs <= 0) return;
    const since = Date.now() - this.lastRequestTime;
    if (this.lastRequestTime > 0 && since < this.minIntervalMs) {
      await new Promise(r => setTimeout(r, this.minIntervalMs - since));
    }
    this.lastRequestTime = Date.now();
  }

  async embedQuery(text) {
    if (!this.embedModel) throw new Error('Embedding model not configured');
    await this._throttle();
    const res = await this.embedModel.embedContent({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBED_DIM
    });
    return res.embedding.values;
  }

  async embedDocuments(texts) {
    if (!this.embedModel) throw new Error('Embedding model not configured');
    if (!texts.length) return [];
    const out = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const slice = texts.slice(i, i + BATCH_SIZE);
      await this._throttle();
      const res = await this.embedModel.batchEmbedContents({
        requests: slice.map(t => ({
          content: { parts: [{ text: t }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBED_DIM
        }))
      });
      for (const e of res.embeddings) out.push(e.values);
    }
    return out;
  }
}

EmbeddingService.EMBED_DIM = EMBED_DIM;
module.exports = EmbeddingService;
