const jwt = require('jsonwebtoken')

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token in the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' })
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' })
  }
}

module.exports = authMiddleware
