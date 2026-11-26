const db = require('../config/database')

// Portais que podem ser concedidos como acesso adicional a um utilizador da
// equipa. 'director' fica de fora de propósito: o controlo total da escola
// nunca é dado como extra -- só pode ser o portal principal de uma conta.
const PORTAIS_EQUIPA = ['secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']

// Um portal adicional está activo se não tiver data limite ou se a data
// limite ainda não passou (acesso temporário termina sozinho, sem precisar
// de alguém se lembrar de o retirar).
const CONDICAO_VALIDO = '(up.valido_ate IS NULL OR up.valido_ate >= CURRENT_DATE)'

// Portais efectivos de uma conta: o principal (utilizadores.role) + os
// adicionais ainda válidos. O principal vem sempre primeiro.
const obterPortais = async (utilizadorId, rolePrincipal) => {
  const r = await db.query(
    `SELECT up.portal FROM utilizador_portais up
     WHERE up.utilizador_id = ? AND ${CONDICAO_VALIDO}
     ORDER BY up.concedido_em ASC`,
    [utilizadorId]
  )
  return [...new Set([rolePrincipal, ...r.rows.map(x => x.portal)].filter(Boolean))]
}

// Fragmento SQL (alias da tabela utilizadores = u) para "tem acesso a algum
// destes portais", seja como principal ou como adicional válido. Recebe os
// portais duas vezes nos parâmetros: [portais, portais].
const SQL_TEM_PORTAL = `(u.role = ANY(?) OR EXISTS (
  SELECT 1 FROM utilizador_portais up
  WHERE up.utilizador_id = u.id AND up.portal = ANY(?) AND ${CONDICAO_VALIDO}
))`

module.exports = { PORTAIS_EQUIPA, CONDICAO_VALIDO, obterPortais, SQL_TEM_PORTAL }
