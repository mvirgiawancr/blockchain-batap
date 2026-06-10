const geminiService = require('./geminiService');

describe('parseQualitativeScores', () => {
  test('parse JSON skor butir valid', () => {
    const raw = '```json\n{"butir_scores":{"1.1":{"score":3.5,"justification":"kuat","confidence":"high"}}}\n```';
    const out = geminiService.parseQualitativeScores(raw);
    expect(out['1.1'].score).toBe(3.5);
    expect(out['1.1'].confidence).toBe('high');
  });

  test('JSON rusak → objek kosong (caller fallback)', () => {
    expect(geminiService.parseQualitativeScores('bukan json')).toEqual({});
  });

  test('clamp skor ke rentang 0-4', () => {
    const raw = '{"butir_scores":{"2.1":{"score":9,"justification":"x","confidence":"low"}}}';
    expect(geminiService.parseQualitativeScores(raw)['2.1'].score).toBe(4);
  });
});
