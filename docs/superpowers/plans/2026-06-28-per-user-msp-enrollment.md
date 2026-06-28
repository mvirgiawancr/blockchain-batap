# Per-User MSP Enrollment & Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace org-admin docker-exec signing with per-user Fabric CA enrollment and per-transaction signing, so every blockchain transaction is cryptographically attributable to an individual user.

**Architecture:** On user registration, backend calls Fabric CA (`fabric-ca-client`) to register+enroll a client identity per user; the resulting X.509 cert + private key are encrypted (AES-256-CBC) and stored in the existing `users.msp_credentials` column. A new `fabricGatewayService` uses `fabric-network` SDK to connect to the gateway with the user's identity loaded from DB, signing every transaction as that user. The existing `fabricService` becomes a thin facade that delegates to the gateway service. Chaincode gains an audit field (`invokedByX509`) extracted from `clientIdentity.getID()` so the on-chain record identifies the user, not just the org.

**Tech Stack:**
- Backend: Node.js 18+, Express, CommonJS (`require`), Jest 29
- Fabric SDK: `fabric-ca-client` ^2.2.20 + `fabric-network` ^2.2.20 (sudah ter-install di `backend-express/package.json`)
- Crypto: AES-256-CBC via existing `fabricCredentialService`
- DB: PostgreSQL, kolom `users.msp_credentials` (JSONB) sudah ada
- Network: Hyperledger Fabric 2.5.12, TLS **OFF**, solo orderer, Fablo-generated connection profiles di `fablo-target/fabric-config/connection-profiles/`

---

## File Structure

**Files created:**
- `backend-express/src/services/fabricEnrollmentService.js` — Fabric CA register+enroll wrapper, returns X.509 cert + privateKey
- `backend-express/src/services/fabricGatewayService.js` — `fabric-network` Gateway wrapper, loads identity from `fabricCredentialService`, exposes `submitTransaction(userId, fn, args)` and `evaluateTransaction(userId, fn, args)`
- `backend-express/src/services/__tests__/fabricEnrollmentService.test.js` — unit tests (mocked FabricCAServices)
- `backend-express/src/services/__tests__/fabricGatewayService.test.js` — unit tests (mocked Gateway)
- `backend-express/src/services/__tests__/authService.enrollment.test.js` — integration test: register → enrollment called → creds stored
- `backend-express/sql/005-add-enrollment-columns.sql` — DB migration

**Files modified:**
- `backend-express/src/services/authService.js:20-67` — `register()` calls `fabricEnrollmentService` after user insert; rollback on failure
- `backend-express/src/controllers/authController.js:10-50` — `register()` propagates enrollment failure with actionable error
- `backend-express/src/services/fabricService.js` (whole file) — replace docker-exec with `fabricGatewayService` calls; keep method signatures (`createSubmission`, `setDecision`, etc.) so controllers don't change
- `backend-express/src/config/index.js:73` — remove `SekretariatAdminMSP` default; map role → MSP org consistently
- `chaincode/submission-contract/src/submission-contract.ts:42-48,721` — `assertMSP` records X.509 subject; remove `SekretariatAdminMSP` from `SetDecision` whitelist
- `backend-express/.env.example` — add new env vars

**Files NOT touched (intentionally):**
- `backend-express/src/services/fabricCredentialService.js` — storage layer is already correct, just wasn't being consumed. We wire consumers to it.
- Chaincode transaction logic (only the `assertMSP` helper and audit field change)
- Frontend — backend API surface unchanged

---

## Phase 1: Database Migration

### Task 1: Add enrollment columns to `users`

**Files:**
- Create: `backend-express/sql/005-add-enrollment-columns.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 005-add-enrollment-columns.sql
-- Track Fabric CA enrollment identity per user.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS enrollment_secret TEXT,
  ADD COLUMN IF NOT EXISTS cert_expires_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_enrollment_id
  ON users(enrollment_id)
  WHERE enrollment_id IS NOT NULL;

COMMENT ON COLUMN users.enrollment_id IS 'Fabric CA enrollment ID (username used during ca.register). Unique per CA org.';
COMMENT ON COLUMN users.enrollment_secret IS 'Encrypted enrollment secret returned by Fabric CA register. Stored as {encrypted, iv} JSON.';
COMMENT ON COLUMN users.cert_expires_at IS 'Expiry of the enrolled X.509 certificate. NULL if never enrolled.';
```

- [ ] **Step 2: Apply the migration locally**

Run:
```bash
docker exec -i batap_db psql -U postgres -d lamtek < backend-express/sql/005-add-enrollment-columns.sql
```
Expected: `ALTER TABLE`, `CREATE INDEX`, 3× `COMMENT` printed; no errors.

(If your local DB container has a different name, check with `docker ps | grep postgres`. The DB name comes from `backend-express/.env` `DB_NAME`.)

- [ ] **Step 3: Commit**

