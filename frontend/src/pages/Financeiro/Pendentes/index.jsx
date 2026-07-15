import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

const TABS = [
  { id: 'pendente', label: 'Pendentes', icon: 'schedule', cor: 'text-amber-600' },
  { id: 'em_analise', label: 'Em Análise', icon: 'manage_search', cor: 'text-blue-600' },
]

export default function Pendentes() {
  const [tab, setTab] = useState('pendente')
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejeicaoId, setRejeicaoId] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [processing, setProcessing] = useState(null)

  const load = () => {
    setLoading(true)
    api.get(`/financeiro/pagamentos?estado=${tab}`)
      .then(r => setPagamentos(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [tab])

  const analisar = async (id) => {
    setProcessing(id)
    try { await api.patch(`/financeiro/pagamentos/${id}/analisar`, {}); load() }
    catch (err) { alert(err.message) } finally { setProcessing(null) }
  }

  const confirmar = async (id) => {
    if (!window.confirm('Confirmar este pagamento? Será gerado um recibo automaticamente.')) return
    setProcessing(id)
    try { await api.patch(`/financeiro/pagamentos/${id}/confirmar`, {}); load() }
    catch (err) { alert(err.message) } finally { setProcessing(null) }
  }

  const rejeitar = async (id) => {
    setProcessing(id)
    try {
      await api.patch(`/financeiro/pagamentos/${id}/rejeitar`, { motivo })
      setRejeicaoId(null); setMotivo(''); load()
    } catch (err) { alert(err.message) } finally { setProcessing(null) }
  }

  const total = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Validação de Pagamentos" subtitle="Analisar, confirmar ou rejeitar pagamentos registados" />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className={`material-symbols-outlined text-[18px] ${tab === t.id ? t.cor : ''}`}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {!loading && pagamentos.length > 0 && (
        <div className={`rounded-xl p-4 mb-5 flex items-center justify-between border ${tab === 'pendente' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-2xl ${tab === 'pendente' ? 'text-amber-600' : 'text-blue-600'}`}>{tab === 'pendente' ? 'pending_actions' : 'manage_search'}</span>
            <div>
              <p className={`font-bold ${tab === 'pendente' ? 'text-amber-800' : 'text-blue-800'}`}>{pagamentos.length} pagamento(s) {tab === 'pendente' ? 'pendentes' : 'em análise'}</p>
              <p className={`text-sm ${tab === 'pendente' ? 'text-amber-700' : 'text-blue-700'}`}>Total: <strong>{fmt(total)}</strong></p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : pagamentos.length === 0 ? (
        <EmptyState icon="check_circle" title={tab === 'pendente' ? 'Sem pendentes' : 'Sem pagamentos em análise'}
          description={tab === 'pendente' ? 'Todos os pagamentos foram processados.' : 'Nenhum pagamento aguarda confirmação.'} action={null} />
      ) : (
        <div className="space-y-3">
          {pagamentos.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tab === 'pendente' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${tab === 'pendente' ? 'text-amber-600' : 'text-blue-600'}`}>payments</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{p.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant font-mono">{p.numero_matricula}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-on-surface-variant">
                      <span>{p.taxa_nome || 'Pagamento avulso'}</span>
                      {p.mes_referencia && <span>Ref: {p.mes_referencia}</span>}
                      <span>{p.metodo}</span>
                      {p.referencia && <span>Comp: {p.referencia}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-lg text-primary">{fmt(p.valor)}</p>
                {tab === 'pendente' ? (
                  <div className="flex gap-2">
                    <button onClick={() => analisar(p.id)} disabled={processing === p.id}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-blue-700 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">manage_search</span>
                      Analisar
                    </button>
                    <button onClick={() => setRejeicaoId(p.id)} disabled={processing === p.id}
                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-red-100 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Rejeitar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => confirmar(p.id)} disabled={processing === p.id}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-green-700 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {processing === p.id ? 'A confirmar...' : 'Confirmar'}
                    </button>
                    <button onClick={() => setRejeicaoId(p.id)} disabled={processing === p.id}
                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-red-100 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal rejeitar */}
      {rejeicaoId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-3 text-red-600">Rejeitar Pagamento</h3>
            <p className="text-sm text-on-surface-variant mb-4">Indique o motivo da rejeição. O aluno será notificado.</p>
            <textarea className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary resize-none" rows={3}
              placeholder="Motivo da rejeição..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRejeicaoId(null); setMotivo('') }} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={() => rejeitar(rejeicaoId)} disabled={processing === rejeicaoId}
                className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                {processing === rejeicaoId ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
