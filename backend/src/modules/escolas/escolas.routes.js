const express = require('express')
const router = express.Router()
const escolasController = require('./escolas.controller')
const authMiddleware = require('../../middleware/auth')

router.get('/', authMiddleware, escolasController.listar)
router.post('/', escolasController.criar)
router.get('/:id', authMiddleware, escolasController.obter)
router.put('/:id', authMiddleware, escolasController.atualizar)
router.patch('/:id/desativar', authMiddleware, escolasController.desativar)
router.patch('/:id/ativar', authMiddleware, escolasController.ativar)
router.delete('/:id', authMiddleware, escolasController.eliminar)
router.get('/:id/utilizadores', authMiddleware, escolasController.listarUtilizadores)

module.exports = router
