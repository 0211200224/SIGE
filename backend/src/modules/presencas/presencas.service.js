const db = require('../../config/database')

const listar = async (tenantId, filters = {}) => {
  const { data } = filters
  let sql = `SELECT p.*, a.nome AS aluno_nome FROM presencas p JOIN alunos a ON p.aluno_id = a.id WHERE p.escola_id = ?`
  const params = [tenantId]
  if (data) { sql += ' AND p.data = ?'; params.push(data) }
  sql += ' ORDER BY p.data DESC'
  const result = await db.query(sql, params)
  return result.rows
}

const registar = async (tenantId, dados) => {
  const { turma_id, disciplina_id, data, professor_id, registos } = dados
  const inserted = []
  for (const reg of registos) {
    const result = await db.query(
      `INSERT INTO presencas (escola_id, turma_id, disciplina_id, data, professor_id, aluno_id, presente, justificada, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, turma_id, disciplina_id, data, professor_id, reg.aluno_id, reg.presente, reg.justificada, reg.observacao]
    )
    const fetched = await db.query('SELECT * FROM presencas WHERE id = ?', [result.rows[0].insertId])
    inserted.push(fetched.rows[0])
  }
  return inserted
}

const listarPorTurma = async (tenantId, turmaId) => {
  const result = await db.query(
    `SELECT p.*, a.nome AS aluno_nome FROM presencas p JOIN alunos a ON p.aluno_id = a.id
     WHERE p.escola_id = ? AND p.turma_id = ? ORDER BY p.data DESC, a.nome`,
    [tenantId, turmaId]
  )
  return result.rows
}

const listarPorAluno = async (tenantId, alunoId) => {
  const result = await db.query(
    'SELECT * FROM presencas WHERE escola_id = ? AND aluno_id = ? ORDER BY data DESC',
    [tenantId, alunoId]
  )
  return result.rows
}

module.exports = { listar, registar, listarPorTurma, listarPorAluno }
