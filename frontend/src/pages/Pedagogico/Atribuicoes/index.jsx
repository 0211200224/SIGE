import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const emptyForm = { professor_id: '', class_group_id: '', subject_id: '', ano_lectivo: new Date().getFullYear().toString() }

export default function Atribuicoes() {
  const [atribuicoes, setAtribuicoes] = useState([])
  const [professores, setProfessores] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/pedagogico/atribuicoes'),
      api.get('/pedagogico/professores'),
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/disciplinas'),
    ]).then(([a, p, t, d]) => {
      setAtribuicoes(a.data || [])
      setProfessores(p.data || [])
      setTurmas(t.data || [])
      setDisciplinas(d.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.professor_id || !form.class_group_id || !form.subject_id) {
      setError('Professor, turma e disciplina são obrigatórios'); return
    }
    setSaving(true)
    try {
      await api.post('/pedagogico/atribuicoes', {
        professor_id: parseInt(form.professor_id),
        class_group_id: parseInt(form.class_group_id),
        subject_id: parseInt(form.subject_id),
        ano_lectivo: form.ano_lectivo,
      })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta atribuição?')) return
    try { await api.delete(`/pedagogico/atribuicoes/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Atribuições" subtitle="Atribuir professores a turmas e disciplinas"
        action={
          <button onClick={() => { setShowForm(v => !v); setError('') }}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancelar' : 'Nova Atribuição'}
          </button>
        }
      />

      {professores.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-yellow-600">warning</span>
          <p className="text-sm text-yellow-800">Não há professores com acesso ao sistema. Registe o professor no <strong>RH &gt; Funcionários</strong> e depois conceda acesso ao sistema (role "professor") — pode conferir a situação de cada professor em <strong>Pedagógico &gt; Professores</strong>.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-on-surface mb-4 text-sm">Nova Atribuição</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Professor *</label>
              <select value={form.professor_id} onChange={e => set('professor_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Seleccionar professor...</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turma *</label>
              <select value={form.class_group_id} onChange={e => set('class_group_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Seleccionar turma...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Disciplina *</label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Seleccionar disciplina...</option>
                {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo</label>
              <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="2025" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? 'A guardar...' : 'Guardar Atribuição'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : atribuicoes.length === 0 ? (
        <EmptyState icon="assignment_ind" title="Nenhuma atribuição"
          description="Atribua professores a turmas e disciplinas para começar." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ano</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {atribuicoes.map(a => (
                <tr key={a.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {a.professor_nome?.charAt(0)}
                      </div>
                      <span className="font-medium text-on-surface text-sm">{a.professor_nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-on-surface">{a.turma_nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{a.classe_nome}</td>
                  <td className="px-4 py-3">
                    <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">{a.disciplina_nome}</span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{a.ano_lectivo}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(a.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {atribuicoes.length} atribuiç{atribuicoes.length !== 1 ? 'ões' : 'ão'}
          </div>
        </div>
      )}
    </div>
  )
}
