const express = require('express')
const router = express.Router()
const ctrl = require('./professor.controller')
const auth = require('../../middleware/auth')

router.use(auth)

router.get('/minhas-turmas', ctrl.minhasTurmas)
router.get('/turmas/:turmaId/alunos', ctrl.alunosDaTurma)

router.get('/notas', ctrl.listarNotas)
router.post('/notas/lote', ctrl.lancarNotasLote)

router.get('/presencas', ctrl.listarPresencas)
router.post('/presencas', ctrl.registarPresencas)
router.get('/presencas/estatisticas', ctrl.estatisticasPresenca)

router.get('/pauta', ctrl.obterPauta)

module.exports = router
