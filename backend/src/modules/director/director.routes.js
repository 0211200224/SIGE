const express = require('express')
const router = express.Router()
const c = require('./director.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

// Dashboard Executivo
router.get('/dashboard', c.dashboardExecutivo)

// Utilizadores
router.get('/utilizadores', c.listarUtilizadores)
router.patch('/utilizadores/:id/ativar', c.ativarUtilizador)
router.patch('/utilizadores/:id/desativar', c.desativarUtilizador)
router.patch('/utilizadores/:id/role', c.atualizarRoleUtilizador)
router.patch('/utilizadores/:id/resetar-senha', c.resetarSenhaUtilizador)

// Políticas
router.get('/politicas/academicas', c.obterPoliticasAcademicas)
router.put('/politicas/academicas', c.salvarPoliticasAcademicas)
router.get('/politicas/financeiras', c.obterPoliticasFinanceiras)
router.put('/politicas/financeiras', c.salvarPoliticasFinanceiras)
router.get('/politicas/administrativas', c.obterPoliticasAdministrativas)
router.put('/politicas/administrativas', c.salvarPoliticasAdministrativas)

// Aprovações
router.get('/aprovacoes', c.listarAprovacoes)
router.post('/aprovacoes', c.criarSolicitacao)
router.patch('/aprovacoes/:id/decidir', c.decidirSolicitacao)

// Auditoria
router.get('/auditoria', c.listarAuditoria)

// Relatórios
router.get('/relatorios/:tipo', c.relatorioExecutivo)

// Indicadores
router.get('/indicadores', c.indicadoresInstitucionais)

module.exports = router
