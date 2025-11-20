/**
 * Encryption Key Service
 * Manages encryption keys for IPFS files (stored in memory for now)
 * TODO: Migrate to PostgreSQL or Fabric Private Data Collection for production
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionKeyService {
  constructor() {
    // In-memory storage for encryption keys
    this.keys = new Map();
    
    logger.info('[EncryptionKey] Service initialized (in-memory storage)');
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
      const keyId = `${submissionId}_${documentType}`;
      
      const keyData = {
        submissionId,
        documentType,
        encryptionKey,  // Hex string
        iv,             // Hex string
        cid,
        storedAt: new Date().toISOString()
      };
      
      this.keys.set(keyId, keyData);
      
      logger.info(`[EncryptionKey] Stored key for ${keyId}`);
      
      return { success: true, keyId };
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
      const keyId = `${submissionId}_${documentType}`;
      
      const keyData = this.keys.get(keyId);
      
      if (!keyData) {
        throw new Error(`Encryption key not found for ${keyId}`);
      }
      
      logger.info(`[EncryptionKey] Retrieved key for ${keyId}`);
      
      return keyData;
    } catch (error) {
      logger.error('[EncryptionKey] Failed to retrieve key:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async hasKey(submissionId, documentType) {
    const keyId = `${submissionId}_${documentType}`;
    return this.keys.has(keyId);
  }

  /**
   * Delete encryption key (GDPR compliance)
   */
  async deleteKey(submissionId, documentType) {
    try {
      const keyId = `${submissionId}_${documentType}`;
      
      const deleted = this.keys.delete(keyId);
      
      if (deleted) {
        logger.info(`[EncryptionKey] Deleted key for ${keyId}`);
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
    const keys = [];
    
    for (const [keyId, keyData] of this.keys.entries()) {
      if (keyData.submissionId === submissionId) {
        keys.push({
          keyId,
          documentType: keyData.documentType,
          cid: keyData.cid,
          storedAt: keyData.storedAt
        });
      }
    }
    
    return keys;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalKeys: this.keys.size,
      storageType: 'in-memory'
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      status: 'healthy',
      keysStored: this.keys.size,
      storageType: 'in-memory'
    };
  }
}

module.exports = new EncryptionKeyService();
