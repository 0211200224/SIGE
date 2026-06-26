const alunosService = require('./alunos.service')
const { success, created, error, notFound } = require('../../utils/response')

const listar = async (req, res) => {
  try {
    const alunos = await alunosService.listar(req.tenantId, req.query)
    return success(res, alunos)
  } catch (err) {
    return error(res, err.message)
  }
}

const criar = async (req, res) => {
  try {
    const aluno = await alunosService.criar(req.tenantId, req.body)
    return created(res, aluno, 'Aluno registado com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const obter = async (req, res) => {
  try {
    const aluno = await alunosService.obterPorId(req.tenantId, req.params.id)
    if (!aluno) return notFound(res, 'Aluno não encontrado')
    return success(res, aluno)
  } catch (err) {
    return error(res, err.message)
  }
}

const atualizar = async (req, res) => {
  try {
    const aluno = await alunosService.atualizar(req.tenantId, req.params.id, req.body)
    return success(res, aluno, 'Aluno atualizado com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

const remover = async (req, res) => {
  try {
    await alunosService.remover(req.tenantId, req.params.id)
    return success(res, null, 'Aluno removido com sucesso')
  } catch (err) {
    return error(res, err.message)
  }
}

module.exports = { listar, criar, obter, atualizar, remover }
