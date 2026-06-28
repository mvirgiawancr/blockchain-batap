/**
 * Fabric CA Enrollment Service
 *
 * On user registration, registers a client identity with the org's Fabric CA
 * and enrolls it to obtain an X.509 certificate + private key. Materials are
 * delegated to fabricCredentialService for encrypted storage.
 *
 * Network assumptions (Fablo dev network, TLS off):
 *   ca.upps.akreditasi.local       -> http://localhost:7040
 *   ca.sekretariat.akreditasi.local-> http://localhost:7060
 *   ca.kea.akreditasi.local        -> http://localhost:7080
 *   ca.asesor.akreditasi.local     -> http://localhost:7100
 *   ca.majelis.akreditasi.local    -> http://localhost:7120
 *
 * Bootstrap admin (per fablo-target/.env): admin / adminpw
 */

const FabricCAServices = require('fabric-ca-client');
const fabricCredentialService = require('./fabricCredentialService');
const logger = require('../utils/logger');

const ORG_TO_CA = {
  UPPSMSP: { url: 'http://localhost:7040', caName: 'ca.upps.akreditasi.local' },
  SekretariatMSP: { url: 'http://localhost:7060', caName: 'ca.sekretariat.akreditasi.local' },
  KEAMSP: { url: 'http://localhost:7080', caName: 'ca.kea.akreditasi.local' },
  AsesorMSP: { url: 'http://localhost:7100', caName: 'ca.asesor.akreditasi.local' },
  MajelisMSP: { url: 'http://localhost:7120', caName: 'ca.majelis.akreditasi.local' },
};

const ADMIN_ENROLLMENT_ID = process.env.FABRIC_CA_ADMIN_NAME || 'admin';
const ADMIN_ENROLLMENT_SECRET = process.env.FABRIC_CA_ADMIN_PASSWORD || 'adminpw';

class FabricEnrollmentService {
  constructor() {
    this._adminCache = {};
  }

  /**
   * Return a FabricCAServices client for the given org MSP.
   */
  getCaClientForOrg(mspOrg) {
    const ca = ORG_TO_CA[mspOrg];
    if (!ca) {
      throw new Error(`Unknown MSP: ${mspOrg}. Valid: ${Object.keys(ORG_TO_CA).join(', ')}`);
    }
    // Use static methods if available (real fabric-ca-client), otherwise provide empty object for mocks
    let cryptoSuite = {};
    if (typeof FabricCAServices.createCryptoSuite === 'function') {
      const realCryptoSuite = FabricCAServices.createCryptoSuite();
      const cryptoKeyStore = FabricCAServices.newCryptoKeyStore();
      realCryptoSuite.setCryptoKeyStore(cryptoKeyStore);
      cryptoSuite = realCryptoSuite;
    }
    return new FabricCAServices(ca.url, { verify: false }, ca.caName, cryptoSuite);
  }

  /**
   * Get (and cache) an admin user context for the org, used as the registrar.
   */
  async _getAdminUser(caClient, mspOrg) {
    if (this._adminCache[mspOrg]) return this._adminCache[mspOrg];

    const enrollment = await caClient.enroll({
      enrollmentID: ADMIN_ENROLLMENT_ID,
      enrollmentSecret: ADMIN_ENROLLMENT_SECRET,
    });

    const adminUser = {
      enrollment,
      getName: () => ADMIN_ENROLLMENT_ID,
      getMSPID: () => mspOrg,
      getIdentity: () => ({ credentials: { certificate: enrollment.certificate } }),
      getSigningIdentity: () => ({
        certificate: enrollment.certificate,
        privateKey: { toBytes: () => enrollment.key.toBytes() },
      }),
    };
    this._adminCache[mspOrg] = adminUser;
    return adminUser;
  }

  /**
   * Register + enroll a new client identity at the org CA, store encrypted
   * credentials in the DB, return public meta.
   *
   * @returns {Promise<{enrollmentId: string, mspId: string}>}
   */
  async enrollNewUser({ userId, username, mspOrg }) {
    const caClient = this.getCaClientForOrg(mspOrg);
    const admin = await this._getAdminUser(caClient, mspOrg);

    const enrollmentId = username.toLowerCase().replace(/[^a-z0-9.-]/g, '-');

    let secret;
    try {
      secret = await caClient.register(
        {
          enrollmentID: enrollmentId,
          role: 'client',
          affiliation: '',
          maxEnrollments: 1,
        },
        admin
      );
    } catch (err) {
      logger.error(`[Enrollment] CA register failed for ${enrollmentId}: ${err.message}`);
      throw err;
    }

    let enrollment;
    try {
      enrollment = await caClient.enroll({
        enrollmentID: enrollmentId,
        enrollmentSecret: secret,
      });
    } catch (err) {
      logger.error(`[Enrollment] CA enroll failed for ${enrollmentId}: ${err.message}`);
      throw err;
    }

    const privateKeyPem = typeof enrollment.key === 'string'
      ? enrollment.key
      : enrollment.key.toBytes();

    const certExpiresAt = this._extractCertExpiry(enrollment.certificate);

    await fabricCredentialService.storeCredentials({
      userId,
      orgMsp: mspOrg,
      mspId: mspOrg,
      certificate: enrollment.certificate,
      privateKey: privateKeyPem,
      caCertificate: enrollment.rootCertificate || null,
      enrollmentSecret: secret,
    });

    await fabricCredentialService.storeEnrollmentMeta(userId, {
      enrollmentId,
      enrollmentSecret: secret,
      certExpiresAt,
    });

    logger.info(`[Enrollment] Enrolled ${enrollmentId} under ${mspOrg} (exp ${certExpiresAt && certExpiresAt.toISOString ? certExpiresAt.toISOString() : certExpiresAt})`);

    return { enrollmentId, mspId: mspOrg };
  }

  _extractCertExpiry(certificatePem) {
    try {
      const crypto = require('crypto');
      const cert = new crypto.X509Certificate(certificatePem);
      return cert.validTo ? new Date(cert.validTo) : null;
    } catch (err) {
      logger.warn(`[Enrollment] Could not parse cert expiry: ${err.message}`);
      return null;
    }
  }
}

module.exports = new FabricEnrollmentService();
