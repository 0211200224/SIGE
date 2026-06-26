import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const SITUACAO_CLS = {
  aprovado: 'bg-green-100 text-green-700',
  reprovado: 'bg-red-100 text-red-600',
  exame: 'bg-amber-100 text-amber-700',
  recurso: 'bg-orange-100 text-orange-700',
  pendente: 'bg-gray-100 text-gray-500',
}

export default function ResultadosFinais() {
  const [resultados, setResultados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')

  const load = useCallback(() => {
    if (!filtroTurma && !filtroPeriodo) return
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    if (filtroPeriodo) p.set('periodo_id', filtroPeriodo)
    if (filtroSituacao) p.set('situacao', filtroSituacao)
    api.get(`/pedagogico/resultados?${p}`)
      .then(r => setResultados(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroTurma, filtroPeriodo, filtroSituacao])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/periodos'),
    ]).then(([t, p]) => { setTurmas(t.data || []); setPeriodos(p.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleCalcular = async () => {
    if (!filtroTurma || !filtroPeriodo) { alert('Seleccione turma e período antes de calcular.'); return }
    if (!window.confirm('Calcular/recalcular os resultados finais para a turma e período seleccionados?')) return
    setCalculando(true)
    try {
      const r = await api.post('/pedagogico/resultados/calcular', { class_group_id: filtroTurma, periodo_id: filtroPeriodo })
      alert(`Resultados calculados: ${r.data.processados} aluno(s) processado(s).`)
      load()
    } catch (err) { alert(err.message) } finally { setCalculando(false) }
  }

  const stats = {
    total: resultados.length,
    aprovados: resultados.filter(r => r.situacao === 'aprovado').length,
    reprovados: resultados.filter(r => r.situacao === 'reprovado').length,
    exame: resultados.filter(r => r.situacao === 'exame').length,
    pendentes: resultados.filter(r => r.situacao === 'pendente').length,
    media: resultados.length ? (resultados.reduce((s, r) => s + Number(r.media_final || 0), 0) / resultados.length).toFixed(1) : '—',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Resultados Finais" subtitle="Aprovação, reprovação e encaminhamento para exame"
        action={
          <button onClick={handleCalcular} disabled={calculando || !filtroTurma || !filtroPeriodo}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${calculando ? 'animate-spin' : ''}`}>{calculando ? 'progress_activity' : 'calculate'}</span>
            {calculando ? 'A calcular...' : 'Calcular Resultados'}
          </button>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Seleccionar turma</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Seleccionar período</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as situações</option>
          <option value="aprovado">Aprovado</option>
          <option value="reprovado">Reprovado</option>
          <option value="exame">Exame</option>
          <option value="recurso">Recurso</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {!filtroTurma && !filtroPeriodo ? (
        <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">emoji_events</span>
          <p className="text-sm text-on-surface-variant">Seleccione uma turma e período para ver os resultados.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : (
        <>
          {resultados.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Total', value: stats.total, cls: 'bg-surface-container-low text-on-surface' },
                { label: 'Aprovados', value: stats.aprovados, cls: 'bg-green-50 text-green-700' },
                { label: 'Reprovados', value: stats.reprovados, cls: 'bg-red-50 text-red-600' },
                { label: 'Exame', value: stats.exame, cls: 'bg-amber-50 text-amber-700' },
                { label: 'Média', value: stats.media, cls: 'bg-primary/8 text-primary' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border border-outline-variant p-3 text-center ${s.cls}`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {resultados.length === 0 ? (
            <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">calculate</span>
              <p className="text-sm text-on-surface-variant mb-3">Nenhum resultado calculado para estes filtros.</p>
              <button onClick={handleCalcular} disabled={calculando}
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60">
                <span className="material-symbols-outlined text-[16px]">calculate</span>Calcular Agora
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Média</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Frequência</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {resultados.map(r => (
                    <tr key={r.id} className="hover:bg-surface-container-low/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-on-surface">{r.aluno_nome}</p>
                        <p className="text-xs text-on-surface-variant font-mono">{r.numero_matricula}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{r.turma_nome}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-base ${r.media_final >= 14 ? 'text-green-600' : r.media_final >= 10 ? 'text-blue-600' : 'text-red-500'}`}>
                          {r.media_final ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">{r.frequencia_pct != null ? `${r.frequencia_pct}%` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${SITUACAO_CLS[r.situacao] || 'bg-gray-100 text-gray-600'}`}>
                          {r.situacao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
