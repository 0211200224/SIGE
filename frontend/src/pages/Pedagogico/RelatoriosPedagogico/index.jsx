import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const RELATORIOS = [
  { tipo: 'desempenho_turma', label: 'Desempenho por Turma', icon: 'class', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { tipo: 'desempenho_disciplina', label: 'Desempenho por Disciplina', icon: 'menu_book', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { tipo: 'frequencia_geral', label: 'Frequência Geral', icon: 'how_to_reg', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { tipo: 'taxa_aprovacao', label: 'Taxa de Aprovação', icon: 'emoji_events', color: 'bg-green-50 text-green-700 border-green-200' },
]

export default function RelatoriosPedagogico() {
  const [activo, setActivo] = useState('desempenho_turma')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [turmas, setTurmas] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')

  useEffect(() => {
    Promise.all([api.get('/pedagogico/turmas'), api.get('/pedagogico/periodos')])
      .then(([t, p]) => { setTurmas(t.data || []); setPeriodos(p.data || []) }).catch(() => {})
  }, [])

  const carregar = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    if (filtroPeriodo) p.set('periodo_id', filtroPeriodo)
    api.get(`/pedagogico/relatorios/${activo}?${p}`)
      .then(r => setDados(r.data || []))
      .catch(() => setDados([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [activo, filtroTurma, filtroPeriodo])

  const renderTabela = () => {
    if (loading) return <div className="flex justify-center py-12"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
    if (!dados.length) return <div className="text-center py-10 text-sm text-on-surface-variant">Sem dados para apresentar.</div>

    if (activo === 'desempenho_turma') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Classe</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Alunos</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Média</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aprovados</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Reprovados</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Exame</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Taxa Aprov.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.turma}</td>
              <td className="px-4 py-3 text-xs text-on-surface-variant">{r.classe}</td>
              <td className="px-4 py-3 text-right">{r.total_alunos}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.media_geral}</td>
              <td className="px-4 py-3 text-right text-green-600 font-medium">{r.aprovados}</td>
              <td className="px-4 py-3 text-right text-red-500">{r.reprovados}</td>
              <td className="px-4 py-3 text-right text-amber-600">{r.exame}</td>
              <td className="px-4 py-3 text-right">
                <span className={`font-bold ${r.taxa_aprovacao >= 80 ? 'text-green-600' : r.taxa_aprovacao >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{r.taxa_aprovacao}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'desempenho_disciplina') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Disciplina</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Notas</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Média</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mín</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Máx</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">≥ 10</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-medium">{r.disciplina}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.total_notas}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.media}</td>
              <td className="px-4 py-3 text-right text-red-500">{r.nota_min}</td>
              <td className="px-4 py-3 text-right text-green-600">{r.nota_max}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.acima_media}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'frequencia_geral') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aulas</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Presenças</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase w-40">Taxa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className={`hover:bg-surface-container-low/40 ${r.taxa_presenca < 75 ? 'bg-red-50/40' : ''}`}>
              <td className="px-4 py-3 font-medium">{r.aluno}</td>
              <td className="px-4 py-3 text-xs text-on-surface-variant">{r.turma}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.total_aulas}</td>
              <td className="px-4 py-3 text-right text-green-600 font-medium">{r.presencas}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.taxa_presenca >= 75 ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${Math.min(r.taxa_presenca || 0, 100)}%` }} />
                  </div>
                  <span className={`text-xs font-semibold ${r.taxa_presenca >= 75 ? 'text-green-600' : 'text-red-600'}`}>{r.taxa_presenca}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'taxa_aprovacao') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Período</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aprovados</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Reprovados</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Exame</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Taxa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.periodo}</td>
              <td className="px-4 py-3 text-right">{r.total}</td>
              <td className="px-4 py-3 text-right text-green-600 font-medium">{r.aprovados}</td>
              <td className="px-4 py-3 text-right text-red-500">{r.reprovados}</td>
              <td className="px-4 py-3 text-right text-amber-600">{r.exame}</td>
              <td className="px-4 py-3 text-right">
                <span className={`font-bold text-base ${r.taxa >= 80 ? 'text-green-600' : r.taxa >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{r.taxa}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    return null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Relatórios Pedagógicos" subtitle="Análise de desempenho, frequência e resultados" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {RELATORIOS.map(r => (
          <button key={r.tipo} onClick={() => setActivo(r.tipo)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
              activo === r.tipo ? r.color + ' border-current' : 'bg-white border-outline-variant hover:bg-surface-bright text-on-surface-variant'
            }`}>
            <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
            <span className="text-center leading-tight">{r.label}</span>
          </button>
        ))}
      </div>

      {(activo === 'desempenho_turma' || activo === 'frequencia_geral') && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todos os períodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-semibold text-on-surface">{RELATORIOS.find(r => r.tipo === activo)?.label}</h2>
          <span className="text-xs text-on-surface-variant">{dados.length} resultado(s)</span>
        </div>
        {renderTabela()}
      </div>
    </div>
  )
}
