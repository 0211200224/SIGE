const db = require('../../config/database')

const handle = (fn) => async (req, res, next) => {
  try { await fn(req, res) } catch (e) { next(e) }
}

const getTenantId = (req) => req.user.tenant_id || req.user.escola_id || null

// Cada notificação pertence a um único utilizador_id (notificarPapeis cria
// uma linha por destinatário, nunca um broadcast) -- por isso o filtro é
// sempre estrito, nunca "OR utilizador_id IS NULL". Isso é o que garante que
// uma notificação de um portal (ex: pagamento no Financeiro) nunca aparece
// para utilizadores de outro portal (RH, Pedagógico, etc.) que não foram
// explicitamente notificados; o Diretor vê tudo porque é sempre incluído
// como destinatário nos papéis notificados por cada módulo.
exports.listar = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.json([])
  const { limit = 30, tipo } = req.query
  const userId = req.user.id
  let sql = `
    SELECT * FROM notificacoes
    WHERE escola_id = ? AND utilizador_id = ?
  `
  const params = [tenantId, userId]
  if (tipo) { sql += ' AND tipo = ?'; params.push(tipo) }
  sql += ' ORDER BY criado_em DESC LIMIT ?'
  params.push(parseInt(limit))
  const r = await db.query(sql, params)
  res.json(r.rows)
})

exports.contarNaoLidas = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.json({ total: 0 })
  const r = await db.query(
    `SELECT COUNT(*) AS total FROM notificacoes
     WHERE escola_id = ? AND utilizador_id = ? AND lida = 0`,
    [tenantId, req.user.id]
  )
  res.json({ total: parseInt(r.rows[0].total) })
})

exports.criar = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  const { titulo, mensagem, tipo = 'informativa', modulo, url, utilizador_id } = req.body
  // utilizador_id é sempre obrigatório -- nunca um broadcast sem destinatário
  // (ver notificarPapeis, a via normal de criação: uma linha por destinatário).
  if (!utilizador_id) return res.status(400).json({ error: 'utilizador_id é obrigatório' })
  await db.query(
    `INSERT INTO notificacoes (escola_id, utilizador_id, titulo, mensagem, tipo, modulo, url)
     VALUES (?,?,?,?,?,?,?)`,
    [tenantId, utilizador_id || null, titulo, mensagem, tipo, modulo, url]
  )
  res.status(201).json({ sucesso: true })
})

exports.marcarLida = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  await db.query(
    'UPDATE notificacoes SET lida = 1 WHERE id = ? AND escola_id = ?',
    [req.params.id, tenantId]
  )
  res.json({ sucesso: true })
})

exports.marcarTodasLidas = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  await db.query(
    'UPDATE notificacoes SET lida = 1 WHERE escola_id = ? AND utilizador_id = ?',
    [tenantId, req.user.id]
  )
  res.json({ sucesso: true })
})

exports.eliminar = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  await db.query(
    'DELETE FROM notificacoes WHERE id = ? AND escola_id = ?',
    [req.params.id, tenantId]
  )
  res.json({ sucesso: true })
})
