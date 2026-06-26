const express = require('express')
const router = express.Router()
const presencasController = require('./presencas.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/', presencasController.listar)
router.post('/', presencasController.registar)
router.get('/turma/:turmaId', presencasController.listarPorTurma)
router.get('/aluno/:alunoId', presencasController.listarPorAluno)

module.exports = router
