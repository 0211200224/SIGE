const express = require('express')
const router = express.Router()
const c = require('./rh.controller')
const authMiddleware = require('../../middleware/auth')
const tenantMiddleware = require('../../middleware/tenant')

router.use(authMiddleware, tenantMiddleware)

// Stats
router.get('/stats', c.obterStats)

// Configuração Salarial
router.get('/configuracao', c.obterConfiguracao)
router.put('/configuracao', c.atualizarConfiguracao)

// Departamentos
router.get('/departamentos', c.listarDepartamentos)
router.post('/departamentos', c.criarDepartamento)
router.put('/departamentos/:id', c.atualizarDepartamento)
router.delete('/departamentos/:id', c.eliminarDepartamento)

// Cargos
router.get('/cargos', c.listarCargos)
router.post('/cargos', c.criarCargo)
router.put('/cargos/:id', c.atualizarCargo)
router.delete('/cargos/:id', c.eliminarCargo)

// Funcionários
router.get('/funcionarios', c.listar)
router.post('/funcionarios', c.criar)
router.get('/funcionarios/:id/resumo', c.obterResumoFuncionario)
router.post('/funcionarios/:id/acesso', c.criarAcesso)
router.delete('/funcionarios/:id/acesso', c.revogarAcesso)
router.patch('/funcionarios/:id/acesso/reativar', c.reativarAcesso)
router.get('/funcionarios/:id/foto', c.obterFoto)
router.get('/funcionarios/:id/documentos', c.listarDocumentos)
router.post('/funcionarios/:id/documentos', c.criarDocumento)
router.get('/funcionarios/:id/documentos/:docId', c.obterDocumento)
router.delete('/funcionarios/:id/documentos/:docId', c.eliminarDocumento)
router.get('/funcionarios/:id', c.obter)
router.put('/funcionarios/:id', c.atualizar)

// Contratos
router.get('/contratos', c.listarContratos)
router.post('/contratos', c.criarContrato)
router.put('/contratos/:id', c.atualizarContrato)

// Férias
router.get('/ferias', c.listarFerias)
router.post('/ferias', c.criarFerias)
router.patch('/ferias/:id/estado', c.atualizarEstadoFerias)

// Faltas
router.get('/faltas', c.listarFaltas)
router.post('/faltas', c.criarFalta)
router.delete('/faltas/:id', c.eliminarFalta)

// Folha de Pagamento
router.get('/folhas', c.listarFolhas)
router.post('/folhas', c.gerarFolha)
router.get('/folhas/:id', c.obterFolha)
router.post('/folhas/:id/processar', c.processarFolha)
router.delete('/folhas/:id', c.eliminarFolha)
router.patch('/folhas/:id/pagar', c.pagarFolha)
router.patch('/salarios/:id', c.atualizarLinhaSalario)

module.exports = router
