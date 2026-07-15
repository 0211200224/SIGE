import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

const CAT_LABEL = { academico: 'Académico', servicos: 'Serviços', administrativo: 'Administrativo', outro: 'Outro', null: 'Sem categoria' }
const CAT_CLS = { academico: 'bg-blue-100 text-blue-700', servicos: 'bg-teal-100 text-teal-700', administrativo: 'bg-orange-100 text-orange-700', outro: 'bg-gray-100 text-gray-700' }

const RELATORIOS = [
  {
    grupo: 'Geral',
    items: [
      { tipo: 'resumo_anual', label: 'Resumo Anual', icon: 'summarize', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { tipo: 'receita_mensal', label: 'Receita Mensal', icon: 'bar_chart', color: 'bg-green-50 text-green-700 border-green-200', filtroMes: true },
      { tipo: 'pagantes_mes', label: 'Pagantes por Mês', icon: 'how_to_reg', color: 'bg-teal-50 text-teal-700 border-teal-200', filtroMes: true },
    ],
  },
  {
    grupo: 'Por Tipo de Cobrança',
    items: [
      { tipo: 'receita_por_categoria', label: 'Receita por Categoria', icon: 'category', color: 'bg-purple-50 text-purple-700 border-purple-200', filtroMes: true },
      { tipo: 'receita_por_tipo', label: 'Receita por Tipo', icon: 'receipt_long', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', filtroMes: true },
      { tipo: 'pendentes_por_categoria', label: 'Pendentes por Categoria', icon: 'pending_actions', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ],
  },
  {
    grupo: 'Dívidas',
    items: [
      { tipo: 'inadimplentes', label: 'Inadimplentes', icon: 'money_off', color: 'bg-red-50 text-red-700 border-red-200' },
      { tipo: 'dividas_por_classe', label: 'Dívidas por Classe', icon: 'class', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    ],
  },
]

const ALL_ITEMS = RELATORIOS.flatMap(g => g.items)

export default function RelatoriosFinanceiro() {
  const [activo, setActivo] = useState('resumo_anual')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')

  const relActivo = ALL_ITEMS.find(r => r.tipo === activo)

  const carregar = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroMes) p.set('mes_referencia', filtroMes)
    api.get(`/financeiro/relatorios/${activo}?${p}`)
      .then(r => setDados(Array.isArray(r) ? r : []))
      .catch(() => setDados([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { carregar() }, [activo, filtroMes])

  const renderTabela = () => {
    if (loading) return (
      <div className="flex justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    )
    if (!dados.length) return (
      <div className="text-center py-10 text-sm text-on-surface-variant">Sem dados para apresentar.</div>
    )

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

    if (activo === 'receita_por_categoria') return (
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {dados.map((r, i) => (
            <div key={i} className={`rounded-xl p-4 border ${CAT_CLS[r.categoria] || 'bg-gray-100 text-gray-700'}`}>
              <p className="text-xs font-semibold uppercase opacity-70 mb-1">{CAT_LABEL[r.categoria] || r.categoria || 'Sem categoria'}</p>
              <p className="text-xl font-bold">{fmt(r.total_recebido)}</p>
              <p className="text-xs mt-1 opacity-80">{r.num_pagamentos} pagamento(s)</p>
            </div>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Categoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Nº Pagamentos</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Recebido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {dados.map((r, i) => (
              <tr key={i} className="hover:bg-surface-container-low/40">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_CLS[r.categoria] || 'bg-gray-100 text-gray-700'}`}>
                    {CAT_LABEL[r.categoria] || r.categoria || 'Sem categoria'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_pagamentos}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600 text-base">{fmt(r.total_recebido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

    if (activo === 'receita_por_tipo') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Tipo de Cobrança</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Categoria</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Nº Pagamentos</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Recebido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.tipo_cobranca}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_CLS[r.categoria] || 'bg-gray-100 text-gray-700'}`}>
                  {CAT_LABEL[r.categoria] || r.categoria || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_pagamentos}</td>
              <td className="px-4 py-3 text-right font-bold text-green-600 text-base">{fmt(r.total_recebido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'pendentes_por_categoria') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Categoria</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Cobranças</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Alunos</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Pendente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_CLS[r.categoria] || 'bg-gray-100 text-gray-700'}`}>
                  {CAT_LABEL[r.categoria] || r.categoria || 'Sem categoria'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_cobrancas}</td>
              <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_alunos}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-600 text-base">{fmt(r.total_pendente)}</td>
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
      <PageHeader title="Relatórios Financeiros" subtitle="Análise de receitas por tipo de cobrança, dívidas e pagamentos" />

      {/* Grupos de relatórios */}
      <div className="space-y-4 mb-6">
        {RELATORIOS.map(grupo => (
          <div key={grupo.grupo}>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">{grupo.grupo}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {grupo.items.map(r => (
                <button key={r.tipo} onClick={() => setActivo(r.tipo)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${activo === r.tipo ? r.color + ' border-current' : 'bg-white border-outline-variant hover:bg-surface-bright text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-[20px]">{r.icon}</span>
                  <span className="text-left leading-tight text-xs">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {relActivo?.filtroMes && (
        <div className="flex gap-3 mb-4">
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
          {filtroMes && (
            <button onClick={() => setFiltroMes('')}
              className="px-3 py-1.5 text-sm border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container">
              Todos os períodos
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-semibold text-on-surface">{relActivo?.label}</h2>
          {activo !== 'resumo_anual' && activo !== 'receita_por_categoria' && (
            <span className="text-xs text-on-surface-variant">{dados.length} resultado(s)</span>
          )}
        </div>
        {renderTabela()}
      </div>
    </div>
  )
}
