// ─── Regra de avaliação do SIGE (fonte única) ────────────────────────────────
//
// Em cada trimestre, por disciplina, o aluno tem três avaliações:
//   ACS 1  -- 1.ª Avaliação Contínua e Sistemática
//   ACS 2  -- 2.ª Avaliação Contínua e Sistemática
//   AP     -- Avaliação/Prova Provincial
//
//   Média ACS          = arred( (ACS1 + ACS2) / 2 )
//   Média do trimestre = arred( (2 × Média ACS + AP) / 3 )
//   Média anual        = arred( média das médias dos trimestres concluídos )
//
// Arredondamento às unidades, 0,5 sobe (12,5 → 13). Uma média só existe
// quando todas as notas de que depende estão lançadas -- nunca é calculada
// com notas em falta.
//
// A mesma regra existe em SQL nas vistas v_notas_trimestrais e
// v_medias_anuais (ver SQL_VISTAS abaixo / supabase_schema.sql), que é o que
// pautas, boletins, ranking, resultados e indicadores lêem; e no frontend
// (frontend/src/utils/avaliacao.js) para o cálculo ao vivo na pauta do
// professor. Alterar a regra = alterar os três sítios.

const TIPOS_AVALIACAO = [
  { tipo: 'acs1', sigla: 'ACS 1', nome: '1.ª Avaliação Contínua e Sistemática' },
  { tipo: 'acs2', sigla: 'ACS 2', nome: '2.ª Avaliação Contínua e Sistemática' },
  { tipo: 'ap', sigla: 'AP', nome: 'Avaliação Provincial' },
]
const TIPOS_VALIDOS = TIPOS_AVALIACAO.map(t => t.tipo)
const NOTA_MIN = 0
const NOTA_MAX = 20

const temValor = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))
// Math.round arredonda 0,5 para cima nos positivos; o epsilon evita que
// erros de vírgula flutuante (ex: 12.499999) desçam.
const arred = (v) => Math.round(Number(v) + 1e-9)

const mediaAcs = (acs1, acs2) => (temValor(acs1) && temValor(acs2) ? arred((Number(acs1) + Number(acs2)) / 2) : null)

const mediaTrimestral = (acs1, acs2, ap) => {
  const macs = mediaAcs(acs1, acs2)
  return macs !== null && temValor(ap) ? arred((2 * macs + Number(ap)) / 3) : null
}

const mediaAnual = (mediasTrimestrais) => {
  const vals = (mediasTrimestrais || []).filter(temValor).map(Number)
  return vals.length ? arred(vals.reduce((s, v) => s + v, 0) / vals.length) : null
}

// notas = { acs1, acs2, ap } -> { ...notas, media_acs, media_trimestral }
const calcularTrimestre = (notas = {}) => ({
  acs1: temValor(notas.acs1) ? Number(notas.acs1) : null,
  acs2: temValor(notas.acs2) ? Number(notas.acs2) : null,
  ap: temValor(notas.ap) ? Number(notas.ap) : null,
  media_acs: mediaAcs(notas.acs1, notas.acs2),
  media_trimestral: mediaTrimestral(notas.acs1, notas.acs2, notas.ap),
})

const SQL_VISTAS = `
-- Regra de avaliacao (ver backend/src/utils/avaliacao.js): por trimestre e
-- disciplina, Media ACS = arred((ACS1+ACS2)/2) e Media do trimestre =
-- arred((2*Media ACS + AP)/3); ROUND de numeric arredonda 0,5 para cima.
CREATE OR REPLACE VIEW v_notas_trimestrais AS
WITH base AS (
  SELECT escola_id, aluno_id, disciplina_id, turma_id, trimestre,
         MAX(valor) FILTER (WHERE LOWER(tipo) = 'acs1') AS acs1,
         MAX(valor) FILTER (WHERE LOWER(tipo) = 'acs2') AS acs2,
         MAX(valor) FILTER (WHERE LOWER(tipo) = 'ap')   AS ap
  FROM notas
  WHERE LOWER(tipo) IN ('acs1', 'acs2', 'ap')
  GROUP BY escola_id, aluno_id, disciplina_id, turma_id, trimestre
), comacs AS (
  SELECT base.*,
         CASE WHEN acs1 IS NOT NULL AND acs2 IS NOT NULL THEN ROUND((acs1 + acs2) / 2.0) END AS media_acs
  FROM base
)
SELECT comacs.*,
       CASE WHEN media_acs IS NOT NULL AND ap IS NOT NULL THEN ROUND((2 * media_acs + ap) / 3.0) END AS media_trimestral
FROM comacs;

-- Media anual = arred(media das medias dos trimestres concluidos).
CREATE OR REPLACE VIEW v_medias_anuais AS
SELECT escola_id, aluno_id, disciplina_id, turma_id,
       ROUND(AVG(media_trimestral)) AS media_anual,
       COUNT(*) AS trimestres_concluidos,
       MAX(media_trimestral) FILTER (WHERE trimestre = 1) AS media_t1,
       MAX(media_trimestral) FILTER (WHERE trimestre = 2) AS media_t2,
       MAX(media_trimestral) FILTER (WHERE trimestre = 3) AS media_t3
FROM v_notas_trimestrais
WHERE media_trimestral IS NOT NULL
GROUP BY escola_id, aluno_id, disciplina_id, turma_id;
`

module.exports = {
  TIPOS_AVALIACAO, TIPOS_VALIDOS, NOTA_MIN, NOTA_MAX,
  temValor, arred, mediaAcs, mediaTrimestral, mediaAnual, calcularTrimestre,
  SQL_VISTAS,
}
