/**
 * Pinata IPFS Service
 * Handles document storage on IPFS via Pinata
 */

const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const crypto = require('crypto');

class PinataService {
  constructor() {
    this.jwt = config.pinata.jwt;
    this.pinataApiUrl = 'https://api.pinata.cloud';
    this.pinataGateway = config.pinata.gateway;

    if (!this.jwt) {
      console.warn('[Pinata] Warning: JWT not configured. IPFS upload disabled.');
    } else {
      console.log('[Pinata] Service initialized with gateway:', this.pinataGateway);
    }
  }

  /**
   * Test Pinata authentication
   */
  async testAuthentication() {
    try {
      const response = await axios.get(`${this.pinataApiUrl}/data/testAuthentication`, {
        headers: {
          Authorization: `Bearer ${this.jwt}`
        }
      });

      console.log('[Pinata] Authentication test successful:', response.data);
      return { authenticated: true, message: response.data.message };
    } catch (error) {
      console.error('[Pinata] Authentication failed:', error.message);
      return { authenticated: false, error: error.message };
    }
  }

  /**
   * Upload file buffer to Pinata IPFS
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      // Add metadata
      const pinataMetadata = {
        name: filename,
        keyvalues: {
          ...metadata,
          uploadedAt: new Date().toISOString()
        }
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      // Pinning options
      const pinataOptions = {
        cidVersion: 1
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.jwt}`
          }
        }
      );

      const cid = response.data.IpfsHash;
      const size = response.data.PinSize;
      const timestamp = response.data.Timestamp;

      console.log(`[Pinata] File uploaded successfully: ${filename} -> ${cid} (${size} bytes)`);

      return {
        cid,
        size,
        timestamp,
        gateway_url: `${this.pinataGateway}/ipfs/${cid}`,
        pinata_url: `https://gateway.pinata.cloud/ipfs/${cid}`
      };
    } catch (error) {
      console.error('[Pinata] Upload failed:', error.message);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to Pinata IPFS
   */
  async uploadJSON(jsonData, filename, metadata = {}) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      const body = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: filename,
          keyvalues: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            dataType: 'json'
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };

      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinJSONToIPFS`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.jwt}`
          }
        }
      );

      const cid = response.data.IpfsHash;
      const size = response.data.PinSize;
      const timestamp = response.data.Timestamp;

      console.log(`[Pinata] JSON uploaded successfully: ${filename} -> ${cid}`);

      return {
        cid,
        size,
        timestamp,
        gateway_url: `${this.pinataGateway}/ipfs/${cid}`,
        pinata_url: `https://gateway.pinata.cloud/ipfs/${cid}`
      };
    } catch (error) {
      console.error('[Pinata] JSON upload failed:', error.message);
      throw new Error(`IPFS JSON upload failed: ${error.message}`);
    }
  }

  /**
   * Get file from IPFS via gateway
   */
  async getFile(cid) {
    try {
      const url = `${this.pinataGateway}/ipfs/${cid}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      console.log(`[Pinata] File retrieved: ${cid}`);
      return response.data;
    } catch (error) {
      console.error(`[Pinata] Failed to retrieve file ${cid}:`, error.message);
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get JSON from IPFS via gateway
   */
  async getJSON(cid) {
    try {
      const url = `${this.pinataGateway}/ipfs/${cid}`;
      const response = await axios.get(url, {
        timeout: 30000
      });

      console.log(`[Pinata] JSON retrieved: ${cid}`);
      return response.data;
    } catch (error) {
      console.error(`[Pinata] Failed to retrieve JSON ${cid}:`, error.message);
      throw new Error(`IPFS JSON retrieval failed: ${error.message}`);
    }
  }

  /**
   * Unpin file from Pinata (remove from IPFS)
   */
  async unpinFile(cid) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      await axios.delete(
        `${this.pinataApiUrl}/pinning/unpin/${cid}`,
        {
          headers: {
            Authorization: `Bearer ${this.jwt}`
          }
        }
      );

      console.log(`[Pinata] File unpinned: ${cid}`);
      return { success: true, cid };
    } catch (error) {
      console.error(`[Pinata] Failed to unpin ${cid}:`, error.message);
      throw new Error(`IPFS unpin failed: ${error.message}`);
    }
  }

  /**
   * List pinned files
   */
  async listPinnedFiles(filters = {}) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      const params = {
        status: 'pinned',
        ...filters
      };

      const response = await axios.get(
        `${this.pinataApiUrl}/data/pinList`,
        {
          headers: {
            Authorization: `Bearer ${this.jwt}`
          },
          params
        }
      );

      console.log(`[Pinata] Retrieved ${response.data.count} pinned files`);
      return response.data.rows;
    } catch (error) {
      console.error('[Pinata] Failed to list files:', error.message);
      throw new Error(`IPFS list failed: ${error.message}`);
    }
  }

  /**
   * Calculate file hash (SHA-256)
   */
  calculateFileHash(fileBuffer) {
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Verify file integrity by comparing hashes
   */
  verifyFileIntegrity(fileBuffer, expectedHash) {
    const actualHash = this.calculateFileHash(fileBuffer);
    const isValid = actualHash === expectedHash;

    console.log(`[Pinata] File integrity check: ${isValid ? 'VALID' : 'INVALID'}`);
    
    return {
      valid: isValid,
      expectedHash,
      actualHash
    };
  }

  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(cid) {
    return `${this.pinataGateway}/ipfs/${cid}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const auth = await this.testAuthentication();
      return {
        configured: !!this.jwt,
        authenticated: auth.authenticated,
        gateway: this.pinataGateway,
        status: auth.authenticated ? 'healthy' : 'unhealthy'
      };
    } catch (error) {
      return {
        configured: !!this.jwt,
        authenticated: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new PinataService();
