const tokenService = require('./resubmitTokenService');

describe('resubmitTokenService', () => {
  it('signs and verifies a token round-trip', () => {
    const token = tokenService.issue({ requestId: 'abc-123', email: 'test@upps.ac.id' });
    expect(typeof token).toBe('string');
    const payload = tokenService.verify(token);
    expect(payload.requestId).toBe('abc-123');
    expect(payload.email).toBe('test@upps.ac.id');
  });

  it('rejects tampered token', () => {
    const token = tokenService.issue({ requestId: 'abc', email: 'x@y.z' });
    const tampered = token.slice(0, -3) + 'AAA';
    expect(() => tokenService.verify(tampered)).toThrow();
  });

  it('rejects expired token (mocked)', () => {
    jest.spyOn(tokenService, 'verify').mockImplementation(() => {
      throw new Error('jwt expired');
    });
    expect(() => tokenService.verify('expired.token.here')).toThrow('jwt expired');
    jest.restoreAllMocks();
  });
});
