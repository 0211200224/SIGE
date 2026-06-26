import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPOS = { '1_trimestre': '1º Trimestre', '2_trimestre': '2º Trimestre', '3_trimestre': '3º Trimestre', exame: 'Exame', recurso: 'Recurso' }
const STATUS_CLS = { aberto: 'bg-green-100 text-green-700', fechado: 'bg-gray-100 text-gray-500' }
const inp = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'

function ModalPeriodo({ inicial, onClose, onSaved }) {
  const [form, setForm] = useState(inicial?.id
    ? { nome: inicial.nome, ano_lectivo: inicial.ano_lectivo, tipo: inicial.tipo, data_inicio: inicial.data_inicio?.slice(0,10)||'', data_fim: inicial.data_fim?.slice(0,10)||'', nota_minima: inicial.nota_minima||10, frequencia_minima: inicial.frequencia_minima||75 }
    : { nome: '', ano_lectivo: String(new Date().getFullYear()), tipo: '1_trimestre', data_inicio: '', data_fim: '', nota_minima: 10, frequencia_minima: 75 }
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setSaving(true)
    try {
      if (inicial?.id) await api.put(`/pedagogico/periodos/${inicial.id}`, form)
      else await api.post('/pedagogico/periodos', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">{inicial?.id ? 'Editar Período' : 'Novo Período Lectivo'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome *</label>
            <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inp} placeholder="Ex: 1º Trimestre 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ano Lectivo *</label>
              <input required value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} className={inp} placeholder="2026" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo *</label>
              <select required value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
                {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Início</label>
              <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Fim</label>
              <input type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nota Mínima</label>
              <input type="number" step="0.1" min="0" max="20" value={form.nota_minima} onChange={e => set('nota_minima', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Freq. Mínima (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={form.frequencia_minima} onChange={e => set('frequencia_minima', e.target.value)} className={inp} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Periodos() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()))

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/pedagogico/periodos?ano_lectivo=${anoFiltro}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [anoFiltro])

  useEffect(() => { load() }, [load])

  const toggleStatus = async (p) => {
    const rota = p.status === 'aberto' ? 'fechar' : 'reabrir'
    const msg = p.status === 'aberto' ? `Fechar o período "${p.nome}"? Os dados ficarão bloqueados.` : `Reabrir o período "${p.nome}"?`
    if (!window.confirm(msg)) return
    try { await api.patch(`/pedagogico/periodos/${p.id}/${rota}`); load() }
    catch (err) { alert(err.message) }
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Períodos Lectivos" subtitle="Trimestres, exames e regras de avaliação"
        action={
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>Novo Período
          </button>
        }
      />

      {modal !== null && <ModalPeriodo inicial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}

      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ano:</label>
        <select value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          {anos.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="date_range" title="Nenhum período criado" description="Crie o primeiro período lectivo para o ano seleccionado."
          action={<button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold"><span className="material-symbols-outlined text-[16px]">add</span>Novo Período</button>} />
      ) : (
        <div className="space-y-3">
          {lista.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">date_range</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-on-surface">{p.nome}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_CLS[p.status]}`}>{p.status}</span>
                  <span className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">{TIPOS[p.tipo]}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-on-surface-variant flex-wrap">
                  <span>{fmtData(p.data_inicio)} → {fmtData(p.data_fim)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">grade</span>Nota mín.: {p.nota_minima}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">how_to_reg</span>Freq. mín.: {p.frequencia_minima}%</span>
                </div>
              </div>
              <div className="flex gap-2">
                {p.status === 'aberto' && (
                  <button onClick={() => setModal(p)} className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg" title="Editar">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                )}
                <button onClick={() => toggleStatus(p)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    p.status === 'aberto' ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-green-300 text-green-700 hover:bg-green-50'
                  }`}>
                  <span className="material-symbols-outlined text-[15px]">{p.status === 'aberto' ? 'lock' : 'lock_open'}</span>
                  {p.status === 'aberto' ? 'Fechar' : 'Reabrir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
