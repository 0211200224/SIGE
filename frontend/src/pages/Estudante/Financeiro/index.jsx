import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmtMZN = (v) => `${Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`

const estadoBadge = (estado) => {
  if (estado === 'aprovado') return 'bg-green-100 text-green-700'
  if (estado === 'rejeitado') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

const estadoLabel = { aprovado: 'Aprovado', pendente: 'Pendente', rejeitado: 'Rejeitado' }

export default function EstudanteFinanceiro() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pagamentos')

  useEffect(() => {
    api.get('/estudante/financeiro')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  const { pagamentos = [], cobrancasPendentes = [], totalPago = 0, totalPendente = 0 } = data || {}
  const recibos = pagamentos.filter(p => p.estado === 'aprovado')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Situação Financeira" subtitle="Pagamentos, cobranças pendentes e recibos" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-green-500 text-2xl mb-2">check_circle</span>
          <p className="text-xl font-bold text-green-700">{fmtMZN(totalPago)}</p>
          <p className="text-xs text-green-600">Total Pago (confirmado)</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalPendente > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${totalPendente > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>payments</span>
          <p className={`text-xl font-bold ${totalPendente > 0 ? 'text-yellow-700' : 'text-gray-600'}`}>{fmtMZN(totalPendente)}</p>
          <p className={`text-xs ${totalPendente > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>Valor Pendente ({cobrancasPendentes.length} cobr.)</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-blue-500 text-2xl mb-2">receipt_long</span>
          <p className="text-2xl font-bold text-blue-700">{recibos.length}</p>
          <p className="text-xs text-blue-600">Recibos Emitidos</p>
        </div>
      </div>

      {/* Alerta pendentes */}
      {cobrancasPendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-yellow-500">warning</span>
            <h3 className="text-sm font-semibold text-yellow-800">Cobranças Pendentes</h3>
          </div>
          <div className="space-y-2">
            {cobrancasPendentes.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-on-surface">{c.taxa_nome}</p>
                  {c.mes_referencia && <p className="text-xs text-on-surface-variant">Ref: {c.mes_referencia}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-yellow-700">{fmtMZN(c.valor)}</p>
                  {c.data_vencimento && (
                    <p className="text-xs text-on-surface-variant">
                      Vence: {new Date(c.data_vencimento).toLocaleDateString('pt-MZ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-outline-variant">
        {[
          { key: 'pagamentos', label: 'Pagamentos', count: pagamentos.length },
          { key: 'recibos', label: 'Recibos', count: recibos.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pagamentos */}
      {tab === 'pagamentos' && (
        pagamentos.length === 0 ? (
          <EmptyState icon="payments" title="Sem pagamentos registados" description="Ainda não existem pagamentos associados à tua conta." />
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Taxa / Serviço</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Referência</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-on-surface-variant">Valor</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-on-surface-variant">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p, i) => (
                    <tr key={p.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{p.taxa_nome || 'Pagamento'}</p>
                        {p.mes_referencia && <p className="text-xs text-on-surface-variant">Ref: {p.mes_referencia}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{p.referencia || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface">{fmtMZN(p.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${estadoBadge(p.estado)}`}>
                          {estadoLabel[p.estado] || p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {new Date(p.criado_em).toLocaleDateString('pt-MZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Recibos */}
      {tab === 'recibos' && (
        recibos.length === 0 ? (
          <EmptyState icon="receipt_long" title="Sem recibos emitidos" description="Os recibos aparecem aqui quando os teus pagamentos forem confirmados." />
        ) : (
          <div className="space-y-3">
            {recibos.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-green-500 text-[18px]">receipt</span>
                      <p className="font-semibold text-on-surface">{r.numero_recibo || `REC-${r.id}`}</p>
                    </div>
                    <p className="text-sm text-on-surface-variant">{r.taxa_nome || 'Pagamento'}</p>
                    {r.mes_referencia && <p className="text-xs text-on-surface-variant">Referência: {r.mes_referencia}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700">{fmtMZN(r.valor)}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {r.aprovado_em ? new Date(r.aprovado_em).toLocaleDateString('pt-MZ') : new Date(r.criado_em).toLocaleDateString('pt-MZ')}
                    </p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Confirmado</span>
                  </div>
                </div>
                {r.metodo && (
                  <div className="mt-3 pt-3 border-t border-outline-variant flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">credit_card</span>
                    Método: {r.metodo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
