const express = require('express')
const router = express.Router()
const turmasController = require('./turmas.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/', turmasController.listar)
router.post('/', turmasController.criar)
router.get('/:id', turmasController.obter)
router.put('/:id', turmasController.atualizar)
router.delete('/:id', turmasController.remover)

module.exports = router
