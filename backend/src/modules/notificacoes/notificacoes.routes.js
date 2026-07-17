const express = require('express')
const router = express.Router()
const c = require('./notificacoes.controller')
const auth = require('../../middleware/auth')

// Nao usa o middleware tenant global: super_admin nao tem escola_id (nao
// tem notificacoes, mas nao deve ser bloqueado com 403 so por consultar).
// Cada handler resolve o tenant sozinho (ver notificacoes.controller.js).
router.use(auth)

router.get('/', c.listar)
router.get('/nao-lidas', c.contarNaoLidas)
router.post('/', c.criar)
router.patch('/:id/ler', c.marcarLida)
router.patch('/ler-todas', c.marcarTodasLidas)
router.delete('/:id', c.eliminar)

module.exports = router
