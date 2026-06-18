const EmbeddingService = require('./embeddingService');

describe('embeddingService (provider gemini)', () => {
  test('embedDocuments mengembalikan satu vektor per teks', async () => {
    const fakeModel = {
      batchEmbedContents: jest.fn().mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }]
      })
    };
    const svc = new EmbeddingService({ provider: 'gemini', embedModel: fakeModel, minIntervalMs: 0 });
    const vecs = await svc.embedDocuments(['a', 'b']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toEqual([0.1, 0.2]);
    expect(fakeModel.batchEmbedContents).toHaveBeenCalledTimes(1);
  });

  test('embedQuery mengembalikan satu vektor', async () => {
    const fakeModel = {
      embedContent: jest.fn().mockResolvedValue({ embedding: { values: [1, 2, 3] } })
    };
    const svc = new EmbeddingService({ provider: 'gemini', embedModel: fakeModel, minIntervalMs: 0 });
    const vec = await svc.embedQuery('halo');
    expect(vec).toEqual([1, 2, 3]);
  });

  test('isConfigured false bila tak ada model', () => {
    const svc = new EmbeddingService({ provider: 'gemini', embedModel: null });
    expect(svc.isConfigured()).toBe(false);
  });

  test('embedDocuments memecah batch sesuai BATCH_SIZE', async () => {
    const fakeModel = {
      batchEmbedContents: jest.fn().mockImplementation(({ requests }) =>
        Promise.resolve({ embeddings: requests.map(() => ({ values: [0] })) }))
    };
    const svc = new EmbeddingService({ provider: 'gemini', embedModel: fakeModel, minIntervalMs: 0 });
    const n = EmbeddingService.BATCH_SIZE * 2 + 1; // 2 batch penuh + 1 sisa = 3 batch
    const vecs = await svc.embedDocuments(new Array(n).fill('x'));
    expect(vecs).toHaveLength(n);
    expect(fakeModel.batchEmbedContents).toHaveBeenCalledTimes(3);
  });
});

describe('embeddingService (provider local / E5)', () => {
  // Fake extractor mirip transformers.js: kembalikan {data: Float32Array(768)} & catat input.
  function makeExtractor() {
    const calls = [];
    const fn = async (text /*, opts */) => { calls.push(text); return { data: new Float32Array(768).fill(0.01) }; };
    fn.calls = calls;
    return fn;
  }

  test('isConfigured true tanpa API key', () => {
    const svc = new EmbeddingService({ provider: 'local', localExtractor: makeExtractor() });
    expect(svc.isConfigured()).toBe(true);
  });

  test('embedQuery menambahkan prefix E5 "query:" dan kembalikan 768 dim', async () => {
    const ex = makeExtractor();
    const svc = new EmbeddingService({ provider: 'local', localExtractor: ex });
    const v = await svc.embedQuery('tata pamong');
    expect(v).toHaveLength(768);
    expect(ex.calls[0]).toBe('query: tata pamong');
  });

  test('embedDocuments menambahkan prefix E5 "passage:" per teks', async () => {
    const ex = makeExtractor();
    const svc = new EmbeddingService({ provider: 'local', localExtractor: ex });
    const vecs = await svc.embedDocuments(['isi satu', 'isi dua']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toHaveLength(768);
    expect(ex.calls).toEqual(['passage: isi satu', 'passage: isi dua']);
  });

  test('tidak menggandakan prefix bila sudah ada', async () => {
    const ex = makeExtractor();
    const svc = new EmbeddingService({ provider: 'local', localExtractor: ex });
    await svc.embedQuery('query: sudah ada');
    expect(ex.calls[0]).toBe('query: sudah ada');
  });
});
