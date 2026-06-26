const express = require('express')
const router = express.Router()
const ctrl = require('./financeiro.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

router.get('/stats', ctrl.obterStats)
router.get('/resumo', ctrl.resumo)

// Planos de Propinas
router.get('/planos', ctrl.listarPlanos)
router.post('/planos', ctrl.criarPlano)
router.put('/planos/:id', ctrl.atualizarPlano)
router.post('/planos/gerar-cobrancas', ctrl.gerarCobrancasPlano)

// Taxas (legado + cobrança manual)
router.get('/taxas', ctrl.listarTaxas)
router.post('/taxas', ctrl.criarTaxa)
router.put('/taxas/:id', ctrl.atualizarTaxa)
router.delete('/taxas/:id', ctrl.desactivarTaxa)

// Cobranças
router.get('/cobrancas', ctrl.listarCobrancas)
router.post('/cobrancas', ctrl.criarCobranca)
router.post('/cobrancas/gerar-turma', ctrl.gerarCobrancasTurma)
router.delete('/cobrancas/:id', ctrl.cancelarCobranca)

// Contas de Alunos
router.get('/contas', ctrl.listarContas)
router.get('/contas/aluno/:alunoId', ctrl.obterContaAluno)

// Pagamentos
router.get('/pagamentos', ctrl.listarPagamentos)
router.post('/pagamentos', ctrl.registarPagamento)
router.patch('/pagamentos/:id/analisar', ctrl.moverParaAnalise)
router.patch('/pagamentos/:id/confirmar', ctrl.confirmarPagamento)
router.patch('/pagamentos/:id/rejeitar', ctrl.rejeitarPagamento)
router.put('/pagamentos/:id/aprovar', ctrl.aprovarPagamento)
router.put('/pagamentos/:id/rejeitar', ctrl.rejeitarPagamento)

// Recibos
router.get('/recibos', ctrl.listarRecibos)
router.get('/recibos/:id', ctrl.obterRecibo)

// Dívidas
router.get('/dividas', ctrl.listarDividas)

// Bolsas
router.get('/bolsas', ctrl.listarBolsas)
router.post('/bolsas', ctrl.criarBolsa)
router.patch('/bolsas/:id/decidir', ctrl.decidirBolsa)

// Fecho Financeiro
router.get('/fechos', ctrl.listarFechos)
router.post('/fechos', ctrl.realizarFecho)

// Relatórios
router.get('/relatorios/:tipo', ctrl.obterRelatorio)

module.exports = router
