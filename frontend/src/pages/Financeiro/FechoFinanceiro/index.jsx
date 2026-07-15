import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

export default function FechoFinanceiro() {
  const [fechos, setFechos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ mes_referencia: '', observacoes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get("/financeiro/fechos").then(r => setFechos(Array.isArray(r) ? r : [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleFecho = async () => {
    if (!form.mes_referencia) { alert('Seleccione o mês de referência'); return }
    if (!window.confirm(`Confirma o fecho financeiro do mês ${form.mes_referencia}? Esta acção não pode ser desfeita.`)) return
    setSaving(true)
    try {
      await api.post('/financeiro/fechos', form)
      setModal(false)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Fecho Financeiro" subtitle="Fechar períodos financeiros mensais e consolidar dados"
        action={
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Fechar Mês
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-sm text-amber-800">
        <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">warning</span>
        <div>
          <p className="font-semibold">Atenção antes de fechar</p>
          <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
            <li>Confirme que todos os pagamentos pendentes foram analisados</li>
            <li>Verifique que as cobranças do mês foram registadas</li>
            <li>O fecho consolida os totais e não pode ser desfeito</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : fechos.length === 0 ? (
        <EmptyState icon="lock_clock" title="Nenhum fecho registado" description="Os fechos financeiros mensais aparecerão aqui após serem realizados."
          action={<button onClick={() => setModal(true)} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium">Fechar Mês</button>} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Cobrado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Recebido</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Dívida</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Devedores</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Fechado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {fechos.map(f => (
                <tr key={f.id} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3">
                    <span className="font-semibold font-mono">{f.mes_referencia}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{fmt(f.total_cobrado)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(f.total_recebido)}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{fmt(f.total_divida)}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{f.num_devedores}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(f.fechado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal fecho */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold">Fechar Mês Financeiro</h2>
              <button onClick={() => setModal(false)} className="p-1.5 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Mês de Referência *</label>
                <input type="month" className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white"
                  value={form.mes_referencia} onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Observações</label>
                <textarea className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white resize-none" rows={3}
                  value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleFecho} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-60">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                {saving ? 'A fechar...' : 'Fechar Mês'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
