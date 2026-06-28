const FabricCAServices = require('fabric-ca-client');

// Mock the fabric-ca-client module BEFORE requiring the service.
jest.mock('fabric-ca-client');

const fabricCredentialService = require('../fabricCredentialService');
const config = require('../../config');
const fabricEnrollmentService = require('../fabricEnrollmentService');

describe('fabricEnrollmentService', () => {
  const mockCa = {
    register: jest.fn(),
    enroll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    FabricCAServices.mockImplementation(() => mockCa);

    // Stub credential storage so we don't touch the DB.
    jest.spyOn(fabricCredentialService, 'storeCredentials').mockResolvedValue({ id: 'user-uuid' });
    jest.spyOn(fabricCredentialService, 'storeEnrollmentMeta').mockResolvedValue(undefined);
  });

  describe('enrollNewUser', () => {
    it('registers with CA, enrolls with returned secret, stores encrypted creds, returns meta', async () => {
      mockCa.register.mockResolvedValue('generated-secret');
      mockCa.enroll.mockResolvedValue({
        certificate: '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----',
        key: { toBytes: () => '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----' },
        rootCertificate: '-----BEGIN CERTIFICATE-----\nROOT\n-----END CERTIFICATE-----',
      });

      const result = await fabricEnrollmentService.enrollNewUser({
        userId: 'user-uuid',
        username: 'upps.john',
        mspOrg: 'UPPSMSP',
      });

      expect(mockCa.register).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentID: 'upps.john',
          role: 'client',
          affiliation: '',
          maxEnrollments: 1,
        }),
        expect.any(Object) // admin enrollment object
      );
      expect(mockCa.enroll).toHaveBeenCalledWith({
        enrollmentID: 'upps.john',
        enrollmentSecret: 'generated-secret',
      });
      expect(fabricCredentialService.storeCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
          orgMsp: 'UPPSMSP',
          mspId: 'UPPSMSP',
          certificate: expect.stringContaining('BEGIN CERTIFICATE'),
          privateKey: expect.stringContaining('BEGIN PRIVATE KEY'),
          enrollmentSecret: 'generated-secret',
        })
      );
      expect(result).toEqual({
        enrollmentId: 'upps.john',
        mspId: 'UPPSMSP',
      });
    });

    it('throws if CA register fails (no partial state in DB)', async () => {
      mockCa.register.mockRejectedValue(new Error('Authorization failure'));

      await expect(
        fabricEnrollmentService.enrollNewUser({
          userId: 'user-uuid',
          username: 'upps.john',
          mspOrg: 'UPPSMSP',
        })
      ).rejects.toThrow('Authorization failure');

      expect(fabricCredentialService.storeCredentials).not.toHaveBeenCalled();
    });

    it('throws on unknown mspOrg (no silent default)', async () => {
      await expect(
        fabricEnrollmentService.enrollNewUser({
          userId: 'user-uuid',
          username: 'whoever',
          mspOrg: 'NonexistentMSP',
        })
      ).rejects.toThrow(/Unknown MSP/);
    });
  });

  describe('getCaClientForOrg', () => {
    it('returns a CA client bound to the right URL for UPPS', () => {
      const client = fabricEnrollmentService.getCaClientForOrg('UPPSMSP');
      expect(FabricCAServices).toHaveBeenCalledWith(
        expect.stringContaining(':7040'), // UPPS CA port
        expect.any(Object),
        expect.any(String),
        expect.any(Object)
      );
      expect(client).toBe(mockCa);
    });

    it('returns a CA client bound to the right URL for Sekretariat', () => {
      fabricEnrollmentService.getCaClientForOrg('SekretariatMSP');
      expect(FabricCAServices).toHaveBeenCalledWith(
        expect.stringContaining(':7060'),
        expect.any(Object),
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});
