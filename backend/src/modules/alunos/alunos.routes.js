const express = require('express')
const router = express.Router()
const alunosController = require('./alunos.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/', alunosController.listar)
router.post('/', alunosController.criar)
router.get('/:id', alunosController.obter)
router.put('/:id', alunosController.atualizar)
router.delete('/:id', alunosController.remover)

module.exports = router
