const presencasService = require('./presencas.service')
const { success, created, error } = require('../../utils/response')

const listar = async (req, res) => {
  try {
    const presencas = await presencasService.listar(req.tenantId, req.query)
    return success(res, presencas)
  } catch (err) {
    return error(res, err.message)
  }
}

const registar = async (req, res) => {
  try {
    const presencas = await presencasService.registar(req.tenantId, req.body)
    return created(res, presencas, 'Presenças registadas com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const listarPorTurma = async (req, res) => {
  try {
    const presencas = await presencasService.listarPorTurma(req.tenantId, req.params.turmaId, req.query)
    return success(res, presencas)
  } catch (err) {
    return error(res, err.message)
  }
}

const listarPorAluno = async (req, res) => {
  try {
    const presencas = await presencasService.listarPorAluno(req.tenantId, req.params.alunoId)
    return success(res, presencas)
  } catch (err) {
    return error(res, err.message)
  }
}

module.exports = { listar, registar, listarPorTurma, listarPorAluno }
