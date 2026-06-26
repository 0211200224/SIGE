import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function SemDados({ msg = 'Sem dados financeiros disponíveis' }) {
  return (
    <div className="py-10 text-center text-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">payments</span>
      {msg}
    </div>
  )
}

function KpiBox({ label, value, color = 'text-on-surface', bg = 'bg-surface-variant' }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-on-surface-variant mt-0.5">{label}</p>
    </div>
  )
}

export default function RelatorioFinanceiros() {
  const [mensal, setMensal] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/relatorios/financeiro').then(r => r.data?.data || r.data || []).catch(() => []),
      api.get('/diretor/dashboard').then(r => r.data?.financeiros).catch(() => null),
    ]).then(([m, r]) => { setMensal(m); setResumo(r) }).finally(() => setLoading(false))
  }, [])

  const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })

  const totalRecebido = mensal?.reduce((s, r) => s + parseFloat(r.recebido || 0), 0) || 0
  const totalPendente = mensal?.reduce((s, r) => s + parseFloat(r.pendente || 0), 0) || 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Relatório Financeiro" subtitle="Receitas, pagamentos e análise financeira" />

      <div className="flex justify-end mb-5">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[16px]">print</span>
          Imprimir / PDF
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-on-surface-variant">A carregar dados financeiros...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiBox label="Total Arrecadado (MT)" value={`${fmt(totalRecebido)} MT`} color="text-green-700" bg="bg-green-50" />
            <KpiBox label="Total Pendente (MT)" value={`${fmt(totalPendente)} MT`} color="text-yellow-700" bg="bg-yellow-50" />
            <KpiBox label="Alunos Inadimplentes" value={resumo?.inadimplentes ?? '—'} color="text-red-700" bg="bg-red-50" />
            <KpiBox label="Dívidas Registadas" value={resumo?.dividas ?? '—'} color="text-orange-700" bg="bg-orange-50" />
          </div>

          {/* Tabela mensal */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-600 text-[20px]">trending_up</span>
              <h3 className="font-semibold text-sm text-on-surface">Receita Mensal</h3>
            </div>
            {!mensal?.length ? <SemDados /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-variant text-on-surface-variant">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Mês</th>
                      <th className="text-right px-4 py-3 font-medium">Recebido (MT)</th>
                      <th className="text-right px-4 py-3 font-medium">Pendente (MT)</th>
                      <th className="text-center px-4 py-3 font-medium">Taxa de Arrecadação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {mensal.map((row, i) => {
                      const rec = parseFloat(row.recebido || 0)
                      const pend = parseFloat(row.pendente || 0)
                      const total = rec + pend
                      const taxa = total > 0 ? Math.round(rec * 100 / total) : 0
                      const [cor, bg] = taxa >= 80 ? ['text-green-700','bg-green-100'] : taxa >= 50 ? ['text-yellow-700','bg-yellow-100'] : ['text-red-700','bg-red-100']
                      return (
                        <tr key={i} className="hover:bg-surface-variant/20">
                          <td className="px-4 py-3 font-medium text-on-surface">{row.mes}</td>
                          <td className="px-4 py-3 text-right text-green-700 font-semibold">{fmt(rec)} MT</td>
                          <td className="px-4 py-3 text-right text-yellow-700">{fmt(pend)} MT</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${bg} ${cor}`}>{taxa}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-outline-variant bg-surface-variant/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-on-surface">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(totalRecebido)} MT</td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-700">{fmt(totalPendente)} MT</td>
                      <td className="px-4 py-3 text-center font-bold text-on-surface">
                        {totalRecebido + totalPendente > 0
                          ? `${Math.round(totalRecebido * 100 / (totalRecebido + totalPendente))}%`
                          : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
