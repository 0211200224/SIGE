import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function SemDados({ msg = 'Sem dados de RH disponíveis' }) {
  return (
    <div className="py-10 text-center text-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">groups</span>
      {msg}
    </div>
  )
}

export default function RelatorioRH() {
  const [departamentos, setDepartamentos] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/relatorios/rh').then(r => r.data?.data || r.data || []).catch(() => []),
      api.get('/rh/stats').then(r => r.data?.data || r.data).catch(() => null),
    ]).then(([dep, st]) => { setDepartamentos(dep); setStats(st) }).finally(() => setLoading(false))
  }, [])

  const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })

  const totalFuncs = departamentos?.reduce((s, r) => s + parseInt(r.total || 0), 0) || 0
  const totalFolha = departamentos?.reduce((s, r) => s + parseFloat(r.folha_salarial || 0), 0) || 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Relatório de Recursos Humanos" subtitle="Funcionários por departamento, folha salarial e estatísticas" />

      <div className="flex justify-end mb-5">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[16px]">print</span>
          Imprimir / PDF
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-on-surface-variant">A carregar dados de RH...</div>
      ) : (
        <>
          {/* Resumo */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Funcionários', value: stats.total_funcionarios ?? totalFuncs, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Funcionários Activos', value: stats.activos ?? '—', color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Departamentos', value: departamentos?.length ?? 0, color: 'text-purple-700', bg: 'bg-purple-50' },
                { label: 'Folha Salarial (MT)', value: `${fmt(stats.folha_total || totalFolha)} MT`, color: 'text-orange-700', bg: 'bg-orange-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4`}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Por departamento */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-[20px]">corporate_fare</span>
              <h3 className="font-semibold text-sm text-on-surface">Funcionários por Departamento</h3>
            </div>
            {!departamentos?.length ? <SemDados /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-variant text-on-surface-variant">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Departamento</th>
                      <th className="text-center px-4 py-3 font-medium">Total</th>
                      <th className="text-right px-4 py-3 font-medium">Folha Salarial (MT)</th>
                      <th className="text-center px-4 py-3 font-medium">% do Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {departamentos.map((row, i) => {
                      const total = parseInt(row.total || 0)
                      const pct = totalFuncs > 0 ? Math.round(total * 100 / totalFuncs) : 0
                      return (
                        <tr key={i} className="hover:bg-surface-variant/20">
                          <td className="px-4 py-3 font-medium text-on-surface">{row.departamento || '—'}</td>
                          <td className="px-4 py-3 text-center font-bold text-on-surface">{total}</td>
                          <td className="px-4 py-3 text-right text-on-surface-variant">{fmt(row.folha_salarial)} MT</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-surface-variant rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-on-surface-variant">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-outline-variant bg-surface-variant/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-on-surface">Total</td>
                      <td className="px-4 py-3 text-center font-bold text-on-surface">{totalFuncs}</td>
                      <td className="px-4 py-3 text-right font-bold text-on-surface">{fmt(totalFolha)} MT</td>
                      <td className="px-4 py-3 text-center font-bold text-on-surface">100%</td>
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
