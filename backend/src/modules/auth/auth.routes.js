const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const authController = require('./auth.controller')
const authMiddleware = require('../../middleware/auth')
const requireRole = require('../../middleware/role')

// Protecção directa contra força bruta de credenciais -- só conta falhas,
// nunca bloqueia depois de um login bem-sucedido.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de login. Tente novamente dentro de alguns minutos.' },
})

// POST /api/auth/login - Login with email and password, returns JWT token
router.post('/login', loginLimiter, authController.login)

// POST /api/auth/refresh - Refresh an existing JWT token
router.post('/refresh', authMiddleware, authController.refresh)

// POST /api/auth/logout - Invalidate the current session
router.post('/logout', authMiddleware, authController.logout)

// GET /api/auth/me - Get the currently authenticated user profile
router.get('/me', authMiddleware, authController.me)

// POST /api/auth/change-password - Change the user's password
router.post('/change-password', authMiddleware, authController.changePassword)

// POST /api/auth/change-password-first - Primeiro login: define nova senha sem precisar da actual
router.post('/change-password-first', authMiddleware, authController.changePasswordFirstLogin)

// POST /api/auth/register - Create a new user (super_admin cria directores; director cria a sua propria equipa)
router.post('/register', authMiddleware, requireRole('super_admin', 'director'), authController.register)

module.exports = router
