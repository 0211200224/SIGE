-- SIGE - Schema MySQL
-- Importar no phpMyAdmin: http://localhost/phpmyadmin

CREATE DATABASE IF NOT EXISTS sige_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sige_db;

CREATE TABLE IF NOT EXISTS escolas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  sigla VARCHAR(20),
  localizacao VARCHAR(300),
  provincia VARCHAR(100),
  cidade VARCHAR(100),
  contacto VARCHAR(50),
  email VARCHAR(150),
  ano_lectivo VARCHAR(10),
  nivel_ensino VARCHAR(50),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS utilizadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('director','secretaria','professor','financeiro','rh','pedagogico','aluno','super_admin') NOT NULL,
  aluno_id INT NULL,
  activo TINYINT(1) DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  classe VARCHAR(20),
  sala VARCHAR(50),
  professor_director_id INT,
  ano_lectivo VARCHAR(10),
  capacidade INT DEFAULT 30,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  data_nascimento DATE,
  genero ENUM('M','F'),
  turma_id INT,
  numero_matricula VARCHAR(50),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
  FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS disciplinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  aluno_id INT NOT NULL,
  disciplina_id INT NOT NULL,
  turma_id INT,
  trimestre TINYINT NOT NULL,
  tipo VARCHAR(50),
  valor DECIMAL(5,2),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presencas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  turma_id INT,
  disciplina_id INT,
  data DATE NOT NULL,
  professor_id INT,
  aluno_id INT NOT NULL,
  presente TINYINT(1) DEFAULT 0,
  justificada TINYINT(1) DEFAULT 0,
  observacao TEXT,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS taxas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  classe VARCHAR(20),
  descricao TEXT,
  obrigatoria TINYINT(1) DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  aluno_id INT NOT NULL,
  taxa_id INT,
  valor DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(50),
  comprovativo_url VARCHAR(300),
  referencia VARCHAR(100),
  estado ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS funcionarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  role VARCHAR(50),
  departamento VARCHAR(100),
  salario_base DECIMAL(10,2),
  tipo_contrato VARCHAR(50),
  data_admissao DATE,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS salarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escola_id INT NOT NULL,
  funcionario_id INT NOT NULL,
  mes TINYINT NOT NULL,
  ano SMALLINT NOT NULL,
  valor_bruto DECIMAL(10,2),
  descontos DECIMAL(10,2),
  valor_liquido DECIMAL(10,2),
  estado ENUM('processado','pago') DEFAULT 'processado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE,
  FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE
);

-- Migration: Portal do Estudante
-- Executar manualmente se a DB já existir:
-- ALTER TABLE utilizadores MODIFY COLUMN role ENUM('director','secretaria','professor','financeiro','rh','pedagogico','aluno') NOT NULL;
-- ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS aluno_id INT NULL;

-- Escola de exemplo (o utilizador admin é criado via: node src/seed.js)
INSERT INTO escolas (nome, sigla, localizacao, provincia, cidade, ano_lectivo, nivel_ensino)
VALUES ('Escola Primária SIGE', 'EPS', 'Rua Principal, 123', 'Maputo', 'Maputo', '2024', 'Primário');
