import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const STATUS_CLS = { rascunho: 'bg-yellow-100 text-yellow-700', finalizado: 'bg-green-100 text-green-700' }
const inp = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'

function ModalConselho({ turmas, periodos, inicial, onClose, onSaved }) {
  const [form, setForm] = useState(inicial?.id
    ? { class_group_id: inicial.class_group_id, periodo_id: inicial.periodo_id||'', data: inicial.data?.slice(0,10)||'', observacoes: inicial.observacoes||'', decisoes: inicial.decisoes||'', alunos_risco: inicial.alunos_risco||'', status: inicial.status }
    : { class_group_id: '', periodo_id: '', data: new Date().toISOString().slice(0,10), observacoes: '', decisoes: '', alunos_risco: '', status: 'rascunho' }
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setSaving(true)
    try {
      const payload = { ...form, periodo_id: form.periodo_id || null }
      if (inicial?.id) await api.put(`/pedagogico/conselhos/${inicial.id}`, payload)
      else await api.post('/pedagogico/conselhos', payload)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{inicial?.id ? 'Editar Conselho' : 'Novo Conselho de Classe'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Turma *</label>
              <select required value={form.class_group_id} onChange={e => set('class_group_id', e.target.value)} className={inp}>
                <option value="">Seleccionar...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Período</label>
              <select value={form.periodo_id} onChange={e => set('periodo_id', e.target.value)} className={inp}>
                <option value="">Sem período</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                <option value="rascunho">Rascunho</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações Gerais</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} className={inp+' resize-none'} placeholder="Avaliação geral do desempenho da turma..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Alunos em Risco</label>
            <textarea value={form.alunos_risco} onChange={e => set('alunos_risco', e.target.value)} rows={2} className={inp+' resize-none'} placeholder="Identificar alunos com dificuldades ou risco de reprovação..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Decisões Pedagógicas</label>
            <textarea value={form.decisoes} onChange={e => set('decisoes', e.target.value)} rows={3} className={inp+' resize-none'} placeholder="Medidas e decisões tomadas pelo conselho..." />
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

export default function ConselhoClasse() {
  const [lista, setLista] = useState([])
  const [turmas, setTurmas] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    if (filtroPeriodo) p.set('periodo_id', filtroPeriodo)
    api.get(`/pedagogico/conselhos?${p}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroTurma, filtroPeriodo])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/periodos'),
    ]).then(([t, p]) => { setTurmas(t.data || []); setPeriodos(p.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Conselhos de Classe" subtitle="Análise pedagógica e decisões por turma"
        action={
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>Novo Conselho
          </button>
        }
      />

      {modal !== null && (
        <ModalConselho turmas={turmas} periodos={periodos}
          inicial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os períodos</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="groups" title="Nenhum conselho registado" description="Registe o primeiro conselho de classe."
          action={<button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold"><span className="material-symbols-outlined text-[16px]">add</span>Novo Conselho</button>} />
      ) : (
        <div className="space-y-4">
          {lista.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-on-surface">{c.turma_nome}</h3>
                    <span className="text-xs text-on-surface-variant">{c.classe_nome}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_CLS[c.status]}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {c.periodo_nome && <span>{c.periodo_nome} · </span>}
                    {fmtData(c.data)}
                    {c.criado_por_nome && <span> · Por {c.criado_por_nome}</span>}
                  </p>
                </div>
                <button onClick={() => setModal(c)} className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>

              {c.observacoes && (
                <div className="bg-surface-container-low rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-sm text-on-surface">{c.observacoes}</p>
                </div>
              )}
              {c.alunos_risco && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">warning</span>Alunos em Risco
                  </p>
                  <p className="text-sm text-red-700">{c.alunos_risco}</p>
                </div>
              )}
              {c.decisoes && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">gavel</span>Decisões
                  </p>
                  <p className="text-sm text-blue-700">{c.decisoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
