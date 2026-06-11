/**
 * Gemini Embedding Service (gemini-embedding-001, output 768 dim).
 * Limiter & retry SENDIRI — kuota embedding terpisah dari generation.
 * Free tier ~100 embed/menit: batch kecil + retry-on-429 (hormati retryDelay).
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const EMBED_DIM = 768;
const BATCH_SIZE = 20; // kecil agar tidak menabrak kuota 100/menit sekaligus

class EmbeddingService {
  constructor(opts = {}) {
    this.minIntervalMs = opts.minIntervalMs != null ? opts.minIntervalMs : 1500;
    this.maxRetries = opts.maxRetries != null ? opts.maxRetries : 5;
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

  // Retry untuk galat kuota/sementara (429/503), menghormati retryDelay bila ada.
  async _withRetry(fn, label) {
    let attempt = 0;
    for (;;) {
      try {
        return await fn();
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        const retryable = /\b429\b|\b503\b|quota|rate limit|overloaded|too many requests/i.test(msg);
        attempt++;
        if (!retryable || attempt > this.maxRetries) throw err;
        const m = msg.match(/retry in ([\d.]+)s/i) || msg.match(/retryDelay"?:\s*"?([\d.]+)s/i);
        let waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) : Math.min(2000 * Math.pow(2, attempt - 1), 30000);
        waitMs += 800; // buffer kecil agar kuota benar-benar pulih
        console.warn(`[Embedding] ${label}: ${msg.slice(0, 80)} — retry ${attempt}/${this.maxRetries} dalam ${Math.ceil(waitMs / 1000)}s`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }

  async embedQuery(text) {
    if (!this.embedModel) throw new Error('Embedding model not configured');
    await this._throttle();
    const res = await this._withRetry(() => this.embedModel.embedContent({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBED_DIM
    }), 'embedQuery');
    return res.embedding.values;
  }

  async embedDocuments(texts) {
    if (!this.embedModel) throw new Error('Embedding model not configured');
    if (!texts.length) return [];
    const out = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const slice = texts.slice(i, i + BATCH_SIZE);
      await this._throttle();
      const res = await this._withRetry(() => this.embedModel.batchEmbedContents({
        requests: slice.map(t => ({
          content: { parts: [{ text: t }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBED_DIM
        }))
      }), 'embedDocuments');
      for (const e of res.embeddings) out.push(e.values);
    }
    return out;
  }
}

EmbeddingService.EMBED_DIM = EMBED_DIM;
EmbeddingService.BATCH_SIZE = BATCH_SIZE;
module.exports = EmbeddingService;
