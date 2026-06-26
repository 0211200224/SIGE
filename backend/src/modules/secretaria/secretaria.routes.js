const express = require('express')
const router = express.Router()
const ctrl = require('./secretaria.controller')
const auth = require('../../middleware/auth')

router.use(auth)

router.get('/stats', ctrl.obterStats)

// Alunos
router.get('/alunos', ctrl.listarAlunos)
router.post('/alunos', ctrl.criarAluno)
router.get('/alunos/:id', ctrl.obterAluno)
router.put('/alunos/:id', ctrl.atualizarAluno)
router.patch('/alunos/:id/status', ctrl.alterarStatusAluno)

// Encarregados do aluno
router.get('/alunos/:alunoId/encarregados', ctrl.listarEncarregados)
router.post('/alunos/:alunoId/encarregados', ctrl.associarEncarregado)
router.delete('/alunos/:alunoId/encarregados/:encarregadoId', ctrl.removerEncarregado)

// Encarregados (global)
router.get('/encarregados', ctrl.listarEncarregados)
router.post('/encarregados', ctrl.criarEncarregado)
router.put('/encarregados/:id', ctrl.atualizarEncarregado)

// Matrículas
router.get('/matriculas', ctrl.listarMatriculas)
router.post('/matriculas', ctrl.criarMatricula)
router.delete('/matriculas/:id', ctrl.cancelarMatricula)

// Turmas
router.get('/turmas', ctrl.listarTurmas)
router.post('/turmas', ctrl.criarTurma)
router.put('/turmas/:id', ctrl.atualizarTurma)
router.get('/classes', ctrl.listarClasses)

// Transferências
router.get('/transferencias', ctrl.listarTransferencias)
router.post('/transferencias', ctrl.criarTransferencia)
router.patch('/transferencias/:id/status', ctrl.atualizarStatusTransferencia)

// Solicitações
router.get('/solicitacoes', ctrl.listarSolicitacoes)
router.post('/solicitacoes', ctrl.criarSolicitacao)
router.put('/solicitacoes/:id', ctrl.atualizarSolicitacao)

// Documentos / Arquivo
router.get('/documentos', ctrl.listarDocumentos)
router.post('/documentos', ctrl.criarDocumento)
router.put('/documentos/:id/status', ctrl.atualizarStatusDocumento)

// Relatórios
router.get('/relatorios/:tipo', ctrl.obterRelatorio)

module.exports = router
