const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

class AuthService {
  constructor() {
    console.log('[AuthService] Service initialized');
  }

  /**
   * Register new user
   */
  async register({ username, password, role, name, institution, programStudi, mspOrg }) {
    try {
      // Validate role
      const validRoles = ['upps', 'sekretariat', 'assessor', 'admin'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Check if username exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      const result = await query(
        `INSERT INTO users 
         (username, password_hash, role, name, institution, program_studi, msp_org) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, username, role, name, institution, created_at`,
        [username, passwordHash, role, name, institution, programStudi || null, mspOrg]
      );

      const user = result.rows[0];

      // Log audit
      await this.logAudit({
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: user.id,
        details: { username, role, institution }
      });

      console.log(`[AuthService] User registered: ${username} (${role})`);
      return user;
    } catch (error) {
      console.error('[AuthService] Registration error:', error.message);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login({ username, password, ipAddress, userAgent }) {
    try {
      // Get user
      const result = await query(
        `SELECT id, username, password_hash, role, name, institution, 
                program_studi, msp_org, is_active 
         FROM users 
         WHERE username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      // Check if active
      if (!user.is_active) {
        throw new Error('Account is inactive');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        // Log failed attempt
        await this.logAudit({
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'user',
          entityId: user.id,
          details: { reason: 'Invalid password' },
          ipAddress,
          userAgent
        });

        throw new Error('Invalid credentials');
      }

      // Generate JWT tokens
      const accessToken = this.generateToken(user, JWT_EXPIRY);
      const refreshToken = this.generateToken(user, JWT_REFRESH_EXPIRY);

      // Store session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await query(
        `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, refreshToken, expiresAt, ipAddress, userAgent]
      );

      // Update last login
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Log audit
      await this.logAudit({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        details: { username },
        ipAddress,
        userAgent
      });

      console.log(`[AuthService] User logged in: ${username} (${user.role})`);

      // Remove sensitive data
      delete user.password_hash;

      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRY
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error.message);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(token) {
    try {
      // Delete session
      await query('DELETE FROM sessions WHERE token = $1', [token]);
      console.log('[AuthService] User logged out');
    } catch (error) {
      console.error('[AuthService] Logout error:', error.message);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user still exists and active
      const result = await query(
        `SELECT id, username, role, name, institution, msp_org, is_active 
         FROM users WHERE id = $1`,
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new Error('Invalid token');
      }

      return result.rows[0];
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      // Check if session exists
      const sessionResult = await query(
        'SELECT user_id, expires_at FROM sessions WHERE token = $1',
        [refreshToken]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const session = sessionResult.rows[0];

      // Check if expired
      if (new Date(session.expires_at) < new Date()) {
        await query('DELETE FROM sessions WHERE token = $1', [refreshToken]);
        throw new Error('Refresh token expired');
      }

      // Get user
      const userResult = await query(
        `SELECT id, username, role, name, institution, msp_org, is_active 
         FROM users WHERE id = $1`,
        [session.user_id]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        throw new Error('User not found or inactive');
      }

      const user = userResult.rows[0];

      // Generate new access token
      const accessToken = this.generateToken(user, JWT_EXPIRY);

      return {
        accessToken,
        expiresIn: JWT_EXPIRY
      };
    } catch (error) {
      console.error('[AuthService] Refresh token error:', error.message);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify old password
      const passwordMatch = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
      if (!passwordMatch) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Invalidate all sessions
      await query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      // Log audit
      await this.logAudit({
        userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entityId: userId,
        details: {}
      });

      console.log(`[AuthService] Password changed for user: ${userId}`);
    } catch (error) {
      console.error('[AuthService] Change password error:', error.message);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user, expiresIn) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        mspOrg: user.msp_org,
        jti: uuidv4() // Unique identifier to prevent collisions
      },
      JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Log audit trail
   */
  async logAudit({ userId, action, entityType, entityId, details = {}, ipAddress, userAgent }) {
    try {
      await query(
        `INSERT INTO audit_logs 
         (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent]
      );
    } catch (error) {
      console.error('[AuthService] Audit log error:', error.message);
      // Don't throw - audit failure shouldn't break auth flow
    }
  }

  /**
   * Clean expired sessions (call periodically)
   */
  async cleanExpiredSessions() {
    try {
      const result = await query(
        'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
      );
      console.log(`[AuthService] Cleaned ${result.rowCount} expired sessions`);
      return result.rowCount;
    } catch (error) {
      console.error('[AuthService] Clean sessions error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
