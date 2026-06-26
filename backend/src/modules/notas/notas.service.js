const db = require('../../config/database')

const listar = async (tenantId) => {
  const result = await db.query(
    `SELECT n.*, a.nome AS aluno_nome, d.nome AS disciplina_nome
     FROM notas n
     JOIN alunos a ON n.aluno_id = a.id
     JOIN disciplinas d ON n.disciplina_id = d.id
     WHERE n.escola_id = ?
     ORDER BY n.criado_em DESC`,
    [tenantId]
  )
  return result.rows
}

const registar = async (tenantId, dados) => {
  const { aluno_id, disciplina_id, turma_id, trimestre, tipo, valor, observacoes } = dados
  const result = await db.query(
    `INSERT INTO notas (escola_id, aluno_id, disciplina_id, turma_id, trimestre, tipo, valor, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, aluno_id, disciplina_id, turma_id, trimestre, tipo, valor, observacoes]
  )
  const fetched = await db.query('SELECT * FROM notas WHERE id = ?', [result.rows[0].insertId])
  return fetched.rows[0]
}

const atualizar = async (tenantId, id, dados) => {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(', ')
  const values = Object.values(dados)
  await db.query(
    `UPDATE notas SET ${fields} WHERE id = ? AND escola_id = ?`,
    [...values, id, tenantId]
  )
  const fetched = await db.query('SELECT * FROM notas WHERE id = ? AND escola_id = ?', [id, tenantId])
  return fetched.rows[0]
}

const listarPorTurma = async (tenantId, turmaId) => {
  const result = await db.query(
    `SELECT n.*, a.nome AS aluno_nome, d.nome AS disciplina_nome
     FROM notas n
     JOIN alunos a ON n.aluno_id = a.id
     JOIN disciplinas d ON n.disciplina_id = d.id
     WHERE n.escola_id = ? AND n.turma_id = ?
     ORDER BY a.nome, d.nome`,
    [tenantId, turmaId]
  )
  return result.rows
}

const listarPorAluno = async (tenantId, alunoId) => {
  const result = await db.query(
    `SELECT n.*, d.nome AS disciplina_nome
     FROM notas n
     JOIN disciplinas d ON n.disciplina_id = d.id
     WHERE n.escola_id = ? AND n.aluno_id = ?
     ORDER BY n.trimestre, d.nome`,
    [tenantId, alunoId]
  )
  return result.rows
}

module.exports = { listar, registar, atualizar, listarPorTurma, listarPorAluno }
