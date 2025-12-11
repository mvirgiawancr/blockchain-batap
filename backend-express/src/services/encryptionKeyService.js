/**
 * Encryption Key Service
 * Manages encryption keys for IPFS files (stored in PostgreSQL)
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { query } = require('../config/database');

class EncryptionKeyService {
  constructor() {
    logger.info('[EncryptionKey] Service initialized (PostgreSQL storage)');
    this.initializeDatabase();
  }

  /**
   * Initialize database table
   */
  async initializeDatabase() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS encryption_keys (
          id SERIAL PRIMARY KEY,
          submission_id VARCHAR(255) NOT NULL,
          document_type VARCHAR(50) NOT NULL,
          encryption_key TEXT NOT NULL,
          encryption_iv TEXT NOT NULL,
          cid TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(submission_id, document_type)
        )
      `);
      
      // Create index for faster lookups
      await query(`
        CREATE INDEX IF NOT EXISTS idx_encryption_keys_submission 
        ON encryption_keys(submission_id)
      `);
      
      logger.info('[EncryptionKey] Database table initialized');
    } catch (error) {
      logger.error('[EncryptionKey] Failed to initialize database:', error);
    }
  }

  /**
   * Generate new encryption key and IV
   */
  generateKey() {
    return {
      key: crypto.randomBytes(32), // 256-bit key for AES-256
      iv: crypto.randomBytes(16)   // 128-bit IV
    };
  }

  /**
   * Store encryption key for a submission's document
   */
  async storeKey(submissionId, documentType, encryptionKey, iv, cid) {
    try {
      const result = await query(
        `INSERT INTO encryption_keys 
         (submission_id, document_type, encryption_key, encryption_iv, cid) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (submission_id, document_type) 
         DO UPDATE SET 
           encryption_key = EXCLUDED.encryption_key,
           encryption_iv = EXCLUDED.encryption_iv,
           cid = EXCLUDED.cid,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [submissionId, documentType, encryptionKey, iv, cid]
      );
      
      const keyId = `${submissionId}_${documentType}`;
      logger.info(`[EncryptionKey] Stored key for ${keyId} (DB ID: ${result.rows[0].id})`);
      
      return { success: true, keyId, dbId: result.rows[0].id };
    } catch (error) {
      logger.error('[EncryptionKey] Failed to store key:', error);
      throw error;
    }
  }

  /**
   * Retrieve encryption key for a submission's document
   */
  async getKey(submissionId, documentType) {
    try {
      const result = await query(
        `SELECT * FROM encryption_keys 
         WHERE submission_id = $1 AND document_type = $2`,
        [submissionId, documentType]
      );
      
      if (result.rows.length === 0) {
        const keyId = `${submissionId}_${documentType}`;
        throw new Error(`Encryption key not found for ${keyId}`);
      }
      
      const row = result.rows[0];
      const keyId = `${submissionId}_${documentType}`;
      
      logger.info(`[EncryptionKey] Retrieved key for ${keyId} from PostgreSQL`);
      
      return {
        submissionId: row.submission_id,
        documentType: row.document_type,
        encryptionKey: row.encryption_key,
        iv: row.encryption_iv,
        cid: row.cid,
        storedAt: row.created_at
      };
    } catch (error) {
      logger.error('[EncryptionKey] Failed to retrieve key:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async hasKey(submissionId, documentType) {
    try {
      const result = await query(
        `SELECT COUNT(*) FROM encryption_keys 
         WHERE submission_id = $1 AND document_type = $2`,
        [submissionId, documentType]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('[EncryptionKey] Failed to check key existence:', error);
      return false;
    }
  }

  /**
   * Delete encryption key (GDPR compliance)
   */
  async deleteKey(submissionId, documentType) {
    try {
      const result = await query(
        `DELETE FROM encryption_keys 
         WHERE submission_id = $1 AND document_type = $2
         RETURNING id`,
        [submissionId, documentType]
      );
      
      const keyId = `${submissionId}_${documentType}`;
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.info(`[EncryptionKey] Deleted key for ${keyId} from PostgreSQL`);
      } else {
        logger.warn(`[EncryptionKey] Key not found for deletion: ${keyId}`);
      }
      
      return { success: deleted, keyId };
    } catch (error) {
      logger.error('[EncryptionKey] Failed to delete key:', error);
      throw error;
    }
  }

  /**
   * List all keys for a submission
   */
  async listKeys(submissionId) {
    try {
      const result = await query(
        `SELECT submission_id, document_type, cid, created_at 
         FROM encryption_keys 
         WHERE submission_id = $1
         ORDER BY created_at DESC`,
        [submissionId]
      );
      
      return result.rows.map(row => ({
        keyId: `${row.submission_id}_${row.document_type}`,
        documentType: row.document_type,
        cid: row.cid,
        storedAt: row.created_at
      }));
    } catch (error) {
      logger.error('[EncryptionKey] Failed to list keys:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_keys,
          COUNT(DISTINCT submission_id) as unique_submissions
         FROM encryption_keys`
      );
      
      return {
        totalKeys: parseInt(result.rows[0].total_keys),
        uniqueSubmissions: parseInt(result.rows[0].unique_submissions),
        storageType: 'PostgreSQL'
      };
    } catch (error) {
      logger.error('[EncryptionKey] Failed to get stats:', error);
      return {
        totalKeys: 0,
        uniqueSubmissions: 0,
        storageType: 'PostgreSQL (error)'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await query('SELECT COUNT(*) FROM encryption_keys');
      
      return {
        status: 'healthy',
        keysStored: parseInt(result.rows[0].count),
        storageType: 'PostgreSQL'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        storageType: 'PostgreSQL'
      };
    }
  }
}

module.exports = new EncryptionKeyService();