```bash
git add backend-express/sql/005-add-enrollment-columns.sql
git commit -m "feat(db): add enrollment_id, enrollment_secret, cert_expires_at columns"
```

---

## Phase 2: Fabric CA Enrollment Service

### Task 2: Write failing tests for `fabricEnrollmentService`

**Files:**
- Create: `backend-express/src/services/__tests__/fabricEnrollmentService.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// backend-express/src/services/__tests__/fabricEnrollmentService.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/fabricEnrollmentService.test.js
```
Expected: FAIL — `Cannot find module '../fabricEnrollmentService'`.

- [ ] **Step 3: Commit (red)**

```bash
git add backend-express/src/services/__tests__/fabricEnrollmentService.test.js
git commit -m "test(enrollment): add failing tests for fabricEnrollmentService"
```

### Task 3: Implement `fabricEnrollmentService`

**Files:**
- Create: `backend-express/src/services/fabricEnrollmentService.js`
- Modify: `backend-express/src/services/fabricCredentialService.js` (add `storeEnrollmentMeta` helper)

- [ ] **Step 1: Add `storeEnrollmentMeta` to `fabricCredentialService.js`**

Insert this method inside the `FabricCredentialService` class (after `storeCredentials`, around line 90):

```javascript
  /**
   * Persist enrollment metadata (enrollment_id, encrypted secret, cert expiry)
   * separate from the full credentials blob. Called after a successful enroll.
   */
  async storeEnrollmentMeta(userId, { enrollmentId, enrollmentSecret, certExpiresAt }) {
    const { encrypted, iv } = this.encrypt(enrollmentSecret);
    await query(
      `UPDATE users
       SET enrollment_id = $1,
           enrollment_secret = $2,
           cert_expires_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [enrollmentId, JSON.stringify({ encrypted, iv }), certExpiresAt, userId]
    );
  }
```

- [ ] **Step 2: Write the implementation**

Create `backend-express/src/services/fabricEnrollmentService.js`:

```javascript
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
 *   ca.upps.akreditasi.local kea   -> http://localhost:7080
 *   ca.asesor.akreditasi.local     -> http://localhost:7100
 *   ca.majelis.akreditasi.local    -> http://localhost:7120
 *
 * Bootstrap admin (per fablo-target/.env): admin / adminpw
 */

const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const fabricCredentialService = require('./fabricCredentialService');
const logger = require('../utils/logger');

const ORG_TO_CA = {
  UPPSMSP: { url: 'http://localhost:7040', caName: 'ca.upps.akreditasi.local', profilePath: 'connection-profile-upps.json' },
  SekretariatMSP: { url: 'http://localhost:7060', caName: 'ca.sekretariat.akreditasi.local', profilePath: 'connection-profile-sekretariat.json' },
  KEAMSP: { url: 'http://localhost:7080', caName: 'ca.kea.akreditasi.local', profilePath: 'connection-profile-kea.json' },
  AsesorMSP: { url: 'http://localhost:7100', caName: 'ca.asesor.akreditasi.local', profilePath: 'connection-profile-asesor.json' },
  MajelisMSP: { url: 'http://localhost:7120', caName: 'ca.majelis.akreditasi.local', profilePath: 'connection-profile-majelis.json' },
};

const ADMIN_ENROLLMENT_ID = process.env.FABRIC_CA_ADMIN_NAME || 'admin';
const ADMIN_ENROLLMENT_SECRET = process.env.FABRIC_CA_ADMIN_PASSWORD || 'adminpw';
const CRYPTO_MATERIALS_BASE = path.resolve(__dirname, '../../../fablo-target/fabric-config/crypto-config/peerOrganizations');
const CONNECTION_PROFILES_BASE = path.resolve(__dirname, '../../../fablo-target/fabric-config/connection-profiles');

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
    const tlsCert = undefined; // TLS off
    const cryptoSuite = FabricCAServices.createCryptoSuite();
    const cryptoKeyStore = FabricCAServices.newCryptoKeyStore();
    cryptoSuite.setCryptoKeyStore(cryptoKeyStore);
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
      // Re-enrollment edge case: identity already exists. Allow re-enroll via
      // the original secret if the caller still has it. For now, surface the error.
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

    // Cert expiry: Fabric CA default certs are 1 year. Decode it from the cert.
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

    logger.info(`[Enrollment] Enrolled ${enrollmentId} under ${mspOrg} (exp ${certExpiresAt?.toISOString()})`);

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
```

- [ ] **Step 3: Run the tests — they should pass**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/fabricEnrollmentService.test.js
```
Expected: PASS — all 5 test cases green.

- [ ] **Step 4: Commit (green)**

```bash
git add backend-express/src/services/fabricEnrollmentService.js backend-express/src/services/fabricCredentialService.js
git commit -m "feat(enrollment): implement Fabric CA register+enroll service"
```

---

## Phase 3: Wire Enrollment to Registration

### Task 4: Write failing test for `authService.register` enrollment integration

