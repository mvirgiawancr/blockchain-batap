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

describe('chunkLKPS', () => {
  const sample = [
    '--- Sheet: 4a ---',
    'No,Nama Dosen,Jabatan',
    '1,Budi,Lektor',
    '--- Sheet: 6a ---',
    'Mahasiswa,TS-2,TS-1,TS',
    'Aktif,10,12,15'
  ].join('\n');

  test('satu chunk per sheet dengan metadata sheetName', () => {
    const chunks = chunking.chunkLKPS(sample);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].metadata.sheetName).toBe('4a');
    expect(chunks[1].metadata.sheetName).toBe('6a');
    expect(chunks[0].content).toContain('Budi');
  });

  test('content menyertakan nama sheet untuk sinyal semantik', () => {
    const chunks = chunking.chunkLKPS(sample);
    expect(chunks[0].content).toContain('4a');
  });

  test('sheet sangat besar dipecah dan header sheet diulang', () => {
    const big = '--- Sheet: 3b ---\n' + ('baris data penelitian,1,2,3\n'.repeat(2000));
    const chunks = chunking.chunkLKPS(big);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.metadata.sheetName === '3b')).toBe(true);
    expect(chunks.every(c => c.content.includes('Sheet: 3b'))).toBe(true);
  });

  test('teks tanpa marker sheet → satu chunk fallback', () => {
    const chunks = chunking.chunkLKPS('data tanpa marker sheet');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata.sheetName).toBeNull();
  });
});

describe('chunkPedoman', () => {
  const sample = [
    '1  Kekhasan VMTS  Pernyataan VMTS yang unik dan spesifik. 0.97',
    '2  Mekanisme penyusunan VMTS  Keterlibatan pemangku kepentingan. 0.63',
    '7  Pelaksanaan kerja sama  UPPS memiliki bukti yang sahih memenuhi 3 aspek berikut: (1) manfaat; (2) kinerja; (3) kepuasan. 1.39'
  ].join('\n');

  test('memecah per butir bernomor dan menangkap butirCode untuk kriteria yang benar', () => {
    const chunks = chunking.chunkPedoman(sample);
    const kriterias = chunks.map(c => c.metadata.kriteria).filter(k => k != null);
    // global 1,2 → kriteria 1 ; global 7 → kriteria 2
    expect(kriterias).toEqual(expect.arrayContaining([1, 2]));
    expect(chunks.every(c => c.metadata.butirCode === null || /^\d+\.\d+$/.test(c.metadata.butirCode))).toBe(true);
  });

  test('setiap chunk punya konten non-kosong dan chunkIndex urut', () => {
    const chunks = chunking.chunkPedoman(sample);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i);
      expect(c.content.length).toBeGreaterThan(0);
    });
  });
});
