const db = require('../../config/database')

const listar = async (tenantId, filters = {}) => {
  const { turma_id, search } = filters
  let sql = 'SELECT * FROM alunos WHERE escola_id = ?'
  const params = [tenantId]

  if (turma_id) { sql += ' AND turma_id = ?'; params.push(turma_id) }
  if (search) { sql += ' AND nome LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY nome ASC'

  const result = await db.query(sql, params)
  return result.rows
}

const criar = async (tenantId, dados) => {
  const { nome, data_nascimento, genero, turma_id, numero_matricula } = dados
  const result = await db.query(
    `INSERT INTO alunos (escola_id, nome, data_nascimento, genero, turma_id, numero_matricula)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, data_nascimento, genero, turma_id, numero_matricula]
  )
  return obterPorId(tenantId, result.rows[0].insertId)
}

const obterPorId = async (tenantId, id) => {
  const result = await db.query(
    'SELECT * FROM alunos WHERE id = ? AND escola_id = ?',
    [id, tenantId]
  )
  return result.rows[0]
}

const atualizar = async (tenantId, id, dados) => {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(', ')
  const values = Object.values(dados)
  await db.query(
    `UPDATE alunos SET ${fields} WHERE id = ? AND escola_id = ?`,
    [...values, id, tenantId]
  )
  return obterPorId(tenantId, id)
}

const remover = async (tenantId, id) => {
  await db.query('DELETE FROM alunos WHERE id = ? AND escola_id = ?', [id, tenantId])
}

module.exports = { listar, criar, obterPorId, atualizar, remover }
