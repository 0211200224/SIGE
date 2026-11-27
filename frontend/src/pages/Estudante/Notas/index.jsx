import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import { agruparPorDisciplina, corNota, temValor, FORMULA_TEXTO } from '../../../utils/avaliacao'

const bgNota = (v) => {
  if (!temValor(v)) return 'bg-gray-100 text-gray-500'
  const n = Number(v)
  if (n >= 14) return 'bg-green-100 text-green-700 font-bold'
  if (n >= 10) return 'bg-blue-100 text-blue-700'
  return 'bg-red-100 text-red-700 font-bold'
}

const Celula = ({ v, forte }) => (
  <td className={`px-2 py-2 text-center tabular-nums ${corNota(v)} ${forte ? 'font-bold' : ''}`}>{temValor(v) ? v : '—'}</td>
)

export default function EstudanteNotas() {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [trimestre, setTrimestre] = useState('todos')

  useEffect(() => {
    api.get('/estudante/notas')
      .then(r => setNotas(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Por disciplina: ACS 1, ACS 2, Média ACS, AP e Média de cada trimestre + média anual
  const disciplinas = agruparPorDisciplina(notas)
  const trimestresDisp = [...new Set(notas.map(n => n.trimestre))].sort()
  const trimestresVisiveis = trimestre === 'todos' ? [1, 2, 3] : [Number(trimestre)]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader title="Notas e Médias" subtitle="As tuas avaliações por disciplina e trimestre" />

      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 mb-5 text-xs text-on-surface flex items-start gap-2">
        <span className="material-symbols-outlined text-primary text-[16px] mt-px">function</span>
        <span>{FORMULA_TEXTO}. A <b>média anual</b> é a média dos trimestres concluídos.</span>
      </div>

      {trimestresDisp.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {['todos', ...trimestresDisp.map(String)].map(t => (
            <button key={t} onClick={() => setTrimestre(t)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${trimestre === t ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'}`}>
              {t === 'todos' ? 'Todos os Trimestres' : `${t}º Trimestre`}
            </button>
          ))}
        </div>
      )}

      {disciplinas.length === 0 ? (
        <EmptyState icon="grade" title="Sem notas publicadas" description="Ainda não existem avaliações registadas para a tua conta." />
      ) : (
        <div className="space-y-4">
          {disciplinas.map(disc => (
            <div key={disc.disciplina_id} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-surface-container-low border-b border-outline-variant">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">book</span>
                  <h3 className="font-semibold text-on-surface text-sm truncate">{disc.nome}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">Média anual{disc.trimestres_concluidos > 0 && disc.trimestres_concluidos < 3 ? ` (${disc.trimestres_concluidos}/3 trim.)` : ''}:</span>
                  <span className={`text-sm px-2.5 py-0.5 rounded-full ${bgNota(disc.media_anual)}`}>{disc.media_anual ?? '—'}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-xs text-on-surface-variant">
                      <th className="text-left px-4 py-2 font-medium">Trimestre</th>
                      <th className="px-2 py-2 font-medium text-center">ACS 1</th>
                      <th className="px-2 py-2 font-medium text-center">ACS 2</th>
                      <th className="px-2 py-2 font-medium text-center">Média ACS</th>
                      <th className="px-2 py-2 font-medium text-center text-amber-800 bg-amber-50">AP</th>
                      <th className="px-2 py-2 font-semibold text-center text-primary bg-primary/5">Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trimestresVisiveis.map(t => {
                      const r = disc.trimestres[t]
                      return (
                        <tr key={t} className="border-b border-outline-variant/60 last:border-b-0">
                          <td className="px-4 py-2 text-xs font-semibold text-on-surface-variant whitespace-nowrap">{t}º Trimestre</td>
                          <Celula v={r.acs1} />
                          <Celula v={r.acs2} />
                          <Celula v={r.media_acs} />
                          <td className={`px-2 py-2 text-center tabular-nums bg-amber-50/50 ${corNota(r.ap)}`}>{temValor(r.ap) ? r.ap : '—'}</td>
                          <td className="px-2 py-2 text-center bg-primary/5">
                            <span className={`inline-block min-w-[2.25rem] text-xs px-2 py-0.5 rounded-full ${bgNota(r.media_trimestral)}`}>{r.media_trimestral ?? '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
