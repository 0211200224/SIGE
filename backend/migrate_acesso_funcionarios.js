/**
 * Migração Acesso Funcionários — executa uma vez.
 * Adiciona utilizador_id em funcionarios para ligar funcionário à conta de login.
 * Garante que utilizadores tem codigo, primeiro_login e data_nascimento (se não existirem).
 * Uso: node migrate_acesso_funcionarios.js
 */
require('dotenv').config({ path: './src/.env' })
require('dotenv').config()
const db = require('./src/config/database')

async function migrate() {
  const steps = [
    // Ligação funcionario → utilizador (NULL = sem acesso ao sistema)
    `ALTER TABLE funcionarios
       ADD COLUMN IF NOT EXISTS utilizador_id INT NULL AFTER escola_id`,

    // Garantir colunas necessárias em utilizadores (podem já existir de migrações anteriores)
    `ALTER TABLE utilizadores
       ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) NULL AFTER role`,

    `ALTER TABLE utilizadores
       ADD COLUMN IF NOT EXISTS primeiro_login TINYINT(1) NOT NULL DEFAULT 1 AFTER codigo`,

    `ALTER TABLE utilizadores
       ADD COLUMN IF NOT EXISTS data_nascimento DATE NULL AFTER primeiro_login`,
  ]

  for (const sql of steps) {
    try {
      await db.query(sql)
      const first = sql.trim().slice(0, 70).replace(/\s+/g, ' ')
      console.log('✓', first, '...')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        console.log('– coluna já existe, ignorada')
      } else {
        console.error('✗ ERRO:', err.message)
        console.error('  SQL:', sql.trim().slice(0, 100))
      }
    }
  }

  console.log('\nMigração de acesso de funcionários concluída.')
  process.exit(0)
}

migrate().catch(err => { console.error(err); process.exit(1) })
