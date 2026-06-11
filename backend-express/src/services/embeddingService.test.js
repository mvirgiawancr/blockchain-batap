const EmbeddingService = require('./embeddingService');

describe('embeddingService', () => {
  test('embedDocuments mengembalikan satu vektor per teks', async () => {
    const fakeModel = {
      batchEmbedContents: jest.fn().mockResolvedValue({
        embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }]
      })
    };
    const svc = new EmbeddingService({ embedModel: fakeModel, minIntervalMs: 0 });
    const vecs = await svc.embedDocuments(['a', 'b']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0]).toEqual([0.1, 0.2]);
    expect(fakeModel.batchEmbedContents).toHaveBeenCalledTimes(1);
  });

  test('embedQuery mengembalikan satu vektor', async () => {
    const fakeModel = {
      embedContent: jest.fn().mockResolvedValue({ embedding: { values: [1, 2, 3] } })
    };
    const svc = new EmbeddingService({ embedModel: fakeModel, minIntervalMs: 0 });
    const vec = await svc.embedQuery('halo');
    expect(vec).toEqual([1, 2, 3]);
  });

  test('isConfigured false bila tak ada model', () => {
    const svc = new EmbeddingService({ embedModel: null });
    expect(svc.isConfigured()).toBe(false);
  });

  test('embedDocuments memecah batch sesuai BATCH_SIZE', async () => {
    const fakeModel = {
      batchEmbedContents: jest.fn().mockImplementation(({ requests }) =>
        Promise.resolve({ embeddings: requests.map(() => ({ values: [0] })) }))
    };
    const svc = new EmbeddingService({ embedModel: fakeModel, minIntervalMs: 0 });
    const n = EmbeddingService.BATCH_SIZE * 2 + 1; // 2 batch penuh + 1 sisa = 3 batch
    const vecs = await svc.embedDocuments(new Array(n).fill('x'));
    expect(vecs).toHaveLength(n);
    expect(fakeModel.batchEmbedContents).toHaveBeenCalledTimes(3);
  });
});
