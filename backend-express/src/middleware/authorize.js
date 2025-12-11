/**
 * Middleware to authorize requests based on user roles
 */
function authorize(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user's role is allowed
    if (!roles.includes(req.user.role)) {
      console.log(
        `[Authorize] Access denied for user ${req.user.username} (${req.user.role}). Required: ${roles.join(', ')}`
      );

      return res.status(403).json({
        success: false,
        error: 'Access forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to check if user can access specific resource
 * Used for ownership checks (e.g., user can only access their own data)
 */
function authorizeOwnership(getUserIdFromRequest) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const resourceUserId = getUserIdFromRequest(req);

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    if (req.user.id !== resourceUserId) {
      console.log(
        `[Authorize] Ownership denied for user ${req.user.username} accessing resource of user ${resourceUserId}`
      );

      return res.status(403).json({
        success: false,
        error: 'Access forbidden',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

/**
 * Middleware to check if user belongs to specific organization
 */
function authorizeOrganization(...allowedOrgs) {
  const orgs = allowedOrgs.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!orgs.includes(req.user.msp_org)) {
      console.log(
        `[Authorize] Organization access denied for ${req.user.username} (${req.user.msp_org}). Required: ${orgs.join(', ')}`
      );

      return res.status(403).json({
        success: false,
        error: 'Access forbidden',
        message: `This action requires membership in: ${orgs.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  authorize,
  authorizeOwnership,
  authorizeOrganization
};
