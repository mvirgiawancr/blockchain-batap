const crypto = require('crypto');
const { query } = require('../config/database');

const ENCRYPTION_KEY = Buffer.from(process.env.MSP_ENCRYPTION_KEY, 'hex');
const ENCRYPTION_ALGORITHM = process.env.MSP_ENCRYPTION_ALGORITHM || 'aes-256-cbc';

class FabricCredentialService {
  constructor() {
    console.log('[FabricCredential] Service initialized');
    this.validateEncryptionKey();
  }

  /**
   * Validate encryption key
   */
  validateEncryptionKey() {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
      throw new Error('MSP_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  decrypt(encryptedText, ivHex) {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Store MSP credentials in database (encrypted)
   */
  async storeCredentials({ userId, orgMsp, mspId, certificate, privateKey, caCertificate, enrollmentSecret }) {
    try {
      // Create credentials object
      const credentials = {
        mspId,
        certificate,
        privateKey,
        caCertificate: caCertificate || null,
        enrollmentSecret: enrollmentSecret || null
      };

      // Encrypt credentials
      const { encrypted, iv } = this.encrypt(JSON.stringify(credentials));

      // Update user's msp_credentials column
      const result = await query(
        `UPDATE users 
         SET msp_credentials = $1, 
             msp_org = $2,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING id, username, msp_org`,
        [
          JSON.stringify({ encrypted, iv }),
          orgMsp,
          userId
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      console.log(`[FabricCredential] Stored credentials for user ${userId} (${orgMsp})`);
      return result.rows[0];
    } catch (error) {
      console.error('[FabricCredential] Store error:', error.message);
      throw error;
    }
  }

  /**
   * Get MSP credentials for user (decrypted)
   */
  async getCredentials(userId) {
    try {
      const result = await query(
        `SELECT id, username, msp_org, msp_credentials 
         FROM users 
         WHERE id = $1 AND is_active = TRUE`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      const user = result.rows[0];

      if (!user.msp_credentials) {
        throw new Error('No MSP credentials found for user');
      }

      // Decrypt credentials
      const { encrypted, iv } = user.msp_credentials;
      const decryptedJson = this.decrypt(encrypted, iv);
      const credentials = JSON.parse(decryptedJson);

      return {
        userId: user.id,
        username: user.username,
        orgMsp: user.msp_org,
        ...credentials
      };
    } catch (error) {
      console.error('[FabricCredential] Get error:', error.message);
      throw error;
    }
  }

  /**
   * Check if user has MSP credentials
   */
  async hasCredentials(userId) {
    try {
      const result = await query(
        'SELECT msp_credentials FROM users WHERE id = $1',
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].msp_credentials !== null;
    } catch (error) {
      console.error('[FabricCredential] Has credentials check error:', error.message);
      return false;
    }
  }

  /**
   * Delete MSP credentials
   */
  async deleteCredentials(userId) {
    try {
      await query(
        `UPDATE users
         SET msp_credentials = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );

      console.log(`[FabricCredential] Deleted credentials for user ${userId}`);
    } catch (error) {
      console.error('[FabricCredential] Delete error:', error.message);
      throw error;
    }
  }

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

  /**
   * Update MSP credentials
   */
  async updateCredentials(userId, updates) {
    try {
      // Get existing credentials
      const existing = await this.getCredentials(userId);

      // Merge updates
      const updated = {
        mspId: updates.mspId || existing.mspId,
        certificate: updates.certificate || existing.certificate,
        privateKey: updates.privateKey || existing.privateKey,
        caCertificate: updates.caCertificate !== undefined ? updates.caCertificate : existing.caCertificate,
        enrollmentSecret: updates.enrollmentSecret !== undefined ? updates.enrollmentSecret : existing.enrollmentSecret
      };

      // Re-encrypt and store
      const { encrypted, iv } = this.encrypt(JSON.stringify(updated));

      await query(
        `UPDATE users 
         SET msp_credentials = $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [JSON.stringify({ encrypted, iv }), userId]
      );

      console.log(`[FabricCredential] Updated credentials for user ${userId}`);
    } catch (error) {
      console.error('[FabricCredential] Update error:', error.message);
      throw error;
    }
  }

  /**
   * Get credentials by organization MSP
   */
  async getCredentialsByOrg(orgMsp) {
    try {
      const result = await query(
        `SELECT id, username, msp_org, msp_credentials 
         FROM users 
         WHERE msp_org = $1 AND is_active = TRUE AND msp_credentials IS NOT NULL`,
        [orgMsp]
      );

      return Promise.all(result.rows.map(async (user) => {
        const { encrypted, iv } = user.msp_credentials;
        const decryptedJson = this.decrypt(encrypted, iv);
        const credentials = JSON.parse(decryptedJson);

        return {
          userId: user.id,
          username: user.username,
          orgMsp: user.msp_org,
          ...credentials
        };
      }));
    } catch (error) {
      console.error('[FabricCredential] Get by org error:', error.message);
      throw error;
    }
  }

  /**
   * Rotate encryption for all credentials (if key changes)
   */
  async rotateEncryption(oldKey) {
    try {
      const result = await query(
        'SELECT id, msp_credentials FROM users WHERE msp_credentials IS NOT NULL'
      );

      let rotated = 0;

      for (const user of result.rows) {
        try {
          // Decrypt with old key
          const oldDecipher = crypto.createDecipheriv(
            ENCRYPTION_ALGORITHM,
            Buffer.from(oldKey, 'hex'),
            Buffer.from(user.msp_credentials.iv, 'hex')
          );
          let decrypted = oldDecipher.update(user.msp_credentials.encrypted, 'hex', 'utf8');
          decrypted += oldDecipher.final('utf8');

          // Re-encrypt with new key
          const { encrypted, iv } = this.encrypt(decrypted);

          // Update
          await query(
            'UPDATE users SET msp_credentials = $1 WHERE id = $2',
            [JSON.stringify({ encrypted, iv }), user.id]
          );

          rotated++;
        } catch (err) {
          console.error(`[FabricCredential] Failed to rotate for user ${user.id}:`, err.message);
        }
      }

      console.log(`[FabricCredential] Rotated encryption for ${rotated} credentials`);
      return rotated;
    } catch (error) {
      console.error('[FabricCredential] Rotation error:', error.message);
      throw error;
    }
  }
}

module.exports = new FabricCredentialService();
