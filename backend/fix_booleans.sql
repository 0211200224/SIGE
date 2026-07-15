-- Ajusta colunas BOOLEAN nativas para SMALLINT, para compatibilidade com o
-- codigo existente que usa literais MySQL-style (0/1) em vez de true/false.
-- Mantem o mesmo comportamento funcional que TINYINT(1) tinha em MySQL.
ALTER TABLE escolas ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE escolas ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE escolas ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE utilizadores ALTER COLUMN primeiro_login DROP DEFAULT;
ALTER TABLE utilizadores ALTER COLUMN primeiro_login TYPE SMALLINT USING (primeiro_login::int);
ALTER TABLE utilizadores ALTER COLUMN primeiro_login SET DEFAULT 1;
ALTER TABLE utilizadores ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE utilizadores ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE utilizadores ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE taxas ALTER COLUMN obrigatoria DROP DEFAULT;
ALTER TABLE taxas ALTER COLUMN obrigatoria TYPE SMALLINT USING (obrigatoria::int);
ALTER TABLE taxas ALTER COLUMN obrigatoria SET DEFAULT 1;
ALTER TABLE taxas ALTER COLUMN valor_variavel DROP DEFAULT;
ALTER TABLE taxas ALTER COLUMN valor_variavel TYPE SMALLINT USING (valor_variavel::int);
ALTER TABLE taxas ALTER COLUMN valor_variavel SET DEFAULT 0;
ALTER TABLE taxas ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE taxas ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE taxas ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE presencas ALTER COLUMN presente DROP DEFAULT;
ALTER TABLE presencas ALTER COLUMN presente TYPE SMALLINT USING (presente::int);
ALTER TABLE presencas ALTER COLUMN presente SET DEFAULT 0;
ALTER TABLE presencas ALTER COLUMN justificada DROP DEFAULT;
ALTER TABLE presencas ALTER COLUMN justificada TYPE SMALLINT USING (justificada::int);
ALTER TABLE presencas ALTER COLUMN justificada SET DEFAULT 0;

ALTER TABLE planos_propinas ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE planos_propinas ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE planos_propinas ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE grade_levels ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE grade_levels ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE grade_levels ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE subjects ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE subjects ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE subjects ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE class_groups ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE class_groups ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE class_groups ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE teaching_assignments ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE teaching_assignments ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE teaching_assignments ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE salas ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE salas ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE salas ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE departamentos ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE departamentos ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE departamentos ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE cargos ALTER COLUMN activo DROP DEFAULT;
ALTER TABLE cargos ALTER COLUMN activo TYPE SMALLINT USING (activo::int);
ALTER TABLE cargos ALTER COLUMN activo SET DEFAULT 1;

ALTER TABLE rh_configuracao ALTER COLUMN calcular_irps DROP DEFAULT;
ALTER TABLE rh_configuracao ALTER COLUMN calcular_irps TYPE SMALLINT USING (calcular_irps::int);
ALTER TABLE rh_configuracao ALTER COLUMN calcular_irps SET DEFAULT 1;

ALTER TABLE politicas_academicas ALTER COLUMN permite_recurso TYPE SMALLINT USING (permite_recurso::int);

ALTER TABLE politicas_financeiras ALTER COLUMN bloquear_acesso_divida TYPE SMALLINT USING (bloquear_acesso_divida::int);

ALTER TABLE notificacoes ALTER COLUMN lida DROP DEFAULT;
ALTER TABLE notificacoes ALTER COLUMN lida TYPE SMALLINT USING (lida::int);
ALTER TABLE notificacoes ALTER COLUMN lida SET DEFAULT 0;

ALTER TABLE aluno_encarregados ALTER COLUMN principal DROP DEFAULT;
ALTER TABLE aluno_encarregados ALTER COLUMN principal TYPE SMALLINT USING (principal::int);
ALTER TABLE aluno_encarregados ALTER COLUMN principal SET DEFAULT 0;
