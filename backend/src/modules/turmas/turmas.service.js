const db = require('../../config/database')

const listar = async (tenantId) => {
  const result = await db.query(
    'SELECT * FROM turmas WHERE escola_id = ? ORDER BY nome ASC',
    [tenantId]
  )
  return result.rows
}

const criar = async (tenantId, dados) => {
  const { nome, classe, sala, professor_director_id, ano_lectivo, capacidade } = dados
  const result = await db.query(
    `INSERT INTO turmas (escola_id, nome, classe, sala, professor_director_id, ano_lectivo, capacidade)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, classe, sala, professor_director_id, ano_lectivo, capacidade]
  )
  return obterPorId(tenantId, result.rows[0].insertId)
}

const obterPorId = async (tenantId, id) => {
  const result = await db.query(
    'SELECT * FROM turmas WHERE id = ? AND escola_id = ?',
    [id, tenantId]
  )
  return result.rows[0]
}

const atualizar = async (tenantId, id, dados) => {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(', ')
  const values = Object.values(dados)
  await db.query(
    `UPDATE turmas SET ${fields} WHERE id = ? AND escola_id = ?`,
    [...values, id, tenantId]
  )
  return obterPorId(tenantId, id)
}

const remover = async (tenantId, id) => {
  await db.query('DELETE FROM turmas WHERE id = ? AND escola_id = ?', [id, tenantId])
}

module.exports = { listar, criar, obterPorId, atualizar, remover }
