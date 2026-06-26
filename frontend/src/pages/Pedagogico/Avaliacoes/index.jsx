import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPOS = { teste: 'Teste', prova: 'Prova', exame: 'Exame', trabalho: 'Trabalho', exercicio: 'Exercício' }
const TIPO_CLS = { teste: 'bg-blue-100 text-blue-700', prova: 'bg-purple-100 text-purple-700', exame: 'bg-red-100 text-red-600', trabalho: 'bg-green-100 text-green-700', exercicio: 'bg-gray-100 text-gray-600' }
const inp = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'

function ModalAvaliacao({ periodos, turmas, disciplinas, inicial, onClose, onSaved }) {
  const [form, setForm] = useState(inicial?.id
    ? { nome: inicial.nome, tipo: inicial.tipo, subject_id: inicial.subject_id||'', class_group_id: inicial.class_group_id||'', periodo_id: inicial.periodo_id||'', peso: inicial.peso||100, data_programada: inicial.data_programada?.slice(0,10)||'' }
    : { nome: '', tipo: 'teste', subject_id: '', class_group_id: '', periodo_id: '', peso: 100, data_programada: '' }
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setSaving(true)
    try {
      const payload = { ...form, subject_id: form.subject_id || null, class_group_id: form.class_group_id || null, periodo_id: form.periodo_id || null }
      if (inicial?.id) await api.put(`/pedagogico/avaliacoes/${inicial.id}`, payload)
      else await api.post('/pedagogico/avaliacoes', payload)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{inicial?.id ? 'Editar Avaliação' : 'Nova Avaliação'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome *</label>
            <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inp} placeholder="Ex: Teste 1 de Matemática" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
                {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Peso (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={form.peso} onChange={e => set('peso', e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Disciplina</label>
            <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)} className={inp}>
              <option value="">Todas / Geral</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Turma</label>
            <select value={form.class_group_id} onChange={e => set('class_group_id', e.target.value)} className={inp}>
              <option value="">Todas as turmas</option>
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
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Programada</label>
            <input type="date" value={form.data_programada} onChange={e => set('data_programada', e.target.value)} className={inp} />
          </div>
          <div className="flex gap-3 justify-end pt-1">
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

export default function Avaliacoes() {
  const [lista, setLista] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroPeriodo) p.set('periodo_id', filtroPeriodo)
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    api.get(`/pedagogico/avaliacoes?${p}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroPeriodo, filtroTurma])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/periodos'),
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/disciplinas'),
    ]).then(([p, t, d]) => { setPeriodos(p.data || []); setTurmas(t.data || []); setDisciplinas(d.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleRemover = async (id) => {
    if (!window.confirm('Remover esta avaliação?')) return
    try { await api.delete(`/pedagogico/avaliacoes/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Avaliações" subtitle="Calendário e estrutura de avaliações"
        action={
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>Nova Avaliação
          </button>
        }
      />

      {modal !== null && (
        <ModalAvaliacao periodos={periodos} turmas={turmas} disciplinas={disciplinas}
          inicial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os períodos</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="quiz" title="Nenhuma avaliação programada" description="Defina a estrutura de avaliações para os períodos lectivos."
          action={<button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold"><span className="material-symbols-outlined text-[16px]">add</span>Nova Avaliação</button>} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Período</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Peso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {lista.map(a => (
                <tr key={a.id} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-medium">{a.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_CLS[a.tipo] || 'bg-gray-100 text-gray-600'}`}>
                      {TIPOS[a.tipo] || a.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{a.disciplina_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{a.turma_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{a.periodo_nome || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{a.peso}%</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(a.data_programada)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal(a)} className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => handleRemover(a.id)} className="text-on-surface-variant hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
