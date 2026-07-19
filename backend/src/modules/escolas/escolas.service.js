const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { senhaDeNascimento } = require('../../utils/codigoGenerator')

// Ensure activo column exists (safe for repeated runs)
;(async () => {
  try {
    await db.query(`ALTER TABLE escolas ADD COLUMN IF NOT EXISTS activo SMALLINT NOT NULL DEFAULT 1`)
  } catch (_) { /* column already exists */ }
})()

const listar = async () => {
  const result = await db.query(
    `SELECT e.id, e.nome, e.sigla, e.localizacao, e.provincia, e.cidade,
            e.contacto, e.email, e.ano_lectivo, e.nivel_ensino,
            e.logo, e.cor_principal, e.cor_secundaria,
            COALESCE(e.activo, 1) AS activo, e.criado_em,
            COUNT(DISTINCT u.id) AS total_utilizadores,
            (SELECT u2.nome FROM utilizadores u2 WHERE u2.escola_id = e.id AND u2.role = 'director' LIMIT 1) AS director_nome,
            (SELECT u2.email FROM utilizadores u2 WHERE u2.escola_id = e.id AND u2.role = 'director' LIMIT 1) AS director_email
     FROM escolas e
     LEFT JOIN utilizadores u ON u.escola_id = e.id
     GROUP BY e.id
     ORDER BY e.criado_em DESC`
  )
  return result.rows
}

const criar = async (dados) => {
  const { nome, sigla, localizacao, provincia, cidade, contacto, email, ano_lectivo, nivel_ensino, logo, cor_principal, cor_secundaria } = dados
  const result = await db.query(
    `INSERT INTO escolas (nome, sigla, localizacao, provincia, cidade, contacto, email, ano_lectivo, nivel_ensino, logo, cor_principal, cor_secundaria)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, sigla, localizacao, provincia, cidade, contacto, email, ano_lectivo, nivel_ensino,
     logo || null, cor_principal || '#1a2b4b', cor_secundaria || '#fdbc13']
  )
  return obterPorId(result.rows[0].insertId)
}

const obterPorId = async (id) => {
  const result = await db.query('SELECT * FROM escolas WHERE id = ?', [id])
  return result.rows[0]
}

const atualizar = async (id, dados) => {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(', ')
  const values = Object.values(dados)
  await db.query(
    `UPDATE escolas SET ${fields} WHERE id = ?`,
    [...values, id]
  )
  return obterPorId(id)
}

const desativar = async (id) => {
  await db.query('UPDATE escolas SET activo = 0 WHERE id = ?', [id])
  return obterPorId(id)
}

const ativar = async (id) => {
  await db.query('UPDATE escolas SET activo = 1 WHERE id = ?', [id])
  return obterPorId(id)
}

const eliminar = async (id) => {
  await db.query('DELETE FROM escolas WHERE id = ?', [id])
}

const listarUtilizadores = async (id) => {
  const result = await db.query(
    `SELECT id, nome, email, role, activo, criado_em FROM utilizadores WHERE escola_id = ? ORDER BY role, nome`,
    [id]
  )
  return result.rows
}

// Endpoint publico (sem login) usado pelo ecra "Esqueci a senha" — devolve
// so o contacto institucional da escola, nunca dados de utilizadores.
const obterContactoPorSigla = async (sigla) => {
  const result = await db.query(
    `SELECT nome, contacto, email FROM escolas WHERE UPPER(sigla) = UPPER(?) AND COALESCE(activo,1) = 1 LIMIT 1`,
    [sigla]
  )
  return result.rows[0]
}

// Reposicao de senha assistida (super_admin sobre qualquer utilizador de
// qualquer escola, tipicamente o director) — mesma logica do modulo director.
const resetarSenhaUtilizador = async (escolaId, userId) => {
  // TO_CHAR devolve a data ja formatada como texto: evita que o driver pg
  // a converta para um objecto Date (que usaria a meia-noite no fuso
  // horario local do servidor e podia desviar o dia em 1).
  const r = await db.query(
    "SELECT id, nome, TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS data_nascimento FROM utilizadores WHERE id = ? AND escola_id = ? AND role != 'super_admin'",
    [userId, escolaId]
  )
  const user = r.rows[0]
  if (!user) throw { status: 404, message: 'Utilizador não encontrado' }

  const senhaFinal = user.data_nascimento ? senhaDeNascimento(user.data_nascimento) : 'sige2024'
  const hash = await bcrypt.hash(senhaFinal, 12)
  await db.query(
    'UPDATE utilizadores SET password_hash = ?, primeiro_login = 1 WHERE id = ?',
    [hash, userId]
  )
  return { id: user.id, nome: user.nome, senha_padrao: senhaFinal }
}

module.exports = { listar, criar, obterPorId, atualizar, desativar, ativar, eliminar, listarUtilizadores, obterContactoPorSigla, resetarSenhaUtilizador }
