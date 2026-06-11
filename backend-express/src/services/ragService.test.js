const RagService = require('./ragService');

function makeDb() {
  return { query: jest.fn().mockResolvedValue({ rows: [] }) };
}
function makeEmbed() {
  return {
    isConfigured: () => true,
    embedDocuments: jest.fn().mockImplementation(texts => Promise.resolve(texts.map(() => [0.1, 0.2]))),
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2])
  };
}

describe('ragService.indexDocument', () => {
  test('hapus chunk lama lalu insert chunk baru', async () => {
    const db = makeDb();
    const embed = makeEmbed();
    const rag = new RagService({ db, embedding: embed });
    await rag.indexDocument({ submissionId: 's1', docType: 'LED', content: 'KRITERIA 1\n' + 'isi '.repeat(100) });

    const deleteCall = db.query.mock.calls.find(c => /DELETE FROM document_chunks/i.test(c[0]));
    expect(deleteCall).toBeTruthy();
    expect(deleteCall[1]).toContain('s1');
    const insertCall = db.query.mock.calls.find(c => /INSERT INTO document_chunks/i.test(c[0]));
    expect(insertCall).toBeTruthy();
    expect(embed.embedDocuments).toHaveBeenCalled();
  });

  test('embedding tak terkonfigurasi → tidak melempar, tidak insert', async () => {
    const db = makeDb();
    const embed = { isConfigured: () => false, embedDocuments: jest.fn(), embedQuery: jest.fn() };
    const rag = new RagService({ db, embedding: embed });
    await expect(rag.indexDocument({ submissionId: 's1', docType: 'LED', content: 'x' })).resolves.toBeUndefined();
    expect(embed.embedDocuments).not.toHaveBeenCalled();
  });

  test('error DB saat insert tidak dilempar (non-fatal)', async () => {
    const db = { query: jest.fn().mockRejectedValue(new Error('db down')) };
    const embed = makeEmbed();
    const rag = new RagService({ db, embedding: embed });
    await expect(rag.indexDocument({ submissionId: 's1', docType: 'LED', content: 'KRITERIA 1\nisi' })).resolves.toBeUndefined();
  });
});

describe('ragService.isAvailable', () => {
  test('false bila tabel/extension tidak ada', async () => {
    const db = { query: jest.fn().mockRejectedValue(new Error('relation "document_chunks" does not exist')) };
    const rag = new RagService({ db, embedding: makeEmbed() });
    expect(await rag.isAvailable()).toBe(false);
  });

  test('true bila query sukses & embedding configured', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] }) };
    const rag = new RagService({ db, embedding: makeEmbed() });
    expect(await rag.isAvailable()).toBe(true);
  });
});

describe('ragService.search (hybrid RRF)', () => {
  test('gabungkan ranking semantic & keyword via RRF, terurut & unik', async () => {
    const db = {
      query: jest.fn().mockImplementation((sql) => {
        if (/<=>/.test(sql)) {
          return Promise.resolve({ rows: [
            { id: 1, content: 'A', metadata: {} },
            { id: 2, content: 'B', metadata: {} }
          ]});
        }
        if (/ts_rank|content_tsv/.test(sql)) {
          return Promise.resolve({ rows: [
            { id: 2, content: 'B', metadata: {} },
            { id: 3, content: 'C', metadata: {} }
          ]});
        }
        return Promise.resolve({ rows: [] });
      })
    };
    const embed = {
      isConfigured: () => true,
      embedQuery: jest.fn().mockResolvedValue([0.1, 0.2]),
      embedDocuments: jest.fn()
    };
    const rag = new RagService({ db, embedding: embed });
    const res = await rag.search({ query: 'tata pamong', submissionId: 's1', docType: 'LED', topK: 3 });
    const ids = res.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);   // unik
    expect(ids[0]).toBe(2);                         // B muncul di kedua list → skor RRF tertinggi
    expect(res.length).toBeLessThanOrEqual(3);
  });

  test('search melempar bila embedding query gagal → caller fallback', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const embed = { isConfigured: () => true, embedQuery: jest.fn().mockRejectedValue(new Error('quota')), embedDocuments: jest.fn() };
    const rag = new RagService({ db, embedding: embed });
    await expect(rag.search({ query: 'x', docType: 'LED' })).rejects.toThrow();
  });
});

describe('ragService.getLKPSSheets', () => {
  test('ambil chunk by sheetName via metadata filter', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1, content: 'sheet 4a', metadata: { sheetName: '4a' } }] }) };
    const rag = new RagService({ db, embedding: { isConfigured: () => true } });
    const rows = await rag.getLKPSSheets('s1', ['4a', '6a']);
    expect(rows).toHaveLength(1);
    expect(db.query.mock.calls[0][1]).toContain('s1');
  });
});
