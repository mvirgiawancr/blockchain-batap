/**
 * Embedding Service — dua provider (768 dim, sesuai skema vector(768)):
 *  • local  (default): @xenova/transformers "Xenova/multilingual-e5-base" — tanpa kuota/biaya.
 *  • gemini          : gemini-embedding-001 via API (batch + retry-on-429).
 * Pilih lewat EMBEDDING_PROVIDER. PENTING: index & query HARUS provider yang sama
 * (ruang vektor beda antar model) — ganti provider ⇒ re-index ulang dokumen & pedoman.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const EMBED_DIM = 768;
const BATCH_SIZE = 100; // Meningkatkan batch size ke 100 (batas maks Gemini API) untuk mengurangi jumlah total request API.

class EmbeddingService {
  constructor(opts = {}) {
    this.minIntervalMs = opts.minIntervalMs != null ? opts.minIntervalMs : 1500;
    this.maxRetries = opts.maxRetries != null ? opts.maxRetries : 5;
    this.lastRequestTime = 0;
    this.provider = opts.provider || config.rag.embeddingProvider || 'local';

    this.embedModel = null;
    this.localExtractor = opts.localExtractor || null; // bisa diinjeksi untuk test
    this._loadPromise = null;

    if (this.provider === 'gemini') {
      if (opts.embedModel !== undefined) {
        this.embedModel = opts.embedModel; // injeksi untuk test
      } else if (config.gemini.apiKey) {
        const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.embedModel = genAI.getGenerativeModel({ model: config.gemini.embeddingModel });
      }
    }
  }

  async _initLocalModel() {
    if (this.localExtractor) return;
    // Guard konkurensi: bila beberapa pemanggilan datang sebelum model siap,
    // cukup SATU proses load (hindari unduh/inisialisasi model ganda).
    if (!this._loadPromise) {
      console.log('[Embedding] Loading local multilingual-e5-base model...');
      this._loadPromise = (async () => {
        const { pipeline } = await import('@xenova/transformers');
        this.localExtractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base');
        console.log('[Embedding] Local model loaded successfully!');
      })();
    }
    await this._loadPromise;
  }

  isConfigured() {
    if (this.provider === 'local') return true;
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
        const isQuota = /\b429\b|quota|rate limit/i.test(msg);
        let waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) : (isQuota ? 15000 : 2000) * Math.pow(1.5, attempt - 1);
        waitMs = Math.min(waitMs, 60000) + 800; // buffer kecil agar kuota benar-benar pulih
        console.warn(`[Embedding] ${label}: ${msg} — retry ${attempt}/${this.maxRetries} dalam ${Math.ceil(waitMs / 1000)}s`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }

  async embedQuery(text) {
    if (this.provider === 'local') {
      await this._initLocalModel();
      const queryText = text.startsWith('query:') ? text : `query: ${text}`;
      const output = await this.localExtractor(queryText, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }

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
    if (!texts.length) return [];

    if (this.provider === 'local') {
      await this._initLocalModel();
      const out = [];
      for (const text of texts) {
        const passageText = text.startsWith('passage:') ? text : `passage: ${text}`;
        const output = await this.localExtractor(passageText, { pooling: 'mean', normalize: true });
        out.push(Array.from(output.data));
      }
      return out;
    }

    if (!this.embedModel) throw new Error('Embedding model not configured');
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
