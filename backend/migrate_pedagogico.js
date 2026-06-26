const db = require('./src/config/database')

async function run() {
  console.log('▶ Migração Pedagógico...')

  // Períodos Lectivos
  await db.query(`
    CREATE TABLE IF NOT EXISTS periodos_lectivos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      nome VARCHAR(100) NOT NULL,
      ano_lectivo VARCHAR(9) NOT NULL,
      tipo ENUM('1_trimestre','2_trimestre','3_trimestre','exame','recurso') NOT NULL DEFAULT '1_trimestre',
      data_inicio DATE,
      data_fim DATE,
      nota_minima DECIMAL(4,1) NOT NULL DEFAULT 10.0,
      frequencia_minima DECIMAL(4,1) NOT NULL DEFAULT 75.0,
      status ENUM('aberto','fechado') NOT NULL DEFAULT 'aberto',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_periodo (escola_id, ano_lectivo, tipo)
    )
  `)
  console.log('✓ periodos_lectivos')

  // Planos Curriculares
  await db.query(`
    CREATE TABLE IF NOT EXISTS planos_curriculares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      grade_level_id INT NOT NULL,
      subject_id INT NOT NULL,
      tipo ENUM('obrigatoria','opcional') NOT NULL DEFAULT 'obrigatoria',
      carga_horaria INT NOT NULL DEFAULT 4,
      ano_lectivo VARCHAR(9),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_plano (escola_id, grade_level_id, subject_id, ano_lectivo)
    )
  `)
  console.log('✓ planos_curriculares')

  // Avaliações
  await db.query(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      nome VARCHAR(150) NOT NULL,
      tipo ENUM('teste','prova','exame','trabalho','exercicio') NOT NULL DEFAULT 'teste',
      subject_id INT,
      class_group_id INT,
      periodo_id INT,
      peso DECIMAL(5,2) DEFAULT 100.00,
      data_programada DATE,
      status ENUM('activa','fechada') NOT NULL DEFAULT 'activa',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ avaliacoes')

  // Conselhos de Classe
  await db.query(`
    CREATE TABLE IF NOT EXISTS conselhos_classe (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      class_group_id INT NOT NULL,
      periodo_id INT,
      data DATE,
      observacoes TEXT,
      decisoes TEXT,
      alunos_risco TEXT,
      status ENUM('rascunho','finalizado') NOT NULL DEFAULT 'rascunho',
      criado_por INT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ conselhos_classe')

  // Resultados Finais
  await db.query(`
    CREATE TABLE IF NOT EXISTS resultados_finais (
      id INT AUTO_INCREMENT PRIMARY KEY,
      escola_id INT NOT NULL,
      aluno_id INT NOT NULL,
      class_group_id INT NOT NULL,
      periodo_id INT NOT NULL,
      media_final DECIMAL(5,2),
      frequencia_pct DECIMAL(5,2),
      situacao ENUM('aprovado','reprovado','exame','recurso','pendente') NOT NULL DEFAULT 'pendente',
      fechado_em TIMESTAMP NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_resultado (escola_id, aluno_id, class_group_id, periodo_id)
    )
  `)
  console.log('✓ resultados_finais')

  // carga_horaria na teaching_assignments se não existir
  const cols = await db.query('SHOW COLUMNS FROM teaching_assignments LIKE "carga_horaria"')
  if (!cols.rows.length) {
    await db.query('ALTER TABLE teaching_assignments ADD COLUMN carga_horaria INT DEFAULT 4 AFTER ano_lectivo')
    console.log('✓ teaching_assignments.carga_horaria')
  }

  console.log('✅ Migração Pedagógico concluída.')
  process.exit(0)
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1) })
