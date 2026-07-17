/**
 * Role Authorization Middleware
 * Restricts a route to the given list of roles. Must run AFTER authMiddleware
 * (needs req.user already populated from the JWT).
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No authenticated user found' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' })
    }
    next()
  }
}

module.exports = requireRole
