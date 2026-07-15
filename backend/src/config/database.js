const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
})

pool.connect()
  .then(client => { console.log('Connected to Postgres (Supabase) database'); client.release() })
  .catch(err => { console.error('Postgres connection error:', err.message); process.exit(-1) })

// Os modulos usam placeholders estilo MySQL (?). Traduz para $1, $2... do Postgres
// para nao ser preciso reescrever cada query nos modulos.
const toPgPlaceholders = (sql) => {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// Os modulos leem o id gerado via `result.rows[0].insertId` (herdado do mysql2,
// que devolve um ResultSetHeader com essa propriedade). O driver `pg` nao tem
// equivalente — aqui simula-se isso: se for um INSERT sem RETURNING, adiciona-se
// RETURNING id e copia-se o valor para `insertId` no resultado.
const INSERT_RE = /^\s*insert\s+into\s+/i
const HAS_RETURNING_RE = /\breturning\b/i

const query = async (sql, params = []) => {
  let pgSql = toPgPlaceholders(sql)
  const isPlainInsert = INSERT_RE.test(pgSql) && !HAS_RETURNING_RE.test(pgSql)
  if (isPlainInsert) pgSql += ' RETURNING id'

  const result = await pool.query(pgSql, params)
  const rows = result.rows
  if (isPlainInsert && rows[0] && rows[0].id !== undefined) {
    rows[0].insertId = rows[0].id
  }
  return { rows }
}

module.exports = { query, pool }
