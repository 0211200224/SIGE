// Reconstrucao do Liceu (escola 6) num UNICO comando executado no servidor.
// Uso: node 03_reconstruir_lvs.js <backend> <rebuild.json> <backup_out.json> [commit]
const path = require('path')
const fs = require('fs')
const [B, DATA, BACKUP_OUT, MODE] = process.argv.slice(2)
const COMMIT = MODE === 'commit'
require(path.join(B, 'node_modules/dotenv')).config({ path: path.join(B, '.env') })
const { Client } = require(path.join(B, 'node_modules/pg'))
const bcrypt = require(path.join(B, 'node_modules/bcryptjs'))
const { senhaDeNascimento } = require(path.join(B, 'src/utils/codigoGenerator.js'))

const D = JSON.parse(fs.readFileSync(DATA, 'utf8'))
D.alunos.forEach((a, i) => {
  a.seq = i + 1
  a.senha = senhaDeNascimento(a.data_nascimento)
  a.hash = bcrypt.hashSync(a.senha, 12)
})
D.pagamentos.forEach((p, i) => { p.rec = `REC-2026-${String(i + 1).padStart(5, '0')}` })
console.log('hashes prontos')

const payload = JSON.stringify(D)
if (payload.includes('$PL$') || payload.includes('$J$')) throw new Error('delimitador presente nos dados')

