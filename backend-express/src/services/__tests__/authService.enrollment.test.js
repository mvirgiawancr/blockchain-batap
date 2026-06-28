const { query } = require('../../config/database');
const fabricEnrollmentService = require('../fabricEnrollmentService');
const fabricCredentialService = require('../fabricCredentialService');
const authService = require('../authService');

jest.mock('../../config/database');
jest.mock('../fabricEnrollmentService');
jest.mock('../fabricCredentialService');

describe('authService.register — enrollment integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset();
  });

  it('enrolls the user with Fabric CA after a successful DB insert', async () => {
    query
      .mockResolvedValueOnce({ rows: [] }) // existingUser check
      .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'john', role: 'upps', name: 'John', institution: null, created_at: new Date() }] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // logAudit

    fabricEnrollmentService.enrollNewUser.mockResolvedValue({ enrollmentId: 'john', mspId: 'UPPSMSP' });

    const user = await authService.register({
      username: 'john',
      password: 'Password123!',
      role: 'upps',
      name: 'John Doe',
      mspOrg: 'UPPSMSP',
    });

    expect(fabricEnrollmentService.enrollNewUser).toHaveBeenCalledWith({
      userId: 'u1',
      username: 'john',
      mspOrg: 'UPPSMSP',
    });
    expect(user.enrollmentId).toBe('john');
  });

  it('rolls back the user row if CA enrollment fails', async () => {
    query
      .mockResolvedValueOnce({ rows: [] }) // existingUser check
      .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'jane', role: 'upps', name: 'Jane', institution: null, created_at: new Date() }] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // DELETE on rollback

    fabricEnrollmentService.enrollNewUser.mockRejectedValue(new Error('CA unreachable'));

    await expect(
      authService.register({
        username: 'jane',
        password: 'Password123!',
        role: 'upps',
        name: 'Jane',
        mspOrg: 'UPPSMSP',
      })
    ).rejects.toThrow(/CA unreachable/);

    // Verify rollback: a DELETE or UPDATE is_active=false should have fired.
    const calls = query.mock.calls.map(c => c[0]);
    const lastCall = calls[calls.length - 1];
    expect(lastCall).toMatch(/DELETE FROM users|UPDATE users SET is_active/);
  });
});
