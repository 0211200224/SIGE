import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'

export default function PlanosCurriculares() {
  const [planos, setPlanos] = useState([])
  const [classes, setClasses] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroClasse, setFiltroClasse] = useState('')
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()))
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ grade_level_id: '', subject_id: '', tipo: 'obrigatoria', carga_horaria: 4, ano_lectivo: String(new Date().getFullYear()) })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroClasse) p.set('grade_level_id', filtroClasse)
    if (anoFiltro) p.set('ano_lectivo', anoFiltro)
    api.get(`/pedagogico/planos?${p}`)
      .then(r => setPlanos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroClasse, anoFiltro])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/classes'),
      api.get('/pedagogico/disciplinas'),
    ]).then(([c, d]) => { setClasses(c.data || []); setDisciplinas(d.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setSaving(true)
    try { await api.post('/pedagogico/planos', form); setModal(false); load() }
    catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const handleRemover = async (id) => {
    if (!window.confirm('Remover esta disciplina do plano?')) return
    try { await api.delete(`/pedagogico/planos/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  // Group by classe
  const porClasse = planos.reduce((acc, p) => {
    const k = p.classe_nome || 'Sem Classe'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Planos Curriculares" subtitle="Disciplinas por classe e ano lectivo"
        action={
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>Adicionar Disciplina
          </button>
        }
      />

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Adicionar ao Plano</h3>
              <button onClick={() => setModal(false)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
            </div>
            {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Classe *</label>
                <select required value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)} className={inp}>
                  <option value="">Seleccionar...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Disciplina *</label>
                <select required value={form.subject_id} onChange={e => set('subject_id', e.target.value)} className={inp}>
                  <option value="">Seleccionar...</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo</label>
                  <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
                    <option value="obrigatoria">Obrigatória</option>
                    <option value="opcional">Opcional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Horas/sem</label>
                  <input type="number" min="1" max="20" value={form.carga_horaria} onChange={e => set('carga_horaria', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ano</label>
                  <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} className={inp} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-xl border border-outline-variant">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
                  {saving ? 'A guardar...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={filtroClasse} onChange={e => setFiltroClasse(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          {anos.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : planos.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">list_alt</span>
          <p className="text-sm text-on-surface-variant">Nenhuma disciplina no plano para os filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(porClasse).map(([classe, items]) => (
            <div key={classe} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-5 py-3 border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-bold text-on-surface">{classe}</h3>
                <span className="text-xs text-on-surface-variant">{items.length} disciplina(s)</span>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Horas/sem</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {items.map(p => (
                    <tr key={p.id} className="hover:bg-surface-container-low/40">
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.disciplina_nome}</p>
                        {p.disciplina_codigo && <p className="text-xs text-on-surface-variant font-mono">{p.disciplina_codigo}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.tipo === 'obrigatoria' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.tipo === 'obrigatoria' ? 'Obrigatória' : 'Opcional'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{p.carga_horaria}h</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleRemover(p.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
