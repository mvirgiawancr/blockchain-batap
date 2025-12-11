const authService = require('../services/authService');
const fabricCredentialService = require('../services/fabricCredentialService');

class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  async register(req, res) {
    try {
      const { username, password, role, name, institution, programStudi, mspOrg } = req.body;

      // Validate required fields
      if (!username || !password || !role || !name || !mspOrg) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['username', 'password', 'role', 'name', 'mspOrg']
        });
      }

      // Password strength check
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
      }

      const user = await authService.register({
        username,
        password,
        role,
        name,
        institution,
        programStudi,
        mspOrg
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
      });
    } catch (error) {
      console.error('[AuthController] Register error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login({
        username,
        password,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('[AuthController] Login error:', error.message);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout user
   */
  async logout(req, res) {
    try {
      const token = req.token; // From authenticate middleware

      await authService.logout(token);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('[AuthController] Logout error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current user info
   */
  async getCurrentUser(req, res) {
    try {
      // User already attached by authenticate middleware
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      console.error('[AuthController] Get current user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      console.error('[AuthController] Refresh token error:', error.message);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/auth/change-password
   * Change user password
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Old password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        });
      }

      await authService.changePassword(req.user.id, oldPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      console.error('[AuthController] Change password error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/auth/msp
   * Store encrypted MSP credentials for current user
   */
  async saveMspCredentials(req, res) {
    try {
      const { orgMsp, mspId, certificate, privateKey, caCertificate, enrollmentSecret } = req.body;

      if (!orgMsp || !mspId || !certificate || !privateKey) {
        return res.status(400).json({
          success: false,
          error: 'orgMsp, mspId, certificate, and privateKey are required'
        });
      }

      const userId = req.user.id;

      const result = await fabricCredentialService.storeCredentials({
        userId,
        orgMsp,
        mspId,
        certificate,
        privateKey,
        caCertificate,
        enrollmentSecret
      });

      res.json({
        success: true,
        message: 'MSP credentials stored securely',
        data: {
          userId: result.id,
          username: result.username,
          orgMsp
        }
      });
    } catch (error) {
      console.error('[AuthController] Save MSP credentials error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/auth/msp
   * Get MSP credential status (no secrets returned)
   */
  async getMspStatus(req, res) {
    try {
      const hasCredentials = await fabricCredentialService.hasCredentials(req.user.id);
      let meta = {
        orgMsp: req.user.msp_org || null
      };

      if (hasCredentials) {
        const creds = await fabricCredentialService.getCredentials(req.user.id);
        meta = {
          orgMsp: creds.orgMsp,
          mspId: creds.mspId,
          hasCertificate: !!creds.certificate,
          hasPrivateKey: !!creds.privateKey,
          hasCaCertificate: !!creds.caCertificate,
          hasEnrollmentSecret: !!creds.enrollmentSecret
        };
      }

      res.json({
        success: true,
        data: {
          hasCredentials,
          ...meta
        }
      });
    } catch (error) {
      console.error('[AuthController] Get MSP status error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/v1/auth/msp
   * Delete stored MSP credentials for current user
   */
  async deleteMspCredentials(req, res) {
    try {
      await fabricCredentialService.deleteCredentials(req.user.id);

      res.json({
        success: true,
        message: 'MSP credentials deleted'
      });
    } catch (error) {
      console.error('[AuthController] Delete MSP credentials error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
