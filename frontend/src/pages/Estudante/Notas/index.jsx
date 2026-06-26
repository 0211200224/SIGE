import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const corNota = (v) => {
  if (v === null || v === undefined) return 'text-on-surface-variant'
  const n = Number(v)
  if (n >= 14) return 'text-green-600 font-bold'
  if (n >= 10) return 'text-blue-600'
  return 'text-red-600 font-bold'
}

const bgNota = (v) => {
  if (v === null || v === undefined) return 'bg-gray-100 text-gray-500'
  const n = Number(v)
  if (n >= 14) return 'bg-green-100 text-green-700 font-bold'
  if (n >= 10) return 'bg-blue-100 text-blue-700'
  return 'bg-red-100 text-red-700 font-bold'
}

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

  // Agrupar notas por disciplina
  const disciplinas = (() => {
    const map = {}
    const notasFiltradas = trimestre === 'todos' ? notas : notas.filter(n => String(n.trimestre) === trimestre)
    for (const n of notasFiltradas) {
      if (!map[n.disciplina_id]) {
        map[n.disciplina_id] = { id: n.disciplina_id, nome: n.disciplina_nome, notas: {} }
      }
      if (!map[n.disciplina_id].notas[n.trimestre]) {
        map[n.disciplina_id].notas[n.trimestre] = []
      }
      map[n.disciplina_id].notas[n.trimestre].push(n)
    }
    return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome))
  })()

  const calcMedia = (vals) => {
    const ns = vals.filter(v => v !== null && v !== undefined).map(Number)
    if (!ns.length) return null
    return Math.round(ns.reduce((s, v) => s + v, 0) / ns.length * 10) / 10
  }

  const trimestresDisp = [...new Set(notas.map(n => n.trimestre))].sort()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Notas e Médias" subtitle="Consulta as tuas avaliações por disciplina e trimestre" />

      {/* Filtro trimestre */}
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

      {notas.length === 0 ? (
        <EmptyState icon="grade" title="Sem notas publicadas" description="Ainda não existem avaliações registadas para a tua conta." />
      ) : disciplinas.length === 0 ? (
        <EmptyState icon="grade" title="Sem notas neste trimestre" description="Não existem notas para o trimestre seleccionado." />
      ) : (
        <div className="space-y-4">
          {disciplinas.map(disc => {
            const todasNotas = Object.values(disc.notas).flat()
            const mediaDisc = calcMedia(todasNotas.map(n => n.valor))

            return (
              <div key={disc.id} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                {/* Header da disciplina */}
                <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">book</span>
                    <h3 className="font-semibold text-on-surface text-sm">{disc.nome}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant">Média:</span>
                    <span className={`text-sm px-2.5 py-0.5 rounded-full ${bgNota(mediaDisc)}`}>
                      {mediaDisc ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Notas por trimestre */}
                <div className="p-4">
                  {[1, 2, 3].map(t => {
                    const notasT = disc.notas[t]
                    if (!notasT && trimestre !== 'todos') return null
                    if (!notasT) return (
                      <div key={t} className="flex items-center gap-3 py-2 text-xs text-on-surface-variant">
                        <span className="w-24 font-medium">{t}º Trimestre</span>
                        <span className="italic">Sem notas</span>
                      </div>
                    )
                    const mediaT = calcMedia(notasT.map(n => n.valor))
                    return (
                      <div key={t} className="py-2 border-b border-outline-variant/50 last:border-b-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-semibold text-on-surface-variant w-24">{t}º Trimestre</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${bgNota(mediaT)}`}>
                            Média: {mediaT ?? '—'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-24">
                          {notasT.map((n, i) => (
                            <div key={i} className="flex flex-col items-center bg-surface-container-low rounded-lg px-3 py-2 min-w-[72px]">
                              <span className="text-[10px] text-on-surface-variant mb-1">{n.tipo || 'Nota'}</span>
                              <span className={`text-base ${corNota(n.valor)}`}>{n.valor ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
