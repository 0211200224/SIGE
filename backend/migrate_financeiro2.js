const db = require('./src/config/database')

async function run() {
  console.log('▶ Migração Financeiro v2 — Tipos de Cobrança...')

  const colsTaxas = await db.query('SHOW COLUMNS FROM taxas')
  const fieldsTaxas = colsTaxas.rows.map(r => r.Field)

  if (!fieldsTaxas.includes('categoria')) {
    await db.query(`ALTER TABLE taxas ADD COLUMN categoria ENUM('academico','servicos','administrativo','outro') NOT NULL DEFAULT 'academico' AFTER nome`)
    console.log('✓ taxas.categoria')
  } else {
    console.log('– taxas.categoria já existe')
  }

  if (!fieldsTaxas.includes('valor_variavel')) {
    await db.query(`ALTER TABLE taxas ADD COLUMN valor_variavel TINYINT(1) NOT NULL DEFAULT 0 AFTER valor`)
    console.log('✓ taxas.valor_variavel')
  } else {
    console.log('– taxas.valor_variavel já existe')
  }

  const colsPag = await db.query('SHOW COLUMNS FROM pagamentos')
  const fieldsPag = colsPag.rows.map(r => r.Field)

  if (!fieldsPag.includes('numero_comprovativo')) {
    await db.query(`ALTER TABLE pagamentos ADD COLUMN numero_comprovativo VARCHAR(100) NULL AFTER referencia`)
    console.log('✓ pagamentos.numero_comprovativo')
  } else {
    console.log('– pagamentos.numero_comprovativo já existe')
  }

  console.log('✅ Migração Financeiro v2 concluída.')
  process.exit(0)
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1) })
