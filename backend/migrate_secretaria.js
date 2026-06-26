/**
 * Migração Secretaria — executa uma vez.
 * Uso: node migrate_secretaria.js
 */
require('dotenv').config({ path: './src/.env' })
require('dotenv').config()
const db = require('./src/config/database')

async function migrate() {
  const steps = [
    // ── Expandir alunos ──────────────────────────────────────────────────────
    `ALTER TABLE alunos
       ADD COLUMN IF NOT EXISTS foto LONGTEXT NULL AFTER nome,
       ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(150) NULL AFTER data_nascimento,
       ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(100) NULL DEFAULT 'Moçambicana' AFTER naturalidade,
       ADD COLUMN IF NOT EXISTS bi VARCHAR(50) NULL AFTER nacionalidade,
       ADD COLUMN IF NOT EXISTS telefone VARCHAR(30) NULL AFTER bi,
       ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL AFTER telefone,
       ADD COLUMN IF NOT EXISTS endereco VARCHAR(300) NULL AFTER email,
       ADD COLUMN IF NOT EXISTS curso VARCHAR(100) NULL AFTER endereco,
       ADD COLUMN IF NOT EXISTS turno ENUM('Manhã','Tarde','Noite') NULL AFTER curso,
       ADD COLUMN IF NOT EXISTS ano_lectivo VARCHAR(10) NULL AFTER turno,
       ADD COLUMN IF NOT EXISTS nome_encarregado VARCHAR(150) NULL AFTER ano_lectivo,
       ADD COLUMN IF NOT EXISTS tel_encarregado VARCHAR(30) NULL AFTER nome_encarregado,
       ADD COLUMN IF NOT EXISTS parentesco VARCHAR(50) NULL DEFAULT 'Pai/Mãe' AFTER tel_encarregado,
       ADD COLUMN IF NOT EXISTS class_group_id INT NULL AFTER parentesco,
       ADD COLUMN IF NOT EXISTS status ENUM('activo','inactivo','suspenso','transferido','concluido','desistente') NOT NULL DEFAULT 'activo' AFTER class_group_id`,

    // ── aluno_matriculas ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS aluno_matriculas (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       aluno_id INT NOT NULL,
       class_group_id INT NOT NULL,
       ano_lectivo VARCHAR(10) NOT NULL,
       numero_matricula VARCHAR(60) NULL,
       data_matricula DATE NULL DEFAULT (CURDATE()),
       turno VARCHAR(20) NULL,
       observacoes TEXT NULL,
       status ENUM('pendente','matriculado','cancelado') NOT NULL DEFAULT 'matriculado',
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
       FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
     )`,

    // status actualizado em aluno_matriculas (compatibilidade com schema anterior)
    `ALTER TABLE aluno_matriculas
       MODIFY COLUMN IF EXISTS status ENUM('pendente','matriculado','activo','cancelado') NOT NULL DEFAULT 'matriculado'`,

    // ── aluno_documentos ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS aluno_documentos (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       aluno_id INT NOT NULL,
       tipo VARCHAR(100) NOT NULL,
       descricao TEXT NULL,
       arquivo LONGTEXT NULL,
       data_doc DATE NULL,
       status ENUM('pendente','em_processamento','concluido','cancelado') NOT NULL DEFAULT 'pendente',
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
       FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
     )`,

    // ── Encarregados (tabela própria) ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS encarregados (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       nome VARCHAR(150) NOT NULL,
       parentesco VARCHAR(80) NOT NULL DEFAULT 'Pai/Mãe',
       telefone VARCHAR(30) NULL,
       email VARCHAR(150) NULL,
       endereco VARCHAR(300) NULL,
       profissao VARCHAR(100) NULL,
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
     )`,

    // ── Junction aluno ↔ encarregado ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS aluno_encarregados (
       id INT AUTO_INCREMENT PRIMARY KEY,
       aluno_id INT NOT NULL,
       encarregado_id INT NOT NULL,
       principal TINYINT(1) NOT NULL DEFAULT 0,
       UNIQUE KEY uk_aluno_enc (aluno_id, encarregado_id),
       FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
       FOREIGN KEY (encarregado_id) REFERENCES encarregados(id) ON DELETE CASCADE
     )`,

    // ── Transferências ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS transferencias (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       aluno_id INT NOT NULL,
       tipo ENUM('interna','externa_saida','externa_entrada','mudanca_turma','mudanca_curso') NOT NULL,
       class_group_origem_id INT NULL,
       class_group_destino_id INT NULL,
       escola_origem VARCHAR(200) NULL,
       escola_destino VARCHAR(200) NULL,
       motivo TEXT NULL,
       data DATE NOT NULL,
       status ENUM('pendente','aprovada','rejeitada') NOT NULL DEFAULT 'pendente',
       observacoes TEXT NULL,
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
       FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
     )`,

    // ── Solicitações ──────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS solicitacoes (
       id INT AUTO_INCREMENT PRIMARY KEY,
       escola_id INT NOT NULL,
       aluno_id INT NOT NULL,
       tipo ENUM('declaracao','historico','certificado','declaracao_matricula','declaracao_frequencia','comprovativo') NOT NULL,
       status ENUM('pendente','em_processamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
       observacoes TEXT NULL,
       numero_doc VARCHAR(50) NULL,
       data_conclusao DATE NULL,
       criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
       FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
     )`,
  ]

  for (const sql of steps) {
    try {
      await db.query(sql)
      const first = sql.trim().slice(0, 70).replace(/\s+/g, ' ')
      console.log('✓', first, '...')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column') || err.message.includes('already exists')) {
        console.log('– já existe, ignorado')
      } else {
        console.error('✗ ERRO:', err.message)
        console.error('  SQL:', sql.trim().slice(0, 120))
      }
    }
  }

  console.log('\nMigração da Secretaria concluída.')
  process.exit(0)
}

migrate().catch(err => { console.error(err); process.exit(1) })
