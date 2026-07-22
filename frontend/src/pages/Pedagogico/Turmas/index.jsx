import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TURNOS = ['Manhã', 'Tarde', 'Noite']
const emptyForm = { grade_level_id: '', room_id: '', nome: '', turno: 'Manhã', capacidade: '40', ano_lectivo: new Date().getFullYear().toString(), professor_director_id: '' }

export default function TurmasPedagogico() {
  const [turmas, setTurmas] = useState([])
  const [classes, setClasses] = useState([])
  const [salas, setSalas] = useState([])
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/pedagogico/turmas${mostrarInativas ? '?incluir_inativos=1' : ''}`),
      api.get('/pedagogico/classes'),
      api.get('/pedagogico/salas'),
      api.get('/pedagogico/professores'),
    ]).then(([t, c, s, p]) => {
      setTurmas(t.data || [])
      setClasses(c.data || [])
      setSalas(s.data || [])
      setProfessores(p.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [mostrarInativas])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.grade_level_id || !form.nome || !form.ano_lectivo) {
      setError('Classe, nome e ano lectivo são obrigatórios'); return
    }
    setSaving(true)
    try {
      await api.post('/pedagogico/turmas', {
        ...form,
        capacidade: parseInt(form.capacidade) || 40,
        grade_level_id: parseInt(form.grade_level_id),
        room_id: form.room_id ? parseInt(form.room_id) : null,
        professor_director_id: form.professor_director_id ? parseInt(form.professor_director_id) : null,
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
    if (!window.confirm('Desactivar esta turma? Pode reactivá-la depois em "Mostrar desactivadas".')) return
    try { await api.delete(`/pedagogico/turmas/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const handleReactivar = async (id) => {
    try { await api.put(`/pedagogico/turmas/${id}`, { activo: 1 }); load() }
    catch (err) { alert(err.message) }
  }

  const TURNO_COLOR = { 'Manhã': 'bg-yellow-100 text-yellow-700', 'Tarde': 'bg-orange-100 text-orange-700', 'Noite': 'bg-indigo-100 text-indigo-700' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Turmas" subtitle="Turmas por classe, turno e sala"
        action={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
              <input type="checkbox" checked={mostrarInativas} onChange={e => setMostrarInativas(e.target.checked)}
                className="rounded border-outline-variant" />
              Mostrar desactivadas
            </label>
            <button onClick={() => { setShowForm(v => !v); setError('') }}
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cancelar' : 'Nova Turma'}
            </button>
          </div>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-on-surface mb-4 text-sm">Nova Turma</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Classe *</label>
              <select value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Seleccionar...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome da Turma *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 8ª A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo *</label>
              <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="2025" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turno</label>
              <select value={form.turno} onChange={e => set('turno', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                {TURNOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Sala</label>
              <select value={form.room_id} onChange={e => set('room_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Sem sala</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nome} (cap. {s.capacidade})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Capacidade</label>
              <input type="number" value={form.capacidade} onChange={e => set('capacidade', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary"
                min="1" max="100" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Director de Turma</label>
              <select value={form.professor_director_id} onChange={e => set('professor_director_id', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                <option value="">Sem director de turma</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : turmas.length === 0 ? (
        <EmptyState icon="class" title="Nenhuma turma criada"
          description="Crie as turmas para organizar os alunos por classe e turno." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sala</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Cap.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ano</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {turmas.map(t => (
                <tr key={t.id} className={`hover:bg-surface-container-low/40 transition-colors ${!t.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-on-surface">
                    {t.nome}
                    {!t.activo && <span className="ml-2 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full align-middle">Desactivada</span>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{t.classe_nome}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TURNO_COLOR[t.turno] || 'bg-gray-100 text-gray-700'}`}>
                      {t.turno}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{t.sala_nome || '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{t.capacidade}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{t.ano_lectivo}</td>
                  <td className="px-4 py-3 text-right">
                    {t.activo ? (
                      <button onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : (
                      <button onClick={() => handleReactivar(t.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {turmas.length} turma{turmas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
