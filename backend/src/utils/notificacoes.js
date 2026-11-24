const db = require('../config/database')

// Notifica todos os utilizadores activos de um conjunto de papéis (ex:
// director + financeiro quando chega um pagamento) -- uma linha por
// destinatário, nunca um broadcast "utilizador_id = NULL" para a escola
// inteira, que chegaria também a alunos/encarregados sem relação com o
// evento. Nunca lança erro para quem chama -- uma notificação falhada nunca
// deve bloquear a operação real (pagamento, matrícula, etc.).
const notificarPapeis = async (tenantId, papeis, { titulo, mensagem, tipo = 'informativa', modulo, url }) => {
  try {
    const utilizadores = await db.query(
      'SELECT id FROM utilizadores WHERE escola_id = ? AND role = ANY(?) AND activo = 1',
      [tenantId, papeis]
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
