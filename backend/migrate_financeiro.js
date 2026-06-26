const db = require('./src/config/database')

async function run() {
  console.log('▶ Migração Financeiro...')

  // Extender ENUM de pagamentos.estado para incluir em_analise + confirmado
  await db.query(`
    ALTER TABLE pagamentos
    MODIFY COLUMN estado ENUM('pendente','em_analise','confirmado','rejeitado','aprovado')
    NOT NULL DEFAULT 'pendente'
  `)
  console.log('✓ pagamentos.estado enum extendido')

  // Adicionar motivo_rejeicao e data_pagamento se não existirem
  const colsPag = await db.query('SHOW COLUMNS FROM pagamentos')
  const fields = colsPag.rows.map(r => r.Field)
  if (!fields.includes('motivo_rejeicao')) {
    await db.query('ALTER TABLE pagamentos ADD COLUMN motivo_rejeicao TEXT NULL AFTER observacoes')
    console.log('✓ pagamentos.motivo_rejeicao')
  }
  if (!fields.includes('data_pagamento')) {
    await db.query('ALTER TABLE pagamentos ADD COLUMN data_pagamento DATE NULL AFTER valor')
    console.log('✓ pagamentos.data_pagamento')
  }
  if (!fields.includes('analisado_por')) {
    await db.query('ALTER TABLE pagamentos ADD COLUMN analisado_por INT NULL AFTER aprovado_por')
    await db.query('ALTER TABLE pagamentos ADD COLUMN analisado_em TIMESTAMP NULL AFTER analisado_por')
    console.log('✓ pagamentos.analisado_por/em')
  }

  // Planos de Propinas
  await db.query(`
    CREATE TABLE IF NOT EXISTS planos_propinas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      nome VARCHAR(150) NOT NULL,
      grade_level_id INT,
      curso VARCHAR(100),
      ano_lectivo VARCHAR(9) NOT NULL,
      valor DECIMAL(12,2) NOT NULL,
      periodicidade ENUM('mensal','trimestral','semestral','anual') NOT NULL DEFAULT 'mensal',
      meses_cobrados INT NOT NULL DEFAULT 10,
      descricao TEXT,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ planos_propinas')

  // Contas de Alunos
  await db.query(`
    CREATE TABLE IF NOT EXISTS contas_alunos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      aluno_id INT NOT NULL,
      ano_lectivo VARCHAR(9) NOT NULL,
      total_cobrado DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_pago DECIMAL(12,2) NOT NULL DEFAULT 0,
      saldo_devedor DECIMAL(12,2) GENERATED ALWAYS AS (total_cobrado - total_pago) STORED,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_conta (escola_id, aluno_id, ano_lectivo)
    )
  `)
  console.log('✓ contas_alunos')

  // Bolsas e Descontos
  await db.query(`
    CREATE TABLE IF NOT EXISTS bolsas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      aluno_id INT NOT NULL,
      tipo ENUM('total','parcial','merito','familiar','outro') NOT NULL DEFAULT 'parcial',
      desconto_pct DECIMAL(5,2),
      valor_fixo DECIMAL(12,2),
      motivo TEXT,
      ano_lectivo VARCHAR(9),
      status ENUM('pendente','aprovada','rejeitada') NOT NULL DEFAULT 'pendente',
      aprovado_por INT,
      aprovado_em TIMESTAMP NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ bolsas')

  // Fechos Financeiros
  await db.query(`
    CREATE TABLE IF NOT EXISTS fechos_financeiros (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      mes_referencia VARCHAR(7) NOT NULL,
      total_recebido DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_cobrado DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_divida DECIMAL(12,2) NOT NULL DEFAULT 0,
      num_pagamentos INT NOT NULL DEFAULT 0,
      num_devedores INT NOT NULL DEFAULT 0,
      status ENUM('aberto','fechado') NOT NULL DEFAULT 'aberto',
      fechado_em TIMESTAMP NULL,
      fechado_por INT,
      observacoes TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_fecho (escola_id, mes_referencia)
    )
  `)
  console.log('✓ fechos_financeiros')

  // cobrancas.status — garantir que tem 'vencido'
  const colsCob = await db.query('SHOW COLUMNS FROM cobrancas LIKE "status"')
  if (colsCob.rows.length) {
    await db.query(`ALTER TABLE cobrancas MODIFY COLUMN status ENUM('pendente','pago','vencido','cancelado','isento') NOT NULL DEFAULT 'pendente'`)
    console.log('✓ cobrancas.status enum extendido')
  }

  console.log('✅ Migração Financeiro concluída.')
  process.exit(0)
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1) })
