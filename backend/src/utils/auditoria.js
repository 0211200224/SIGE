const db = require('../config/database')

// Registo de auditoria partilhado por todos os módulos (RH já tinha o seu
// próprio, mantido como está -- este serve os módulos que ainda não
// registavam nada: Financeiro e Secretaria). Nunca lança erro para quem
// chama -- a auditoria não deve bloquear a operação real.
const registarAuditoria = async (tenantId, userId, modulo, acao, detalhes) => {
  try {
    await db.query(
      'INSERT INTO auditoria_log (escola_id, utilizador_id, modulo, acao, detalhes) VALUES (?, ?, ?, ?, ?)',
      [tenantId, userId || null, modulo, acao, detalhes || null]
    )
  } catch (_) { /* auditoria nunca deve bloquear a operação real */ }
}

module.exports = { registarAuditoria }
