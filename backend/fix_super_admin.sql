-- Converte o utilizador id=1 (era "Director Admin" com email) para o
-- super_admin correcto do sistema (codigo + senha, sem escola associada).
UPDATE utilizadores
SET escola_id = NULL,
    nome = 'Super Admin',
    email = NULL,
    role = 'super_admin',
    codigo = 'SIGE.ADM.001',
    password_hash = '$2a$12$pHvns/9yfcBfKK1pBzslfewY2I35PUSVMoeloOJNHjmSNZ.as/ALO',
    primeiro_login = 1
WHERE id = 1;

-- Remove a escola de teste (cascata remove os registos de teste ligados a ela:
-- turma/classe, taxa, etc. criados durante os testes desta sessao).
DELETE FROM escolas WHERE id = 1;
