const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const authMiddleware = require('../../middleware/auth')

// POST /api/auth/login - Login with email and password, returns JWT token
router.post('/login', authController.login)

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

// POST /api/auth/register - Create a new user (requires director auth)
router.post('/register', authMiddleware, authController.register)

module.exports = router
