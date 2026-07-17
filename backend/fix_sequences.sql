-- Resincroniza as sequences de identity com o maior id realmente existente em
-- cada tabela. Necessario porque inserts com id explicito (ex: seed.js) nao
-- avancam a sequence automaticamente, o que pode causar "duplicate key" no
-- primeiro INSERT normal a seguir.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'id' AND is_identity = 'YES'
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX(id) FROM %I), 1), (SELECT MAX(id) FROM %I) IS NOT NULL)',
      t, 'id', t, t
    );
  END LOOP;
END $$;
