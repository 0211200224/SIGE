// Aplica a regra de avaliacao (ACS1, ACS2, AP por trimestre) a base de dados:
// cria/actualiza as vistas v_notas_trimestrais e v_medias_anuais.
// So cria vistas -- nao altera nem apaga notas.
// Uso (na pasta backend): node scripts/migrar_formula_notas.js
require('dotenv').config()
const { Client } = require('pg')
const { SQL_VISTAS } = require('../src/utils/avaliacao')

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query(SQL_VISTAS)
    const r = await c.query("SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name IN ('v_notas_trimestrais','v_medias_anuais') ORDER BY 1")
    console.log('Vistas activas:', r.rows.map(x => x.table_name).join(', '))
  } finally {
    await c.end()
  }
})().catch(e => { console.error('Erro:', e.message); process.exit(1) })
