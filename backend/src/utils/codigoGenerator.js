const db = require('../config/database')

const ROLE_CODE = {
  super_admin: 'ADM',
  director:   'DIR',
  secretaria: 'SEC',
  professor:  'PRF',
  financeiro: 'FIN',
  rh:         'RH',
  pedagogico: 'PDG',
  aluno:      'EST',
}

const PAD = { aluno: 4, default: 3 }

/**
 * Gera código único no formato [SIGLA].[ROLE_CODE].[NNNN]
 * ex: EPS.EST.0001 / EPS.PRF.001
 */
const gerarCodigo = async (escolaId, role) => {
  const escola = await db.query('SELECT sigla FROM escolas WHERE id = ?', [escolaId])
  const sigla = (escola.rows[0]?.sigla || 'ESC').toUpperCase()
  const roleCode = ROLE_CODE[role] || 'USR'
  const pad = role === 'aluno' ? PAD.aluno : PAD.default

  const count = await db.query(
    'SELECT COUNT(*) AS n FROM utilizadores WHERE escola_id = ? AND role = ?',
    [escolaId, role]
  )
  const seq = String(Number(count.rows[0].n) + 1).padStart(pad, '0')
  return `${sigla}.${roleCode}.${seq}`
}

/**
 * Formata data_nascimento como senha padrão: DDMMYYYY
 */
const senhaDeNascimento = (dataNascimento) => {
  if (!dataNascimento) return 'sige2024'
  const d = new Date(dataNascimento)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}${mm}${yyyy}`
}

module.exports = { gerarCodigo, senhaDeNascimento }