const body = `
DO $PL$
DECLARE
  d json := ${'$' + 'J$'}${payload}${'$' + 'J$'};
  esc int := 6;
  t text;
  pend text[];
  falhas text[];
  keep text;
  n int;
  pass int;
  gl int; sala int; turma int; cargo int;
  base int;
  a json; s json;
  v_aid int;
  info text := '';
BEGIN
  SET LOCAL lock_timeout = '15s';
  SELECT array_agg(c.table_name::text ORDER BY c.table_name) INTO pend
  FROM information_schema.columns c JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
  WHERE c.table_schema = 'public' AND c.column_name = 'escola_id' AND tb.table_type = 'BASE TABLE'
    AND c.table_name NOT IN ('rh_configuracao','financeiro_configuracao','auditoria_log');

  FOR pass IN 1..6 LOOP
    falhas := ARRAY[]::text[];
    FOREACH t IN ARRAY pend LOOP
      keep := CASE t
        WHEN 'utilizadores' THEN ' AND id <> 93'
        WHEN 'funcionarios' THEN ' AND id <> 31'
        WHEN 'contratos' THEN ' AND funcionario_id <> 31'
        WHEN 'salarios' THEN ' AND funcionario_id <> 31'
        ELSE '' END;
      BEGIN
        EXECUTE format('DELETE FROM %I WHERE escola_id = $1', t) || keep USING esc;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN info := info || t || '=' || n || ' '; END IF;
      EXCEPTION WHEN foreign_key_violation THEN
        falhas := falhas || t;
      END;
    END LOOP;
    pend := falhas;
    EXIT WHEN cardinality(pend) = 0;
  END LOOP;
  IF cardinality(pend) > 0 THEN RAISE EXCEPTION 'nao foi possivel apagar: %', pend; END IF;
  RAISE NOTICE 'apagados: %', info;

  INSERT INTO grade_levels (escola_id, nome, ordem, nivel_ensino) VALUES (esc, '7ª Classe', 7, 'Secundário') RETURNING id INTO gl;
  INSERT INTO salas (escola_id, codigo, nome, tipo, capacidade) VALUES (esc, 'SS1', 'SALA 1', 'Sala de Aula', 100) RETURNING id INTO sala;
  INSERT INTO class_groups (escola_id, grade_level_id, room_id, nome, turno, capacidade, ano_lectivo) VALUES (esc, gl, sala, 'A', 'Tarde', 100, '2026') RETURNING id INTO turma;

  SELECT COALESCE(MAX(CAST(SUBSTRING(c FROM '\\.(\\d+)$') AS INTEGER)), 0) INTO base FROM (
    SELECT UPPER(codigo) c FROM utilizadores WHERE UPPER(codigo) LIKE 'LVS.EST.%'
    UNION ALL SELECT UPPER(codigo) FROM utilizador_portais WHERE UPPER(codigo) LIKE 'LVS.EST.%') x;

  CREATE TEMP TABLE map_aluno (old_id text PRIMARY KEY, id int, codigo text) ON COMMIT DROP;
  FOR a IN SELECT * FROM json_array_elements(d->'alunos') LOOP
    INSERT INTO alunos (escola_id,nome,data_nascimento,genero,naturalidade,nacionalidade,bi,nome_pai,nome_mae,telefone,email,endereco,turno,ano_lectivo,nome_encarregado,tel_encarregado,parentesco,class_group_id,numero_matricula,status)
    VALUES (esc, a->>'nome', (a->>'data_nascimento')::date, a->>'genero', a->>'naturalidade', a->>'nacionalidade', a->>'bi', a->>'nome_pai', a->>'nome_mae',
            a->>'telefone', a->>'email', a->>'endereco', 'Tarde', '2026', a->>'nome_encarregado', a->>'tel_encarregado', 'Pai/Mãe', turma,
            esc || '-2026-' || lpad(a->>'seq', 4, '0'), a->>'status')
    RETURNING id INTO v_aid;
    INSERT INTO aluno_matriculas (escola_id, aluno_id, class_group_id, ano_lectivo, numero_matricula, turno, observacoes, status)
    VALUES (esc, v_aid, turma, '2026', 'MAT-2026-' || lpad(a->>'seq', 5, '0'), 'Tarde', 'Importado do sistema antigo (7ª Classe Liceu 2026)', 'activo');
    INSERT INTO utilizadores (escola_id,nome,password_hash,role,codigo,aluno_id,primeiro_login,data_nascimento,activo)
    VALUES (esc, a->>'nome', a->>'hash', 'aluno', 'LVS.EST.' || lpad((base + (a->>'seq')::int)::text, 4, '0'), v_aid, 1, (a->>'data_nascimento')::date,
            CASE WHEN a->>'status' = 'activo' THEN 1 ELSE 0 END);
    INSERT INTO map_aluno VALUES (a->>'_old_id', v_aid, 'LVS.EST.' || lpad((base + (a->>'seq')::int)::text, 4, '0'));
  END LOOP;

  CREATE TEMP TABLE map_taxa (k text PRIMARY KEY, id int) ON COMMIT DROP;
  FOR s IN SELECT * FROM json_array_elements(d->'taxas') LOOP
    INSERT INTO taxas (escola_id,nome,categoria,valor,valor_variavel,periodicidade,grade_level_id,obrigatoria,sujeito_iva,activo)
    VALUES (esc, s->>'nome', s->>'categoria', (s->>'valor')::numeric, 0, s->>'periodicidade', CASE WHEN (s->>'classe')::boolean THEN gl END, 1, 'nao', 1)
    RETURNING id INTO n;
    INSERT INTO map_taxa VALUES (s->>'key', n);
  END LOOP;

  CREATE TEMP TABLE src ON COMMIT DROP AS
    SELECT m.id aid, mt.id tid, x.valor, x.data, x.metodo, x.referencia, x.mes_ref, x.obs, x.rec
    FROM json_to_recordset(d->'pagamentos') AS x(old_aluno text, taxa text, valor numeric, data date, metodo text, referencia text, mes_ref text, obs text, rec text)
    JOIN map_aluno m ON m.old_id = x.old_aluno JOIN map_taxa mt ON mt.k = x.taxa;
  IF (SELECT count(*) FROM src) <> json_array_length(d->'pagamentos') THEN RAISE EXCEPTION 'pagamentos sem mapeamento'; END IF;

  ALTER TABLE src ADD COLUMN cid int;
  WITH cb AS (
    INSERT INTO cobrancas (escola_id,aluno_id,taxa_id,valor,mes_referencia,data_vencimento,status,valor_pago,multa_motivo)
    SELECT esc, aid, tid, valor, mes_ref, CASE WHEN mes_ref IS NULL THEN NULL ELSE (mes_ref || '-20')::date END, 'pago', valor, rec FROM src
    RETURNING id, multa_motivo)
  UPDATE src SET cid = cb.id FROM cb WHERE cb.multa_motivo = src.rec;
  UPDATE cobrancas SET multa_motivo = NULL WHERE escola_id = esc;

  INSERT INTO pagamentos (escola_id,aluno_id,taxa_id,cobranca_id,valor,data_pagamento,metodo,referencia,mes_referencia,observacoes,estado,numero_recibo,aprovado_em,iva_aplicado,anulado)
  SELECT esc, aid, tid, cid, valor, data, metodo, referencia, mes_ref, obs, 'confirmado', rec, data::timestamp, 0, 0 FROM src ORDER BY rec;

  INSERT INTO contas_alunos (escola_id,aluno_id,ano_lectivo,total_cobrado,total_pago)
  SELECT esc, aid, '2026', sum(valor), sum(valor) FROM src GROUP BY aid;

  INSERT INTO cargos (escola_id,nome,salario_base,descricao) VALUES (esc, 'CTA', 6000.06, 'Categoria N4, Tempo Inteiro (sistema antigo)') RETURNING id INTO cargo;
  FOR s IN SELECT * FROM json_array_elements(d->'staff') LOOP
    INSERT INTO funcionarios (escola_id,nome,bi,telefone,genero,endereco,role,cargo_id,salario_base,tipo_contrato,metodo_pagamento,banco,conta_bancaria,estado)
    VALUES (esc, s->>'nome', s->>'bi', s->>'telefone', s->>'genero', s->>'endereco', 'outro', cargo, (s->>'salario')::numeric, 'Tempo Inteiro', 'emola', s->>'banco', s->>'conta', s->>'estado');
  END LOOP;

  RAISE NOTICE 'resultado: alunos=% matriculas=% utilizadores=% taxas=% cobrancas=% pagamentos=% total=% funcionarios=% disciplinas=%',
    (SELECT count(*) FROM alunos WHERE escola_id=esc), (SELECT count(*) FROM aluno_matriculas WHERE escola_id=esc),
    (SELECT count(*) FROM utilizadores WHERE escola_id=esc), (SELECT count(*) FROM taxas WHERE escola_id=esc),
    (SELECT count(*) FROM cobrancas WHERE escola_id=esc), (SELECT count(*) FROM pagamentos WHERE escola_id=esc),
    (SELECT sum(valor) FROM pagamentos WHERE escola_id=esc), (SELECT count(*) FROM funcionarios WHERE escola_id=esc),
    (SELECT count(*) FROM subjects WHERE escola_id=esc);
  ${COMMIT ? '' : "RAISE EXCEPTION 'DRY_RUN_OK';"}
END
$PL$;`

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, keepAlive: true })
  c.on('notice', m => console.log('  ' + m.message))
  c.on('error', e => console.error('erro na ligacao:', e.message))
  await c.connect()
  try {
    if (COMMIT) {
      // copia de seguranca completa da escola 6 antes de mexer
      const tabs = (await c.query("SELECT DISTINCT c.table_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name) WHERE c.table_schema='public' AND c.column_name='escola_id' AND t.table_type='BASE TABLE'")).rows
      const bk = { gerado_em: new Date().toISOString(), escola_id: 6 }
      for (const { table_name } of tabs) bk[table_name] = (await c.query(`SELECT * FROM ${table_name} WHERE escola_id = 6`)).rows
      bk.aluno_encarregados = (await c.query('SELECT * FROM aluno_encarregados WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = 6)')).rows
      fs.writeFileSync(BACKUP_OUT, JSON.stringify(bk))
      console.log('copia de seguranca gravada:', BACKUP_OUT)
    }
    await c.query(body) // autocommit: o bloco DO e atomico
    if (COMMIT) {
      const acc = (await c.query("SELECT a.numero_matricula, a.nome, u.codigo, a.status FROM alunos a JOIN utilizadores u ON u.aluno_id = a.id WHERE a.escola_id = 6 ORDER BY a.numero_matricula")).rows
      const pw = Object.fromEntries(D.alunos.map(a => [a.seq, a.senha]))
      acc.forEach(r => { r.senha = pw[Number(r.numero_matricula.split('-')[2])] })
      fs.writeFileSync(path.join(path.dirname(DATA), 'acessos_final.json'), JSON.stringify(acc, null, 1))
      console.log('COMMIT feito')
    }
  } catch (e) {
    if (e.message === 'DRY_RUN_OK') console.log('DRY-RUN OK: tudo executado e revertido (nada gravado)')
    else { console.error('ERRO (nada gravado):', e.message); process.exitCode = 1 }
  }
  await c.end()
})()
