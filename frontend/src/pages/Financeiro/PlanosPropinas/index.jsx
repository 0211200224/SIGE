import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const PERIODICIDADES = ['mensal', 'trimestral', 'semestral', 'anual']
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const emptyForm = { nome: '', grade_level_id: '', curso: '', ano_lectivo: new Date().getFullYear().toString(), valor: '', periodicidade: 'mensal', meses_cobrados: 10, descricao: '' }

export default function PlanosPropinas() {
  const [planos, setPlanos] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [gerarModal, setGerarModal] = useState(null)
  const [gerarForm, setGerarForm] = useState({ mes_referencia: '', data_vencimento: '' })
  const [gerando, setGerando] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/financeiro/planos'), api.get('/pedagogico/classes')])
      .then(([p, c]) => { setPlanos(p.data || []); setClasses(c.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSalvar = async () => {
    if (!form.nome || !form.valor || !form.ano_lectivo) { alert('Nome, valor e ano lectivo são obrigatórios'); return }
    setSaving(true)
    try {
      if (modal?.id) await api.put(`/financeiro/planos/${modal.id}`, form)
      else await api.post('/financeiro/planos', form)
      setModal(null)
      load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const handleGerar = async () => {
    if (!gerarForm.mes_referencia) { alert('Mês de referência é obrigatório'); return }
    setGerando(true)
    try {
      const r = await api.post('/financeiro/planos/gerar-cobrancas', { plano_id: gerarModal.id, ...gerarForm })
      alert(`Cobranças geradas: ${r.data.criados} (${r.data.ignorados || 0} já existiam)`)
      setGerarModal(null)
    } catch (err) { alert(err.message) } finally { setGerando(false) }
  }

  const openModal = (p = null) => {
    if (p) setForm({ nome: p.nome, grade_level_id: p.grade_level_id || '', curso: p.curso || '', ano_lectivo: p.ano_lectivo, valor: p.valor, periodicidade: p.periodicidade, meses_cobrados: p.meses_cobrados, descricao: p.descricao || '' })
    else setForm(emptyForm)
    setModal(p || {})
  }

  const PERIODO_COR = { mensal: 'bg-blue-100 text-blue-700', trimestral: 'bg-green-100 text-green-700', semestral: 'bg-purple-100 text-purple-700', anual: 'bg-amber-100 text-amber-700' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Planos de Propinas" subtitle="Definir valores de propina por classe e ano lectivo"
        action={<button onClick={() => openModal()} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all"><span className="material-symbols-outlined text-[18px]">add</span>Novo Plano</button>} />

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : planos.length === 0 ? (
        <EmptyState icon="receipt_long" title="Nenhum plano definido" description="Crie planos de propinas para as classes e anos lectivos." action={<button onClick={() => openModal()} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium">Criar Plano</button>} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Ano</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Periodicidade</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {planos.map(p => (
                <tr key={p.id} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-semibold">{p.nome}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{p.classe_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.ano_lectivo}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{fmt(p.valor)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PERIODO_COR[p.periodicidade] || 'bg-gray-100 text-gray-600'}`}>{p.periodicidade}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setGerarModal(p); setGerarForm({ mes_referencia: '', data_vencimento: '' }) }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Gerar cobranças">
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </button>
                      <button onClick={() => openModal(p)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold">{modal.id ? 'Editar Plano' : 'Novo Plano de Propinas'}</h2>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome do Plano *</label><input className={inputCls} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Propina 10ª Classe 2025" /></div>
                <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Classe</label>
                  <select className={inputCls} value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)}>
                    <option value="">Todas as classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo *</label><input className={inputCls} value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} placeholder="2025" /></div>
                <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor (MT) *</label><input type="number" className={inputCls} value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0.00" /></div>
                <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Periodicidade</label>
                  <select className={inputCls} value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>
                    {PERIODICIDADES.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Meses Cobrados</label><input type="number" className={inputCls} value={form.meses_cobrados} onChange={e => set('meses_cobrados', parseInt(e.target.value))} min="1" max="12" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Descrição</label><textarea className={inputCls + ' resize-none'} rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleSalvar} disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-60">
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gerar cobranças */}
      {gerarModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold">Gerar Cobranças</h2>
              <button onClick={() => setGerarModal(null)} className="p-1.5 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                <strong>{gerarModal.nome}</strong> — {fmt(gerarModal.valor)} / {gerarModal.periodicidade}
              </div>
              <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Mês de Referência *</label>
                <input type="month" className={inputCls} value={gerarForm.mes_referencia} onChange={e => setGerarForm(f => ({ ...f, mes_referencia: e.target.value }))} />
              </div>
              <div><label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data de Vencimento</label>
                <input type="date" className={inputCls} value={gerarForm.data_vencimento} onChange={e => setGerarForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setGerarModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleGerar} disabled={gerando} className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-60">
                {gerando ? 'A gerar...' : 'Gerar Cobranças'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
