import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

const RELATORIOS = [
  { tipo: 'resumo_anual', label: 'Resumo Anual', icon: 'summarize', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { tipo: 'receita_mensal', label: 'Receita Mensal', icon: 'bar_chart', color: 'bg-green-50 text-green-700 border-green-200' },
  { tipo: 'pagantes_mes', label: 'Pagantes por Mês', icon: 'how_to_reg', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { tipo: 'inadimplentes', label: 'Inadimplentes', icon: 'money_off', color: 'bg-red-50 text-red-700 border-red-200' },
  { tipo: 'dividas_por_classe', label: 'Dívidas por Classe', icon: 'class', color: 'bg-orange-50 text-orange-700 border-orange-200' },
]

export default function RelatoriosFinanceiro() {
  const [activo, setActivo] = useState('resumo_anual')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')

  const carregar = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroMes) p.set('mes_referencia', filtroMes)
    api.get(`/financeiro/relatorios/${activo}?${p}`)
      .then(r => setDados(r.data || []))
      .catch(() => setDados([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { carregar() }, [activo, filtroMes])

  const renderTabela = () => {
    if (loading) return <div className="flex justify-center py-12"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
    if (!dados.length) return <div className="text-center py-10 text-sm text-on-surface-variant">Sem dados para apresentar.</div>

    if (activo === 'resumo_anual') {
      const d = dados[0] || {}
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5">
          {[
            { label: 'Total Recebido', value: fmt(d.total_recebido), cls: 'text-green-700 bg-green-50' },
            { label: 'Pagamentos Confirmados', value: d.pagamentos_confirmados || 0, cls: 'text-blue-700 bg-blue-50' },
            { label: 'Pagamentos Pendentes', value: d.pagamentos_pendentes || 0, cls: 'text-amber-700 bg-amber-50' },
            { label: 'Pagamentos Rejeitados', value: d.pagamentos_rejeitados || 0, cls: 'text-red-700 bg-red-50' },
            { label: 'Alunos Pagantes', value: d.alunos_pagantes || 0, cls: 'text-teal-700 bg-teal-50' },
            { label: 'Total em Dívida', value: fmt(d.total_divida), cls: 'text-red-700 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 text-center ${s.cls}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )
    }

    if (activo === 'receita_mensal') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Receita Confirmada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-mono font-semibold">{r.mes_referencia || '—'}</td>
              <td className="px-4 py-3 text-right font-bold text-green-600 text-base">{fmt(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'pagantes_mes') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Pagamentos</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Pago</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3">
                <p className="font-semibold">{r.aluno}</p>
                <p className="text-xs text-on-surface-variant font-mono">{r.numero_matricula}</p>
              </td>
              <td className="px-4 py-3 text-xs text-on-surface-variant">{r.turma || '—'}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_pagamentos}</td>
              <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(r.total_pago)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'inadimplentes') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Classe</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Meses Dívida</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Dívida</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3">
                <p className="font-semibold">{r.aluno}</p>
                <p className="text-xs text-on-surface-variant font-mono">{r.numero_matricula}</p>
              </td>
              <td className="px-4 py-3 text-xs text-on-surface-variant">
                <p>{r.turma || '—'}</p>
                <p>{r.classe || ''}</p>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">{r.meses_divida}</span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-600 text-base">{fmt(r.total_divida)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'dividas_por_classe') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Classe</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Alunos em Dívida</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Dívida</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.classe || 'Sem classe'}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.alunos}</td>
              <td className="px-4 py-3 text-right font-bold text-red-600 text-base">{fmt(r.total_divida)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    return null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Relatórios Financeiros" subtitle="Análise de receitas, dívidas e pagamentos" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {RELATORIOS.map(r => (
          <button key={r.tipo} onClick={() => setActivo(r.tipo)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${activo === r.tipo ? r.color + ' border-current' : 'bg-white border-outline-variant hover:bg-surface-bright text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
            <span className="text-center leading-tight text-xs">{r.label}</span>
          </button>
        ))}
      </div>

      {(activo === 'pagantes_mes' || activo === 'receita_mensal') && (
        <div className="flex gap-3 mb-4">
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
          {filtroMes && <button onClick={() => setFiltroMes('')} className="px-3 py-1.5 text-sm border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container">Todos</button>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-semibold text-on-surface">{RELATORIOS.find(r => r.tipo === activo)?.label}</h2>
          {activo !== 'resumo_anual' && <span className="text-xs text-on-surface-variant">{dados.length} resultado(s)</span>}
        </div>
        {renderTabela()}
      </div>
    </div>
  )
}
