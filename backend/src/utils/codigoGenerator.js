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
 *
 * Aceita tanto uma string 'YYYY-MM-DD' (ex: vinda directamente de um
 * <input type="date"> do frontend) como um objecto Date (ex: vindo de uma
 * coluna DATE lida do Postgres). Extrai os digitos directamente da forma
 * ISO em vez de usar getUTCDate()/getUTCMonth() sobre um Date — o driver
 * `pg` constroi Date de colunas DATE à meia-noite NO FUSO HORARIO LOCAL do
 * processo Node, por isso ler os componentes em UTC pode dar o dia
 * anterior consoante o fuso do servidor.
 */
const senhaDeNascimento = (dataNascimento) => {
  if (!dataNascimento) return 'sige2024'
  const iso = dataNascimento instanceof Date ? dataNascimento.toISOString() : String(dataNascimento)
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return 'sige2024'
  const [, yyyy, mm, dd] = match
  return `${dd}${mm}${yyyy}`
}

module.exports = { gerarCodigo, senhaDeNascimento }
