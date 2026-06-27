const emailService = require('./emailService');

describe('emailService', () => {
  describe('isConfigured', () => {
    it('returns boolean', () => {
      const result = emailService.isConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sendRegistrationReceived', () => {
    it('returns success shape {success, id?, error?}', async () => {
      const result = await emailService.sendRegistrationReceived({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        requestId: 'req-123',
      });
      expect(result).toHaveProperty('success');
      if (!result.success) expect(result).toHaveProperty('error');
      else expect(result).toHaveProperty('id');
    });
  });

  describe('sendApprovalNotification', () => {
    it('returns success shape', async () => {
      const result = await emailService.sendApprovalNotification({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        username: 'testuser',
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('sendRejectionWithResubmitToken', () => {
    it('returns success shape', async () => {
      const result = await emailService.sendRejectionWithResubmitToken({
        to: 'test@example.com',
        uppsName: 'Test UPPS',
        reason: 'Dokumen tidak valid',
        resubmitUrl: 'https://app.example.com/register-upps?resubmit=tok123',
      });
      expect(result).toHaveProperty('success');
    });
  });
});
