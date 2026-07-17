const escolasService = require('./escolas.service')
const { success, created, error, badRequest } = require('../../utils/response')

// Director so pode aceder a propria escola; super_admin acede a qualquer uma.
const podeAceder = (req) => {
  if (req.user.role === 'super_admin') return true
  const tenantId = req.user.tenant_id || req.user.escola_id
  return String(tenantId) === String(req.params.id)
}

const listar = async (req, res) => {
  try {
    const escolas = await escolasService.listar()
    return success(res, escolas)
  } catch (err) {
    return error(res, err.message)
  }
}

const criar = async (req, res) => {
  try {
    const escola = await escolasService.criar(req.body)
    return created(res, escola, 'Escola criada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const obter = async (req, res) => {
  try {
    if (!podeAceder(req)) return error(res, 'Sem permissão para aceder a esta escola', 403)
    const escola = await escolasService.obterPorId(req.params.id)
    if (!escola) return error(res, 'Escola não encontrada', 404)
    return success(res, escola)
  } catch (err) {
    return error(res, err.message)
  }
}

const atualizar = async (req, res) => {
  try {
    if (!podeAceder(req)) return error(res, 'Sem permissão para aceder a esta escola', 403)
    const escola = await escolasService.atualizar(req.params.id, req.body)
    return success(res, escola, 'Escola atualizada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const desativar = async (req, res) => {
  try {
    const escola = await escolasService.desativar(req.params.id)
    return success(res, escola, 'Escola desactivada')
  } catch (err) { return error(res, err.message) }
}

const ativar = async (req, res) => {
  try {
    const escola = await escolasService.ativar(req.params.id)
    return success(res, escola, 'Escola activada')
  } catch (err) { return error(res, err.message) }
}

const eliminar = async (req, res) => {
  try {
    await escolasService.eliminar(req.params.id)
    return success(res, null, 'Escola eliminada')
  } catch (err) { return error(res, err.message) }
}

const listarUtilizadores = async (req, res) => {
  try {
    if (!podeAceder(req)) return error(res, 'Sem permissão para aceder a esta escola', 403)
    const utilizadores = await escolasService.listarUtilizadores(req.params.id)
    return success(res, utilizadores)
  } catch (err) { return error(res, err.message) }
}

module.exports = { listar, criar, obter, atualizar, desativar, ativar, eliminar, listarUtilizadores }
