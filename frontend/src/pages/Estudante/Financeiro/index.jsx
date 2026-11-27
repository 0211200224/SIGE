import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import { useOrdenacao } from '../../../hooks/useOrdenacao'
import { SelectOrdenacao, OPCOES_ORDEM_PAGAMENTOS } from '../../../components/ui/Ordenacao'

const fmtMZN = (v) => `${Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`
const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-MZ') : '')

// Portal do aluno/encarregado: so o que lhe cabe acompanhar -- dividas,
// cobrancas pendentes e recibos. Totais acumulados e historico completo de
// pagamentos ficam no Financeiro.
export default function EstudanteFinanceiro() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/estudante/financeiro')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Recibos: por omissão data do pagamento, mais recente primeiro (antes do return antecipado)
  const ordRecibos = useOrdenacao(data?.recibos || [], {
    data: { valor: r => r.data_pagamento || r.aprovado_em || r.criado_em, tipo: 'data' },
    valor: { valor: r => r.valor, tipo: 'numero' },
    mes: { valor: r => r.mes_referencia, tipo: 'data' },
    tipo: { valor: r => r.taxa_nome },
  }, { chave: 'data', direcao: 'desc' })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  const { cobrancasPendentes = [], recibos = [], totalDivida = 0, totalEmAtraso = 0 } = data || {}
  const emAtraso = cobrancasPendentes.filter(c => c.status === 'vencido').length

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader title="Situação Financeira" subtitle="Dívidas, cobranças pendentes e recibos" />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`border rounded-xl p-4 min-w-0 ${totalDivida > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${totalDivida > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
            {totalDivida > 0 ? 'account_balance_wallet' : 'check_circle'}
          </span>
          <p className={`text-xl font-bold break-words ${totalDivida > 0 ? 'text-yellow-700' : 'text-green-700'}`}>{fmtMZN(totalDivida)}</p>
          <p className={`text-xs ${totalDivida > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {totalDivida > 0 ? `Por pagar (${cobrancasPendentes.length} cobrança${cobrancasPendentes.length !== 1 ? 's' : ''})` : 'Sem dívidas'}
          </p>
        </div>
        <div className={`border rounded-xl p-4 min-w-0 ${totalEmAtraso > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${totalEmAtraso > 0 ? 'text-red-500' : 'text-gray-400'}`}>event_busy</span>
          <p className={`text-xl font-bold break-words ${totalEmAtraso > 0 ? 'text-red-700' : 'text-gray-600'}`}>{fmtMZN(totalEmAtraso)}</p>
          <p className={`text-xs ${totalEmAtraso > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            Em atraso{emAtraso > 0 ? ` (${emAtraso} cobrança${emAtraso !== 1 ? 's' : ''})` : ''}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 min-w-0">
          <span className="material-symbols-outlined text-blue-500 text-2xl mb-2">receipt_long</span>
          <p className="text-2xl font-bold text-blue-700">{recibos.length}</p>
          <p className="text-xs text-blue-600">Recibos disponíveis</p>
        </div>
      </div>

      {/* Cobranças pendentes */}
      <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface uppercase tracking-wide mb-3">
        <span className="material-symbols-outlined text-[18px] text-yellow-500">pending_actions</span>
        Cobranças Pendentes
      </h2>
      {cobrancasPendentes.length === 0 ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">check_circle</span>
          <p className="text-sm text-green-700">Não há cobranças pendentes. Está tudo em dia.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {cobrancasPendentes.map(c => {
            const atrasada = c.status === 'vencido'
            const parcial = c.status === 'parcial'
            const restante = Number(c.valor) - Number(c.valor_pago || 0)
            return (
              <div key={c.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-xl px-4 py-3 border shadow-sm ${atrasada ? 'border-red-200' : 'border-outline-variant'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-on-surface">{c.taxa_nome}</p>
                    {atrasada && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                        {Number(c.dias_atraso) > 0 ? `${c.dias_atraso} dia${Number(c.dias_atraso) !== 1 ? 's' : ''} em atraso` : 'Em atraso'}
                      </span>
                    )}
                    {parcial && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Pago parcialmente</span>
                    )}
                  </div>
                  {c.mes_referencia && <p className="text-xs text-on-surface-variant">Referência: {c.mes_referencia}</p>}
                  {parcial && <p className="text-xs text-on-surface-variant">Já pago: {fmtMZN(c.valor_pago)} de {fmtMZN(c.valor)}</p>}
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${atrasada ? 'text-red-700' : 'text-yellow-700'}`}>{fmtMZN(restante)}</p>
                  {c.data_vencimento && <p className="text-xs text-on-surface-variant">Vence: {fmtData(c.data_vencimento)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recibos */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface uppercase tracking-wide">
          <span className="material-symbols-outlined text-[18px] text-green-500">receipt_long</span>
          Recibos
        </h2>
        {recibos.length > 1 && <SelectOrdenacao ord={ordRecibos} opcoes={OPCOES_ORDEM_PAGAMENTOS} />}
      </div>
      {recibos.length === 0 ? (
        <EmptyState icon="receipt_long" title="Sem recibos emitidos" description="Os recibos aparecem aqui quando os teus pagamentos forem confirmados." />
      ) : (
        <div className="space-y-3">
          {ordRecibos.ordenados.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-green-500 text-[18px]">receipt</span>
                    <p className="font-semibold text-on-surface truncate">{r.numero_recibo || `REC-${r.id}`}</p>
                  </div>
                  <p className="text-sm text-on-surface-variant">{r.taxa_nome || 'Pagamento'}</p>
                  {r.mes_referencia && <p className="text-xs text-on-surface-variant">Referência: {r.mes_referencia}</p>}
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-lg font-bold text-green-700">{fmtMZN(r.valor)}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{fmtData(r.data_pagamento || r.aprovado_em || r.criado_em)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant flex flex-wrap items-center justify-between gap-2">
                {r.metodo ? (
                  <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">credit_card</span>
                    Método: {r.metodo}
                  </p>
                ) : <span />}
                <Link to={`/estudante/recibos/${r.id}/imprimir`} target="_blank"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <span className="material-symbols-outlined text-[15px]">download</span>Ver / Baixar Recibo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
