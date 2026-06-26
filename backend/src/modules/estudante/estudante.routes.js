const express = require('express')
const router = express.Router()
const ctrl = require('./estudante.controller')
const auth = require('../../middleware/auth')

router.use(auth)

router.get('/perfil', ctrl.perfil)
router.get('/notas', ctrl.notas)
router.get('/presencas', ctrl.presencas)
router.get('/financeiro', ctrl.financeiro)
router.get('/boletim', ctrl.boletim)

module.exports = router
