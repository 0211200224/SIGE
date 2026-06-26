const express = require('express')
const router = express.Router()
const notasController = require('./notas.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/', notasController.listar)
router.post('/', notasController.registar)
router.put('/:id', notasController.atualizar)
router.get('/turma/:turmaId', notasController.listarPorTurma)
router.get('/aluno/:alunoId', notasController.listarPorAluno)

module.exports = router
