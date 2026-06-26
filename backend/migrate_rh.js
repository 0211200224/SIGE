/**
 * Migração RH — executa uma vez para adicionar as novas tabelas e colunas.
 * Uso: node migrate_rh.js
 */
require('dotenv').config({ path: './src/.env' })
require('dotenv').config()
const db = require('./src/config/database')

async function migrate() {
  const steps = [
    // ── Novas colunas em funcionarios ─────────────────────────────────────────
    `ALTER TABLE funcionarios
       ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50) NULL AFTER genero,
       ADD COLUMN IF NOT EXISTS numero_funcionario VARCHAR(50) NULL AFTER nome`,

    // Garantir estado 'suspenso' é aceite (enum já deve existir — só actualizamos se não tiver)
    // MySQL não tem IF NOT EXISTS para MODIFY COLUMN, usamos IGNORE

    // ── Novas colunas em contratos ─────────────────────────────────────────────
    `ALTER TABLE contratos
       ADD COLUMN IF NOT EXISTS numero_contrato VARCHAR(100) NULL AFTER escola_id`,

    // ── Novas colunas em faltas_rh ─────────────────────────────────────────────
    `ALTER TABLE faltas_rh
       ADD COLUMN IF NOT EXISTS dias INT NOT NULL DEFAULT 1 AFTER data`,

    // ── Configuração salarial por escola ──────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS rh_configuracao (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL UNIQUE,
       dias_uteis_mes INT NOT NULL DEFAULT 22,
       inss_trabalhador DECIMAL(5,2) NOT NULL DEFAULT 3.00,
       inss_entidade DECIMAL(5,2) NOT NULL DEFAULT 4.00,
       calcular_irps TINYINT(1) NOT NULL DEFAULT 1,
       componentes JSON,
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
     )`,

    // ── Documentos do funcionário ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS funcionario_documentos (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       funcionario_id INT NOT NULL,
       tipo VARCHAR(100) NOT NULL,
       nome VARCHAR(255),
       data_doc DATE,
       data_validade DATE,
       arquivo LONGTEXT,
       observacoes TEXT,
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
       FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
     )`,
  ]

  for (const sql of steps) {
    try {
      await db.query(sql)
      const first = sql.trim().slice(0, 60).replace(/\s+/g, ' ')
      console.log('✓', first, '...')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        console.log('– já existe, ignorado')
      } else {
        console.error('✗ ERRO:', err.message)
        console.error('  SQL:', sql.trim().slice(0, 100))
      }
    }
  }

  console.log('\nMigração concluída.')
  process.exit(0)
}

migrate().catch(err => { console.error(err); process.exit(1) })
