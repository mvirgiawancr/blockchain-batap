const authService = require('../services/authService');

/**
 * Middleware to authenticate requests using JWT
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const user = await authService.verifyToken(token);

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('[Authenticate] Error:', error.message);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Just continue without user
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
};
