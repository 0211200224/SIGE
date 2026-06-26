const notasService = require('./notas.service')
const { success, created, error } = require('../../utils/response')

const listar = async (req, res) => {
  try {
    const notas = await notasService.listar(req.tenantId, req.query)
    return success(res, notas)
  } catch (err) {
    return error(res, err.message)
  }
}

const registar = async (req, res) => {
  try {
    const nota = await notasService.registar(req.tenantId, req.body)
    return created(res, nota, 'Nota registada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const atualizar = async (req, res) => {
  try {
    const nota = await notasService.atualizar(req.tenantId, req.params.id, req.body)
    return success(res, nota, 'Nota atualizada com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const listarPorTurma = async (req, res) => {
  try {
    const notas = await notasService.listarPorTurma(req.tenantId, req.params.turmaId)
    return success(res, notas)
  } catch (err) {
    return error(res, err.message)
  }
}

const listarPorAluno = async (req, res) => {
  try {
    const notas = await notasService.listarPorAluno(req.tenantId, req.params.alunoId)
    return success(res, notas)
  } catch (err) {
    return error(res, err.message)
  }
}

module.exports = { listar, registar, atualizar, listarPorTurma, listarPorAluno }
