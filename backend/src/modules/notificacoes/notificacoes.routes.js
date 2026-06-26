const express = require('express')
const router = express.Router()
const c = require('./notificacoes.controller')
const auth = require('../../middleware/auth')
const tenant = require('../../middleware/tenant')

router.use(auth, tenant)

router.get('/', c.listar)
router.get('/nao-lidas', c.contarNaoLidas)
router.post('/', c.criar)
router.patch('/:id/ler', c.marcarLida)
router.patch('/ler-todas', c.marcarTodasLidas)
router.delete('/:id', c.eliminar)

module.exports = router
