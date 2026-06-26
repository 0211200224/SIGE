const turmasService = require('./turmas.service')
const { success, created, error, notFound } = require('../../utils/response')

const listar = async (req, res) => {
  try {
    const turmas = await turmasService.listar(req.tenantId)
    return success(res, turmas)
  } catch (err) {
    return error(res, err.message)
  }
}

const criar = async (req, res) => {
  try {
    const turma = await turmasService.criar(req.tenantId, req.body)
    return created(res, turma, 'Turma criada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const obter = async (req, res) => {
  try {
    const turma = await turmasService.obterPorId(req.tenantId, req.params.id)
    if (!turma) return notFound(res, 'Turma não encontrada')
    return success(res, turma)
  } catch (err) {
    return error(res, err.message)
  }
}

const atualizar = async (req, res) => {
  try {
    const turma = await turmasService.atualizar(req.tenantId, req.params.id, req.body)
    return success(res, turma, 'Turma atualizada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const remover = async (req, res) => {
  try {
    await turmasService.remover(req.tenantId, req.params.id)
    return success(res, null, 'Turma removida com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

module.exports = { listar, criar, obter, atualizar, remover }
