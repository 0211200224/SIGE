const db = require('../config/database')
const { SQL_TEM_PORTAL } = require('./portais')

// Notifica todos os utilizadores activos de um conjunto de papéis (ex:
// director + financeiro quando chega um pagamento) -- uma linha por
// destinatário, nunca um broadcast "utilizador_id = NULL" para a escola
// inteira, que chegaria também a alunos/encarregados sem relação com o
// evento. Nunca lança erro para quem chama -- uma notificação falhada nunca
// deve bloquear a operação real (pagamento, matrícula, etc.).
const notificarPapeis = async (tenantId, papeis, { titulo, mensagem, tipo = 'informativa', modulo, url }) => {
  try {
    const utilizadores = await db.query(
      `SELECT u.id FROM utilizadores u WHERE u.escola_id = ? AND u.activo = 1 AND ${SQL_TEM_PORTAL}`,
      [tenantId, papeis, papeis]
    )
    for (const u of utilizadores.rows) {
      await db.query(
        `INSERT INTO notificacoes (escola_id, utilizador_id, titulo, mensagem, tipo, modulo, url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, u.id, titulo, mensagem, tipo, modulo || null, url || null]
      )
    }
  } catch (_) { /* notificacao nunca deve bloquear a operacao real */ }
}

module.exports = { notificarPapeis }
