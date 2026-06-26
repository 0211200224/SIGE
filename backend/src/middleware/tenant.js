/**
 * Multi-Tenant Middleware
 * Extracts tenant_id from the authenticated JWT payload (req.user)
 * and injects it into the request object for downstream use.
 * This ensures complete data isolation between schools in the SIGE system.
 *
 * Must be used AFTER the auth middleware.
 */
function tenantMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: No authenticated user found' })
  }

  const tenantId = req.user.tenant_id || req.user.escola_id

  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  }

  req.tenantId = tenantId
  next()
}

module.exports = tenantMiddleware
