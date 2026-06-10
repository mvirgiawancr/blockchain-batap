const chunking = require('./chunkingService');

describe('chunkLED', () => {
  test('split per heading KRITERIA dan isi metadata kriteria', () => {
    const text = [
      'KRITERIA 1 DIFERENSIASI MISI',
      'Visi program studi adalah unggul. '.repeat(50),
      'KRITERIA 2 AKUNTABILITAS',
      'Tata pamong dijalankan transparan. '.repeat(50)
    ].join('\n');
    const chunks = chunking.chunkLED(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.every(c => typeof c.content === 'string' && c.content.length > 0)).toBe(true);
    expect(chunks.some(c => c.metadata.kriteria === 1)).toBe(true);
    expect(chunks.some(c => c.metadata.kriteria === 2)).toBe(true);
    chunks.forEach((c, i) => expect(c.chunkIndex).toBe(i));
  });

  test('section panjang dipecah dengan cap ukuran', () => {
    const text = 'KRITERIA 3 RELEVANSI\n' + 'x'.repeat(20000);
    const chunks = chunking.chunkLED(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(Math.max(...chunks.map(c => c.content.length))).toBeLessThanOrEqual(6500);
  });

  test('teks tanpa heading tetap menghasilkan chunk', () => {
    const chunks = chunking.chunkLED('teks bebas tanpa heading apapun');
    expect(chunks.length).toBe(1);
    expect(chunks[0].metadata.kriteria).toBeNull();
  });
});
