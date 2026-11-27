// Regra de avaliação do SIGE -- espelho de backend/src/utils/avaliacao.js e
// das vistas v_notas_trimestrais / v_medias_anuais. Alterar a regra = alterar
// os três sítios.
//
// Por trimestre e disciplina:
//   Média ACS          = arred( (ACS1 + ACS2) / 2 )
//   Média do trimestre = arred( (2 × Média ACS + AP) / 3 )
//   Média anual        = arred( média das médias dos trimestres concluídos )
// Arredondamento às unidades (0,5 sobe). Sem todas as notas, não há média.

export const TIPOS_AVALIACAO = [
  { tipo: 'acs1', sigla: 'ACS 1', nome: '1.ª Avaliação Contínua e Sistemática' },
  { tipo: 'acs2', sigla: 'ACS 2', nome: '2.ª Avaliação Contínua e Sistemática' },
  { tipo: 'ap', sigla: 'AP', nome: 'Avaliação Provincial', provincial: true },
]
export const NOTA_MIN = 0
export const NOTA_MAX = 20
export const FORMULA_TEXTO = 'Média ACS = (ACS 1 + ACS 2) ÷ 2  ·  Média do trimestre = (2 × Média ACS + AP) ÷ 3  ·  arredondado às unidades'

export const temValor = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))
export const arred = (v) => Math.round(Number(v) + 1e-9)

export const mediaAcs = (acs1, acs2) => (temValor(acs1) && temValor(acs2) ? arred((Number(acs1) + Number(acs2)) / 2) : null)

export const mediaTrimestral = (acs1, acs2, ap) => {
  const macs = mediaAcs(acs1, acs2)
  return macs !== null && temValor(ap) ? arred((2 * macs + Number(ap)) / 3) : null
}

export const mediaAnual = (mediasTrimestrais) => {
  const vals = (mediasTrimestrais || []).filter(temValor).map(Number)
  return vals.length ? arred(vals.reduce((s, v) => s + v, 0) / vals.length) : null
}

export const calcularTrimestre = (n = {}) => ({
  acs1: temValor(n.acs1) ? Number(n.acs1) : null,
  acs2: temValor(n.acs2) ? Number(n.acs2) : null,
  ap: temValor(n.ap) ? Number(n.ap) : null,
  media_acs: mediaAcs(n.acs1, n.acs2),
  media_trimestral: mediaTrimestral(n.acs1, n.acs2, n.ap),
})

// Lista de notas soltas ({ disciplina_id, disciplina_nome, trimestre, tipo, valor })
// -> por disciplina: { disciplina_id, nome, trimestres: {1:{...},2:{...},3:{...}}, media_anual, trimestres_concluidos }
export const agruparPorDisciplina = (notas = []) => {
  const porDisc = {}
  for (const n of notas) {
    const tipo = String(n.tipo || '').toLowerCase()
    if (!['acs1', 'acs2', 'ap'].includes(tipo)) continue
    if (!porDisc[n.disciplina_id]) porDisc[n.disciplina_id] = { disciplina_id: n.disciplina_id, nome: n.disciplina_nome, brutas: {} }
    const d = porDisc[n.disciplina_id]
    if (!d.brutas[n.trimestre]) d.brutas[n.trimestre] = {}
    d.brutas[n.trimestre][tipo] = n.valor
  }
  return Object.values(porDisc)
    .map(d => {
      const trimestres = {}
      for (const t of [1, 2, 3]) trimestres[t] = calcularTrimestre(d.brutas[t] || {})
      const medias = [1, 2, 3].map(t => trimestres[t].media_trimestral)
      return {
        disciplina_id: d.disciplina_id,
        nome: d.nome,
        trimestres,
        media_anual: mediaAnual(medias),
        trimestres_concluidos: medias.filter(temValor).length,
      }
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
}

// Colunas de uma pauta trimestral (ecrã e impressão), na ordem oficial.
// Linha esperada: { notas: { acs1, acs2, ap }, media_acs, media }
export const COLUNAS_PAUTA = [
  { key: 'acs1', label: 'ACS 1', valor: (a) => a.notas?.acs1 },
  { key: 'acs2', label: 'ACS 2', valor: (a) => a.notas?.acs2 },
  { key: 'macs', label: 'Média ACS', valor: (a) => a.media_acs, calculada: true },
  { key: 'ap', label: 'AP', sub: 'Prova Provincial', valor: (a) => a.notas?.ap, provincial: true },
  { key: 'mt', label: 'Média Trimestre', valor: (a) => a.media, calculada: true, final: true },
]

// Cor de uma nota/média na escala 0-20 (abaixo de 10 = negativa)
export const corNota = (v) => {
  if (!temValor(v)) return 'text-on-surface-variant'
  const n = Number(v)
  if (n >= 14) return 'text-green-600'
  if (n >= 10) return 'text-blue-600'
  return 'text-red-600'
}
