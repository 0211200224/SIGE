const express = require('express')
const router = express.Router()
const relatoriosController = require('./relatorios.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/dashboard', relatoriosController.dashboard)
router.get('/academico', relatoriosController.academico)
router.get('/financeiro', relatoriosController.financeiro)
router.get('/frequencia', relatoriosController.frequencia)
router.get('/rh', relatoriosController.rh)

module.exports = router
