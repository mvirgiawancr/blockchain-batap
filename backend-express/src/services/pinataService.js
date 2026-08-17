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
   * Encrypt file buffer using AES-256-CBC
   */
  encryptFile(fileBuffer) {
    try {
      // Generate random encryption key (32 bytes for AES-256)
      const encryptionKey = crypto.randomBytes(32);
      
      // Generate random initialization vector (16 bytes)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
      
      // Encrypt file
      const encryptedBuffer = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      
      console.log(`[Pinata] File encrypted: ${fileBuffer.length} bytes -> ${encryptedBuffer.length} bytes`);
      
      return {
        encryptedBuffer,
        encryptionKey: encryptionKey.toString('hex'),
        iv: iv.toString('hex')
      };
    } catch (error) {
      console.error('[Pinata] Encryption failed:', error.message);
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file buffer using AES-256-CBC
   */
  decryptFile(encryptedBuffer, encryptionKeyHex, ivHex) {
    try {
      // Convert hex strings back to buffers
      const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
      
      // Decrypt file
      const decryptedBuffer = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);
      
      console.log(`[Pinata] File decrypted: ${encryptedBuffer.length} bytes -> ${decryptedBuffer.length} bytes`);
      
      return decryptedBuffer;
    } catch (error) {
      console.error('[Pinata] Decryption failed:', error.message);
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Upload ENCRYPTED file buffer to Pinata IPFS
   */
  async uploadFileEncrypted(fileBuffer, filename, metadata = {}) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      // Encrypt file first
      const { encryptedBuffer, encryptionKey, iv } = this.encryptFile(fileBuffer);
      
      // Upload encrypted file to IPFS
      const formData = new FormData();
      
      // Append encrypted file as buffer directly
      // FormData will handle the buffer correctly
      formData.append('file', encryptedBuffer, {
        filename: `encrypted_${filename}`,
        contentType: 'application/octet-stream'
      });

      // Add metadata
      const pinataMetadata = {
        name: `encrypted_${filename}`,
        keyvalues: {
          ...metadata,
          encrypted: 'true',
          originalFilename: filename,
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

      console.log(`[Pinata] Encrypted file uploaded: ${filename} -> ${cid} (${size} bytes)`);

      return {
        cid,
        size,
        timestamp,
        gateway_url: `${this.pinataGateway}/ipfs/${cid}`,
        pinata_url: `https://gateway.pinata.cloud/ipfs/${cid}`,
        encryptionKey,  // IMPORTANT: Must be stored securely (blockchain private data)
        iv              // IMPORTANT: Must be stored securely
      };
    } catch (error) {
      console.error('[Pinata] Encrypted upload failed:', error.response?.data || error.message);
      throw new Error(`IPFS encrypted upload failed: ${error.message}`);
    }
  }

  /**
   * Download and DECRYPT file from IPFS
   */
  async getFileDecrypted(cid, encryptionKeyHex, ivHex) {
    // Coba beberapa gateway berurutan. Gateway berdedikasi bisa 403 saat akun
    // kena limit plan; fallback ke gateway publik yang masih menyajikan CID.
    const gateways = [
      `${this.pinataGateway}/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://${cid}.ipfs.dweb.link/`,
    ];

    let lastError;
    for (const url of gateways) {
      const gwName = url.split('/ipfs/')[0].replace('https://', '') || url;
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const encryptedBuffer = Buffer.from(response.data);
        // Dekripsi di dalam try: bila gateway balas body salah (mis. halaman error
        // 200), dekripsi gagal dan kita lanjut ke gateway berikutnya.
        const decryptedBuffer = this.decryptFile(encryptedBuffer, encryptionKeyHex, ivHex);

        console.log(`[Pinata] Encrypted file retrieved & decrypted: ${cid} via ${gwName}`);
        return decryptedBuffer;
      } catch (error) {
        lastError = error;
        console.warn(`[Pinata] Gateway gagal (${gwName}) untuk ${cid}: ${error.response?.status || error.message}`);
      }
    }

    console.error(`[Pinata] Semua gateway gagal untuk ${cid}:`, lastError?.message);
    throw new Error(`IPFS decryption retrieval failed: ${lastError?.message}`);
  }

  /**
   * Upload file buffer to Pinata IPFS (PLAIN - No Encryption)
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    try {
      const formData = new FormData();
      
      // Handle both raw Buffer and multer file objects
      if (Buffer.isBuffer(fileBuffer)) {
        formData.append('file', fileBuffer, {
          filename: filename,
          contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
        });
      } else {
        formData.append('file', fileBuffer, filename);
      }

      // Add metadata — sanitize keyvalues (Pinata requires string values, max 255 chars)
      const sanitizedKeyvalues = {};
      for (const [key, value] of Object.entries({ ...metadata, uploadedAt: new Date().toISOString() })) {
        if (value !== null && value !== undefined) {
          sanitizedKeyvalues[key] = String(value).substring(0, 255);
        }
      }
      const pinataMetadata = {
        name: filename.substring(0, 255),
        keyvalues: sanitizedKeyvalues
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
      console.error('[Pinata] Upload failed:', error.response?.data || error.response?.status || error.message);
      throw new Error(`IPFS upload failed: ${error.response?.data?.error || error.message}`);
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
