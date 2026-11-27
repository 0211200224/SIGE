const db = require('../../config/database')

// Filtros opcionais (aluno_id, turma_id, disciplina_id, trimestre) -- antes
// eram ignorados e devolvia-se sempre todas as notas da escola, o que
// misturava alunos no boletim e nas pautas dos Relatorios.
const listar = async (tenantId, filtros = {}) => {
  let where = 'n.escola_id = ?'
  const params = [tenantId]
  for (const [campo, coluna] of [['aluno_id', 'n.aluno_id'], ['turma_id', 'n.turma_id'], ['disciplina_id', 'n.disciplina_id'], ['trimestre', 'n.trimestre']]) {
    if (filtros[campo] !== undefined && filtros[campo] !== '') { where += ` AND ${coluna} = ?`; params.push(filtros[campo]) }
  }
  const result = await db.query(
    `SELECT n.*, a.nome AS aluno_nome, d.nome AS disciplina_nome
     FROM notas n
     JOIN alunos a ON n.aluno_id = a.id
     JOIN subjects d ON n.disciplina_id = d.id
     WHERE ${where}
     ORDER BY n.criado_em DESC`,
    params
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

// Lista branca -- nunca construir o SET a partir das chaves do corpo do
// pedido (permitiria alterar aluno_id/disciplina_id/escola_id arbitrariamente).
const CAMPOS_EDITAVEIS = ['disciplina_id', 'turma_id', 'trimestre', 'tipo', 'valor', 'observacoes']

const atualizar = async (tenantId, id, dados) => {
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => CAMPOS_EDITAVEIS.includes(k)))
  if (!Object.keys(filtrado).length) {
    const actual = await db.query('SELECT * FROM notas WHERE id = ? AND escola_id = ?', [id, tenantId])
    return actual.rows[0]
  }
  const fields = Object.keys(filtrado).map(key => `${key} = ?`).join(', ')
  const values = Object.values(filtrado)
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
     JOIN subjects d ON n.disciplina_id = d.id
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
     JOIN subjects d ON n.disciplina_id = d.id
     WHERE n.escola_id = ? AND n.aluno_id = ?
     ORDER BY n.trimestre, d.nome`,
    [tenantId, alunoId]
  )
  return result.rows
}

module.exports = { listar, registar, atualizar, listarPorTurma, listarPorAluno }
