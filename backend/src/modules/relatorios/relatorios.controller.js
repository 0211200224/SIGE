const relatoriosService = require('./relatorios.service')
const { success, error } = require('../../utils/response')

const dashboard = async (req, res) => {
  try {
    const dados = await relatoriosService.dashboard(req.tenantId)
    return success(res, dados)
  } catch (err) {
    return error(res, err.message)
  }
}

const academico = async (req, res) => {
  try {
    const dados = await relatoriosService.academico(req.tenantId, req.query)
    return success(res, dados)
  } catch (err) {
    return error(res, err.message)
  }
}

const financeiro = async (req, res) => {
  try {
    const dados = await relatoriosService.financeiro(req.tenantId, req.query)
    return success(res, dados)
  } catch (err) {
    return error(res, err.message)
  }
}

const frequencia = async (req, res) => {
  try {
    const dados = await relatoriosService.frequencia(req.tenantId, req.query)
    return success(res, dados)
  } catch (err) {
    return error(res, err.message)
  }
}

const rh = async (req, res) => {
  try {
    const dados = await relatoriosService.rh(req.tenantId)
    return success(res, dados)
  } catch (err) {
    return error(res, err.message)
  }
}

module.exports = { dashboard, academico, financeiro, frequencia, rh }
