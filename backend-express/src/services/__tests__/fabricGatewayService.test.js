const { Gateway, Wallets } = require('fabric-network');

jest.mock('fabric-network');
jest.mock('../fabricCredentialService');
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const fabricCredentialService = require('../fabricCredentialService');
const fabricGatewayService = require('../fabricGatewayService');

describe('fabricGatewayService', () => {
  const mockGateway = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getNetwork: jest.fn(),
  };
  const mockNetwork = { getContract: jest.fn() };
  const mockContract = {
    submitTransaction: jest.fn(),
    evaluateTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Gateway.mockImplementation(() => mockGateway);
    Wallets.newInMemoryWallet.mockResolvedValue({
      put: jest.fn(),
      get: jest.fn(),
    });
    mockGateway.connect.mockResolvedValue(undefined);
    mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    mockNetwork.getContract.mockReturnValue(mockContract);
    mockContract.submitTransaction.mockResolvedValue(Buffer.from('{"ok":true}'));
    mockContract.evaluateTransaction.mockResolvedValue(Buffer.from('[]'));
  });

  describe('submitTransaction', () => {
    it('loads identity from DB, connects gateway as that user, submits tx, disconnects', async () => {
      fabricCredentialService.getCredentials.mockResolvedValue({
        userId: 'u1',
        mspId: 'UPPSMSP',
        certificate: 'CERT',
        privateKey: 'KEY',
      });

      const result = await fabricGatewayService.submitTransaction('u1', 'CreateSubmission', ['s1', '{}']);

      expect(fabricCredentialService.getCredentials).toHaveBeenCalledWith('u1');
      expect(mockGateway.connect).toHaveBeenCalledTimes(1);
      expect(mockContract.submitTransaction).toHaveBeenCalledWith('CreateSubmission', 's1', '{}');
      expect(mockGateway.disconnect).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('disconnects gateway even if submit throws', async () => {
      fabricCredentialService.getCredentials.mockResolvedValue({
        userId: 'u1', mspId: 'UPPSMSP', certificate: 'CERT', privateKey: 'KEY',
      });
      mockContract.submitTransaction.mockRejectedValue(new Error('endorsement failure'));

      await expect(
        fabricGatewayService.submitTransaction('u1', 'CreateSubmission', ['s1'])
      ).rejects.toThrow('endorsement failure');

      expect(mockGateway.disconnect).toHaveBeenCalled();
    });

    it('throws with clear error if user has no stored credentials', async () => {
      fabricCredentialService.getCredentials.mockRejectedValue(new Error('No MSP credentials found for user'));

      await expect(
        fabricGatewayService.submitTransaction('u1', 'CreateSubmission', ['s1'])
      ).rejects.toThrow(/No MSP credentials/);
    });
  });

  describe('evaluateTransaction', () => {
    it('queries as the user identity, parses JSON result', async () => {
      fabricCredentialService.getCredentials.mockResolvedValue({
        userId: 'u1', mspId: 'UPPSMSP', certificate: 'CERT', privateKey: 'KEY',
      });

      const result = await fabricGatewayService.evaluateTransaction('u1', 'QueryAllSubmissions', []);

      expect(mockContract.evaluateTransaction).toHaveBeenCalledWith('QueryAllSubmissions');
      expect(result).toEqual([]);
    });
  });
});
