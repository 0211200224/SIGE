const express = require('express')
const router = express.Router()
const escolasController = require('./escolas.controller')
const authMiddleware = require('../../middleware/auth')
const requireRole = require('../../middleware/role')

// Publico (sem login) — ecra "Esqueci a senha". Tem de vir antes de /:id
// para o Express nao tentar interpretar "contacto" como um :id numerico.
router.get('/contacto/:sigla', escolasController.obterContacto)

// Apenas o super_admin gere a lista de escolas e cria/activa/desactiva/elimina escolas.
router.get('/', authMiddleware, requireRole('super_admin'), escolasController.listar)
router.post('/', authMiddleware, requireRole('super_admin'), escolasController.criar)
router.patch('/:id/desativar', authMiddleware, requireRole('super_admin'), escolasController.desativar)
router.patch('/:id/ativar', authMiddleware, requireRole('super_admin'), escolasController.ativar)
router.delete('/:id', authMiddleware, requireRole('super_admin'), escolasController.eliminar)

// Qualquer utilizador autenticado pode consultar a propria escola (nome, cores,
// logo -- usado pelo layout de todos os portais); super_admin ve qualquer uma;
// os restantes so a sua propria. Restricao real aplicada no controller
// (podeAceder), nao aqui -- so a edicao/gestao fica limitada a director/super_admin.
router.get('/:id', authMiddleware, escolasController.obter)
router.put('/:id', authMiddleware, requireRole('super_admin', 'director'), escolasController.atualizar)
router.get('/:id/utilizadores', authMiddleware, requireRole('super_admin', 'director'), escolasController.listarUtilizadores)
router.patch('/:id/utilizadores/:userId/resetar-senha', authMiddleware, requireRole('super_admin', 'director'), escolasController.resetarSenhaUtilizador)

module.exports = router
