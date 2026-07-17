const db = require('../../config/database')

const handle = (fn) => async (req, res, next) => {
  try { await fn(req, res) } catch (e) { next(e) }
}

const getTenantId = (req) => req.user.tenant_id || req.user.escola_id || null

exports.listar = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.json([])
  const { limit = 30, tipo } = req.query
  const userId = req.user.id
  let sql = `
    SELECT * FROM notificacoes
    WHERE escola_id = ? AND (utilizador_id = ? OR utilizador_id IS NULL)
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
     WHERE escola_id = ? AND (utilizador_id = ? OR utilizador_id IS NULL) AND lida = 0`,
    [tenantId, req.user.id]
  )
  res.json({ total: parseInt(r.rows[0].total) })
})

exports.criar = handle(async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(403).json({ error: 'Forbidden: No tenant association found for this user' })
  const { titulo, mensagem, tipo = 'informativa', modulo, url, utilizador_id } = req.body
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
    'UPDATE notificacoes SET lida = 1 WHERE escola_id = ? AND (utilizador_id = ? OR utilizador_id IS NULL)',
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