**Files:**
- Create: `backend-express/src/services/__tests__/authService.enrollment.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// backend-express/src/services/__tests__/authService.enrollment.test.js
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
    // Pass-through bcrypt hashing by mocking it via authService is hard;
    // instead, supply a real password and accept the bcrypt cost in tests.
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
    const lastCall = query.mock.calls[query.mock.calls.length - 1][0];
    expect(lastCall).toMatch(/DELETE FROM users|UPDATE users SET is_active/);
  });
});
```

- [ ] **Step 2: Run the test — it should fail**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/authService.enrollment.test.js
```
Expected: FAIL — `expect(fabricEnrollmentService.enrollNewUser).toHaveBeenCalled()` fails because `register` does not yet call it.

- [ ] **Step 3: Commit (red)**

```bash
git add backend-express/src/services/__tests__/authService.enrollment.test.js
git commit -m "test(auth): add failing test for register->enroll integration"
```

### Task 5: Modify `authService.register` to enroll

**Files:**
- Modify: `backend-express/src/services/authService.js:1-67`

- [ ] **Step 1: Add the require**

At the top of `authService.js`, after line 5 (`const { query } = require('../config/database');`), add:

```javascript
const fabricEnrollmentService = require('./fabricEnrollmentService');
```

- [ ] **Step 2: Replace the `register` method body**

Replace lines 20-67 (the existing `register` method) with:

```javascript
  async register({ username, password, role, name, institution, programStudi, mspOrg }) {
    // Validate role
    const validRoles = ['upps', 'sekretariat', 'assessor', 'kea', 'asesor', 'majelis', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    if (!mspOrg) {
      throw new Error('mspOrg is required for Fabric CA enrollment');
    }

    // Check if username exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUser.rows.length > 0) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let user;
    try {
      const result = await query(
        `INSERT INTO users
         (username, password_hash, role, name, institution, program_studi, msp_org)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, role, name, institution, created_at`,
        [username, passwordHash, role, name, institution, programStudi || null, mspOrg]
      );
      user = result.rows[0];
    } catch (err) {
      console.error('[AuthService] DB insert failed:', err.message);
      throw err;
    }

    // Enroll user with Fabric CA. If this fails, roll back the user row so we
    // don't end up with an un-authenticatable half-state.
    let enrollment;
    try {
      enrollment = await fabricEnrollmentService.enrollNewUser({
        userId: user.id,
        username: user.username,
        mspOrg,
      });
    } catch (err) {
      console.error(`[AuthService] Enrollment failed for ${user.username}, rolling back: ${err.message}`);
      await query('DELETE FROM users WHERE id = $1', [user.id]);
      throw new Error(`Registration failed during Fabric CA enrollment: ${err.message}`);
    }

    await this.logAudit({
      userId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      details: { username, role, institution, enrollmentId: enrollment.enrollmentId }
    });

    console.log(`[AuthService] User registered & enrolled: ${username} (${role})`);
    return { ...user, enrollmentId: enrollment.enrollmentId };
  }
```

- [ ] **Step 3: Run the test — it should pass**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/authService.enrollment.test.js
```
Expected: PASS — both test cases green.

- [ ] **Step 4: Commit (green)**

```bash
git add backend-express/src/services/authService.js
git commit -m "feat(auth): auto-enroll user with Fabric CA on register, rollback on failure"
```

### Task 6: Update `.env.example`

**Files:**
- Modify: `backend-express/.env.example`

- [ ] **Step 1: Add the new env vars**

Append to `backend-express/.env.example`:

```bash
# Fabric CA bootstrap admin (per fablo-target/.env, default dev creds)
FABRIC_CA_ADMIN_NAME=admin
FABRIC_CA_ADMIN_PASSWORD=adminpw
```

- [ ] **Step 2: Commit**

```bash
git add backend-express/.env.example
git commit -m "docs(env): document Fabric CA admin credentials"
```

---

## Phase 4: Fabric Gateway Service (Per-User Signing)

### Task 7: Write failing tests for `fabricGatewayService`

**Files:**
- Create: `backend-express/src/services/__tests__/fabricGatewayService.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// backend-express/src/services/__tests__/fabricGatewayService.test.js
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
```

- [ ] **Step 2: Run the test — it should fail**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/fabricGatewayService.test.js
```
Expected: FAIL — `Cannot find module '../fabricGatewayService'`.

- [ ] **Step 3: Commit (red)**

```bash
git add backend-express/src/services/__tests__/fabricGatewayService.test.js
git commit -m "test(gateway): add failing tests for fabricGatewayService"
```

### Task 8: Implement `fabricGatewayService`

**Files:**
- Create: `backend-express/src/services/fabricGatewayService.js`

- [ ] **Step 1: Write the implementation**

```javascript
/**
 * Fabric Gateway Service (per-user signing)
 *
 * Replaces the docker-exec approach in fabricService.js. Each transaction is
 * signed with the identity of the user invoking it — loaded from the DB via
 * fabricCredentialService.
 *
 * Uses fabric-network SDK (already a dependency). Connection profiles are
 * generated by Fablo at fablo-target/fabric-config/connection-profiles/.
 */

const fs = require('fs');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const fabricCredentialService = require('./fabricCredentialService');
const logger = require('../utils/logger');

const CONNECTION_PROFILES_DIR = path.resolve(
  __dirname,
  '../../../fablo-target/fabric-config/connection-profiles'
);

const MSP_TO_PROFILE = {
  UPPSMSP: 'connection-profile-upps.json',
  SekretariatMSP: 'connection-profile-sekretariat.json',
  KEAMSP: 'connection-profile-kea.json',
  AsesorMSP: 'connection-profile-asesor.json',
  MajelisMSP: 'connection-profile-majelis.json',
};

class FabricGatewayService {
  constructor() {
    this._profileCache = {};
  }

  _loadConnectionProfile(mspId) {
    if (this._profileCache[mspId]) return this._profileCache[mspId];
    const file = MSP_TO_PROFILE[mspId];
    if (!file) throw new Error(`No connection profile mapped for MSP: ${mspId}`);
    const fullPath = path.join(CONNECTION_PROFILES_DIR, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Connection profile not found: ${fullPath}`);
    }
    const profile = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    this._profileCache[mspId] = profile;
    return profile;
  }

  async _buildWalletIdentity(credentials) {
    const wallet = await Wallets.newInMemoryWallet();
    await wallet.put(credentials.userId, {
      credentials: {
        certificate: credentials.certificate,
        privateKey: credentials.privateKey,
      },
      mspId: credentials.mspId,
      type: 'X.509',
    });
    return { wallet, identityLabel: credentials.userId };
  }

  async _withGateway(userId, action) {
    const credentials = await fabricCredentialService.getCredentials(userId);
    const profile = this._loadConnectionProfile(credentials.mspId);
    const { wallet, identityLabel } = await this._buildWalletIdentity(credentials);

    const gateway = new Gateway();
    try {
      await gateway.connect(profile, {
        wallet,
        identity: identityLabel,
        discovery: { enabled: true, asLocalhost: true },
      });
      return await action(gateway);
    } finally {
      gateway.disconnect();
    }
  }

  /**
   * Submit a transaction (write). Signed by the user's identity.
   * @returns {Promise<any>} Parsed JSON response, or raw string if not JSON.
   */
  async submitTransaction(userId, functionName, args = []) {
    logger.info(`[Gateway] submitTransaction userId=${userId} fn=${functionName} args=${args.length}`);
    return await this._withGateway(userId, async (gateway) => {
      const network = await gateway.getNetwork('akreditasi');
      const contract = network.getContract('submission-contract');
      const payload = await contract.submitTransaction(functionName, ...args);
      const resultStr = payload.toString();
      try {
        return JSON.parse(resultStr);
      } catch {
        return resultStr;
      }
    });
  }

  /**
   * Evaluate a transaction (read). Signed by the user's identity.
   */
  async evaluateTransaction(userId, functionName, args = []) {
    logger.info(`[Gateway] evaluateTransaction userId=${userId} fn=${functionName}`);
    return await this._withGateway(userId, async (gateway) => {
      const network = await gateway.getNetwork('akreditasi');
      const contract = network.getContract('submission-contract');
      const payload = await contract.evaluateTransaction(functionName, ...args);
      const resultStr = payload.toString();
      try {
        return JSON.parse(resultStr);
      } catch {
        return resultStr;
      }
    });
  }
}

module.exports = new FabricGatewayService();
```

- [ ] **Step 2: Run the tests — they should pass**

Run:
```bash
cd backend-express && npx jest src/services/__tests__/fabricGatewayService.test.js
```
Expected: PASS — all 4 test cases green.

- [ ] **Step 3: Commit (green)**

```bash
git add backend-express/src/services/fabricGatewayService.js
git commit -m "feat(gateway): implement per-user signing via fabric-network SDK"
```

---

## Phase 5: Refactor `fabricService` to Use Gateway

The goal: `fabricService` keeps its public method signatures (so controllers don't change), but every method now delegates to `fabricGatewayService` instead of `docker exec`. The `mspOrg` option is replaced by `userId` — controllers must pass the authenticated user's ID.

### Task 9: Update controllers to pass `userId` instead of `mspOrg`

**Files:**
- Modify: `backend-express/src/controllers/submissionController.js`
- Modify: `backend-express/src/controllers/sekretariatController.js`
- Modify: `backend-express/src/controllers/keaController.js`
- Modify: `backend-express/src/controllers/asesorController.js`
- (and any other controller that calls `fabricService.*({ mspOrg: ... })`)

- [ ] **Step 1: Find every call site that passes `mspOrg`**

Run:
```bash
cd backend-express && grep -rn "mspOrg:" src/controllers src/services/fabricService.js | head -60
```
This produces a list of call sites. Each `{ mspOrg: req.user.msp_org }` (or similar) becomes `{ userId: req.user.id }`.

- [ ] **Step 2: Replace each occurrence**

For each call site identified in Step 1, replace the option object. Example transformation:

Before:
```javascript
await fabricService.createSubmission(submissionData, { mspOrg: req.user.msp_org });
```

After:
```javascript
await fabricService.createSubmission(submissionData, { userId: req.user.id });
```

Apply with a single sed-style pass (manual review recommended):
```bash
cd backend-express && grep -rl "mspOrg:" src/controllers | xargs sed -i.bak 's/mspOrg: req\.user\.msp_org/userId: req.user.id/g'
```
Then remove backup files:
```bash
find src/controllers -name "*.bak" -delete
```

- [ ] **Step 3: Verify no `mspOrg:` references remain in controllers**

Run:
```bash
cd backend-express && grep -rn "mspOrg:" src/controllers
```
Expected: empty output (or only comments).

- [ ] **Step 4: Commit**

```bash
git add backend-express/src/controllers/
git commit -m "refactor(controllers): pass userId instead of mspOrg for per-user signing"
```

### Task 10: Replace `fabricService` docker-exec internals with `fabricGatewayService`

**Files:**
- Modify: `backend-express/src/services/fabricService.js` (whole file)

- [ ] **Step 1: Rewrite `fabricService.js`**

Replace the entire file content with:

```javascript
/**
 * Fabric Service — thin facade over fabricGatewayService.
 *
 * Preserves the method signatures expected by controllers (createSubmission,
 * setDecision, etc.) but signs every transaction with the user's identity
 * loaded from the DB.
 *
 * The previous implementation used `docker exec cli.<org> peer chaincode ...`
 * which signed as the org admin. That path is removed.
 */

const fabricGatewayService = require('./fabricGatewayService');
const logger = require('../utils/logger');

class FabricService {
  constructor() {
    this.isConnected = false;
    logger.info('[Fabric] Service initialized (per-user signing via Gateway)');
  }

  async connect() {
    // No persistent connection — each tx opens its own gateway.
    this.isConnected = true;
    logger.info('[Fabric] Ready (lazy gateway per request)');
  }

  async disconnect() {
    this.isConnected = false;
  }

  _requireUserId(options) {
    const userId = options && options.userId;
    if (!userId) {
      throw new Error('userId option is required for per-user Fabric invocation');
    }
    return userId;
  }

  async invokeChaincode(functionName, args, options = {}) {
    const userId = this._requireUserId(options);
    logger.info(`[Fabric] invoke ${functionName} as user ${userId}`);
    return await fabricGatewayService.submitTransaction(userId, functionName, args);
  }

  async queryChaincode(functionName, args = [], options = {}) {
    const userId = this._requireUserId(options);
    return await fabricGatewayService.evaluateTransaction(userId, functionName, args);
  }

  async createSubmission(submissionData, options = {}) {
    const submissionId = submissionData.submissionId || submissionData.id;
    const submissionObject = {
      programStudi: submissionData.programStudi || submissionData.programStudy || '',
      institusi: submissionData.institusi || submissionData.universityName || '',
      documents: submissionData.documents || [],
      status: submissionData.status || 'under_review',
    };
    return await this.invokeChaincode('CreateSubmission', [
      submissionId,
      JSON.stringify(submissionObject),
    ], options);
  }

  async attachAIRecommendation(recommendationData, options = {}) {
    const submissionId = recommendationData.submissionId;
    const aiData = {
      submissionId,
      status: 'completed',
      processedAt: recommendationData.processedAt || new Date().toISOString(),
      ai_version: 'LAM-TEK-2025-v1.0',
      hasLED: recommendationData.hasLED || false,
      hasLKPS: recommendationData.hasLKPS || false,
      readyForScoring: recommendationData.readyForScoring || false,
      notes: recommendationData.notes || '',
      analyzedAt: recommendationData.analyzedAt || new Date().toISOString(),
      scoring: recommendationData.scoring || recommendationData.scoring_summary,
      scoring_available: !!(recommendationData.scoring || recommendationData.scoring_summary),
    };
    return await this.invokeChaincode('AttachAIRecommendation', [
      submissionId, JSON.stringify(aiData),
    ], options);
  }

  async submitSubmission(submissionData, options = {}) {
    await this.createSubmission(submissionData, options);
    if (submissionData.ai) {
      await this.attachAIRecommendation({ ...submissionData.ai, submissionId: submissionData.submissionId }, options);
    }
    return { success: true };
  }

  async setDecision(submissionId, decision, notes, decidedBy, options = {}) {
    return await this.invokeChaincode('SetDecision', [submissionId, decision, notes, decidedBy], options);
  }

  async updateDocuments(submissionId, newDocuments, options = {}) {
    return await this.invokeChaincode('UpdateDocuments', [submissionId, JSON.stringify(newDocuments)], options);
  }

  async querySubmission(submissionId, options = {}) {
    return await this.queryChaincode('QuerySubmission', [submissionId], options);
  }

  async queryAllSubmissions(options = {}) {
    return await this.queryChaincode('QueryAllSubmissions', [], options);
  }

  async querySubmissionsByStatus(status, options = {}) {
    return await this.queryChaincode('QuerySubmissionsByStatus', [status], options);
  }

  async querySubmissionsByInstitusi(institusi, options = {}) {
    return await this.queryChaincode('QuerySubmissionsByInstitusi', [institusi], options);
  }

  async getSubmissionHistory(submissionId, options = {}) {
    return await this.queryChaincode('GetSubmissionHistory', [submissionId], options);
  }

  async getAllSubmissions(options = {}) {
    const result = await this.queryAllSubmissions(options);
    return Array.isArray(result) ? result : [];
  }

  async getSubmission(submissionId, options = {}) {
    return await this.querySubmission(submissionId, options);
  }

  async getSubmissionsByProgramStudi(programStudi, options = {}) {
    const all = await this.getAllSubmissions(options);
    return all.filter(s => s.programStudi && s.programStudi.toLowerCase().includes(programStudi.toLowerCase()));
  }

  async updateSubmission(submissionId, updates, options = {}) {
    if (updates.scoringResult) {
      return await this.invokeChaincode('SetScoringResult', [submissionId, JSON.stringify(updates.scoringResult)], options);
    }
    throw new Error('Direct submission update not supported. Use setDecision, updateDocuments, or provide scoringResult.');
  }

  async deleteSubmission() {
    throw new Error('Deletion not supported in blockchain. Submissions are immutable.');
  }

  async offerAssessorPair(submissionId, assessor1Id, assessor1Name, assessor2Id, assessor2Name, offeredBy, options = {}) {
    return await this.invokeChaincode('OfferAssessorPair', [submissionId, assessor1Id, assessor1Name, assessor2Id, assessor2Name, offeredBy], options);
  }

  async respondToOffer(submissionId, assessorId, response, notes, options = {}) {
    return await this.invokeChaincode('RespondToOffer', [submissionId, assessorId, response, notes], options);
  }

  async uppsRespondToOffer(submissionId, response, notes, respondedBy, options = {}) {
    return await this.invokeChaincode('UPPSRespondToOffer', [submissionId, response, notes, respondedBy], options);
  }

  async submitAKAssessment(submissionId, assessorId, assessorName, scores, notes, options = {}) {
    return await this.invokeChaincode('SubmitAKAssessment', [submissionId, assessorId, assessorName, JSON.stringify(scores), notes], options);
  }

  async checkAKConsistency(submissionId, consistent, checkedBy, notes, options = {}) {
    return await this.invokeChaincode('CheckAKConsistency', [submissionId, consistent ? 'true' : 'false', checkedBy, notes], options);
  }

  async keaReviewRejection(submissionId, decision, notes, reviewedBy, options = {}) {
    return await this.invokeChaincode('KEAReviewRejection', [submissionId, decision, notes || '', reviewedBy], options);
  }

  async submitALExecution(submissionId, executionData, options = {}) {
    return await this.invokeChaincode('SubmitALExecution', [submissionId, JSON.stringify(executionData)], options);
  }

  async submitUPPSResponse(submissionId, responseData, options = {}) {
    return await this.invokeChaincode('SubmitUPPSResponse', [submissionId, JSON.stringify(responseData)], options);
  }

  async verifyALResult(submissionId, verificationData, options = {}) {
    return await this.invokeChaincode('VerifyALResult', [submissionId, JSON.stringify(verificationData)], options);
  }

  async finalizeAccreditation(submissionId, decisionData, options = {}) {
    return await this.invokeChaincode('FinalizeAccreditation', [submissionId, JSON.stringify(decisionData)], options);
  }
}

module.exports = new FabricService();
```

- [ ] **Step 2: Run all existing tests to catch signature regressions**

Run:
```bash
cd backend-express && npx jest --coverage
```
Expected: all tests pass. If a controller test fails because it passes `mspOrg`, repeat Task 9 for that file.

- [ ] **Step 3: Commit**

```bash
git add backend-express/src/services/fabricService.js
git commit -m "refactor(fabric): replace docker-exec with per-user gateway signing"
```

---

## Phase 6: Cleanup & Chaincode Audit

### Task 11: Remove `SekretariatAdminMSP` ghost alias

**Files:**
- Modify: `backend-express/src/config/index.js:73`
- Modify: `chaincode/submission-contract/src/submission-contract.ts:721`

- [ ] **Step 1: Fix backend config**

In `backend-express/src/config/index.js`, find line 73:
```javascript
mspId: process.env.FABRIC_MSP_ID || 'SekretariatAdminMSP',
```
Replace with:
```javascript
mspId: process.env.FABRIC_MSP_ID || 'SekretariatMSP',
```

- [ ] **Step 2: Fix chaincode SetDecision whitelist**

In `chaincode/submission-contract/src/submission-contract.ts`, find line 721:
```typescript
const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'SekretariatAdminMSP', 'AsesorMSP', 'KEAMSP', 'MajelisMSP'], 'SetDecision');
```
Replace with:
```typescript
const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'AsesorMSP', 'KEAMSP', 'MajelisMSP'], 'SetDecision');
```

- [ ] **Step 3: Build chaincode to confirm TypeScript still compiles**

Run:
```bash
cd chaincode/submission-contract && npm run build
```
Expected: build succeeds, `dist/` updated.

- [ ] **Step 4: Commit**

```bash
git add backend-express/src/config/index.js chaincode/submission-contract/src/submission-contract.ts chaincode/submission-contract/dist/
git commit -m "fix(msp): remove SekretariatAdminMSP ghost alias from config and chaincode"
```

### Task 12: Add X.509 audit field in chaincode `assertMSP`

**Files:**
- Modify: `chaincode/submission-contract/src/submission-contract.ts:42-48`
- Modify: `chaincode/submission-contract/src/types.ts` (add field to `Submission` type)

- [ ] **Step 1: Add `invokedByX509` to the Submission type**

In `chaincode/submission-contract/src/types.ts`, find the `Submission` interface and add a field:

```typescript
export interface Submission {
    submissionId: string;
    programStudi: string;
    institusi: string;
    documents: Document[];
    status: string;
    version: number;
    submittedBy: string;
    submittedByMsp: string;
    invokedByX509?: string; // X.509 subject DN of the identity that created this submission
    updatedBy: string;
    updatedByMsp: string;
    updatedByX509?: string; // X.509 subject DN of the last identity that updated this submission
    createdAt: string;
    updatedAt: string;
    docType: string;
    ai?: AIRecommendation;
    scoringResult?: any;
    programType?: string;
}
```

(If the existing `Submission` interface has slightly different fields, keep them and just add the two `*X509` fields.)

- [ ] **Step 2: Augment `assertMSP` to expose the X.509 subject**

In `chaincode/submission-contract/src/submission-contract.ts`, replace lines 42-48:

```typescript
    private assertMSP(ctx: Context, allowedMSPs: string[], action: string): { mspId: string; x509Subject: string } {
        const mspId = ctx.clientIdentity.getMSPID();
        if (!allowedMSPs.includes(mspId)) {
            throw new Error(`Access denied for ${action}. Required MSPs: ${allowedMSPs.join(', ')}, but got ${mspId}`);
        }
        let x509Subject = '';
        try {
            x509Subject = ctx.clientIdentity.getID(); // e.g. "x509::CN=upps.john,OU=client+OU=...::CN=fabric-ca-server"
        } catch (err) {
            x509Subject = 'unknown';
        }
        return { mspId, x509Subject };
    }
```

- [ ] **Step 3: Update every call site to consume the new return shape**

Every existing `const mspId = this.assertMSP(ctx, [...], 'X');` line needs to destructure the new return. Run:

```bash
cd chaincode/submission-contract && grep -n "const mspId = this.assertMSP" src/submission-contract.ts
```

For each match, replace `const mspId = this.assertMSP(...)` with `const { mspId, x509Subject } = this.assertMSP(...)`.

- [ ] **Step 4: Persist X.509 into Submission state**

In `CreateSubmission` (around line 93-111), inside the `submission` object literal, add:

```typescript
            invokedByX509: x509Subject,
            updatedByX509: x509Subject,
```

In every other transaction function that does `submission.updatedByMsp = mspId;` (e.g. lines 239, 324, 420, 500, 573, 619, 659, 695, 742), add immediately after:

```typescript
            submission.updatedByX509 = x509Subject;
```

- [ ] **Step 5: Write a unit test for the audit field**

Create `chaincode/submission-contract/test/audit-field.test.ts`:

```typescript
import { Context } from 'fabric-contract-api';
import { SubmissionContract } from '../src/submission-contract';

describe('Submission audit fields', () => {
  it('persists invokedByX509 from clientIdentity.getID()', async () => {
    const ctx = {
      clientIdentity: {
        getMSPID: () => 'UPPSMSP',
        getID: () => 'x509::CN=upps.john,OU=fabric::CN=ca.upps.akreditasi.local',
      },
      stub: {
        getState: async () => Buffer.from(''),
        putState: async (id: string, buf: Buffer) => {
          const stored = JSON.parse(buf.toString());
          expect(stored.invokedByX509).toContain('CN=upps.john');
          expect(stored.updatedByX509).toContain('CN=upps.john');
        },
        getTxTimestamp: () => ({ seconds: { toNumber: () => 1700000000 }, nanos: 0 }),
      },
    } as unknown as Context;

    const contract = new SubmissionContract();
    await contract.CreateSubmission(
      ctx,
      'SUB-1',
      JSON.stringify({ programStudi: 'Teknik Informatika', institusi: 'UPPS Test', documents: [] })
    );
  });
});
```

- [ ] **Step 6: Run the test**

Run:
```bash
cd chaincode/submission-contract && npm test
```
Expected: PASS.

- [ ] **Step 7: Build chaincode**

Run:
```bash
cd chaincode/submission-contract && npm run build
```
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add chaincode/submission-contract/
git commit -m "feat(chaincode): persist invokedByX509/updatedByX509 audit fields"
```

### Task 13: Redeploy chaincode and run end-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Re-deploy chaincode to the dev network**

Run:
```bash
cd fablo-target && fablo chaincode install submission-contract 1.0
```
(If `fablo` is not on PATH, use `./fablo` from the repo root, or follow `fablo-target/fabric-docker/scripts/chaincode/install.sh`.)

Expected: chaincode installed at sequence N+1.

- [ ] **Step 2: Register a fresh UPPS user via the API**

Run:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"smoke.john","password":"Password123!","role":"upps","name":"Smoke John","mspOrg":"UPPSMSP"}'
```
Expected: 200 with `enrollmentId: "smoke.john"`. Check the DB:
```bash
docker exec -i batap_db psql -U postgres -d lamtek -c "SELECT id, username, msp_org, enrollment_id, cert_expires_at IS NOT NULL AS has_cert_expiry FROM users WHERE username='smoke.john';"
```
Expected: `enrollment_id = smoke.john`, `has_cert_expiry = t`.

- [ ] **Step 3: Login and invoke a chaincode transaction**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"smoke.john","password":"Password123!"}' | jq -r '.data.accessToken')

curl -X POST http://localhost:3000/api/v1/submissions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"submissionId":"SMOKE-1","programStudi":"Teknik Informatika","institusi":"UPPS Smoke","documents":[]}'
```
Expected: 201/200 success.

- [ ] **Step 4: Verify on-chain state has the X.509 audit field**

Run:
```bash
docker exec cli.upps.akreditasi.local peer chaincode query \
  -C akreditasi -n submission-contract \
  -c '{"function":"QuerySubmission","Args":["SMOKE-1"]}'
```
Expected: JSON output contains `"invokedByX509":"x509::CN=smoke.john,..."` and `"updatedByX509":"x509::CN=smoke.john,..."`.

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "test: e2e smoke — per-user enrollment & signing verified"
```

---

## Self-Review

**Spec coverage:**
- ✅ Step 1 (register email+password): covered by Task 5 (register flow unchanged)
- ✅ Step 2 (generate MSP, store in server): Task 3 `fabricEnrollmentService` registers + enrolls, Task 3 stores via `fabricCredentialService`
- ✅ Step 3 (email, password, MSP ID in DB): Task 1 adds `enrollment_id` column; existing `msp_org` and `msp_credentials` already there
- ✅ Step 4 (check MSP valid before invoke): Task 8 `fabricGatewayService` requires valid credentials to sign; cert expiry stored in Task 3 (`_extractCertExpiry`)
- ✅ Step 5 (invoke Fabric): Tasks 8 + 10 — invoke as user, not org admin
- ✅ Bonus: chaincode records the X.509 subject (Task 12) — real on-chain auditability

**Placeholder scan:** no "TBD", "implement later", "add appropriate error handling" — all code blocks are complete.

**Type consistency:**
- `fabricEnrollmentService.enrollNewUser({ userId, username, mspOrg })` → returns `{ enrollmentId, mspId }`. Call site in Task 5 uses both fields.
- `fabricGatewayService.submitTransaction(userId, functionName, args)` — called by `fabricService.invokeChaincode(functionName, args, { userId })` in Task 10. Consistent.
- Chaincode `assertMSP` return type changes from `string` to `{ mspId, x509Subject }`. All call sites updated in Task 12 Step 3.
- `Submission` interface gains `invokedByX509?` / `updatedByX509?` (optional, backwards compatible with existing on-chain state).

**Risks flagged for executor:**
1. **Chaincode redeploy requires sequence bump.** Current sequence is 1 (per `fablo-config.json`). Task 13 uses Fablo's install command, which handles this — but verify the new sequence is `2`.
2. **Fabric CA admin password is `adminpw` in dev.** Production must override `FABRIC_CA_ADMIN_PASSWORD` env var.
3. **Affiliation is `''` (root).** Fablo's CA config has empty affiliations, so this works for dev. For production with org-scoped affiliations, the enrollment service will need updating.
4. **Existing users have no `enrollment_id`.** They will fail any transaction attempt via the new path. A one-off backfill script is needed for production data — out of scope for this plan, but flag it.
5. **TLS is off.** All connections use `grpc://` and `http://`. This is fine for dev but must be addressed before any production rollout.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-per-user-msp-enrollment.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
