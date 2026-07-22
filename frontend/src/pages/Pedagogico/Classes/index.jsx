import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const NIVEIS = ['Primário', 'Secundário', 'Técnico Profissional']
const emptyForm = { nome: '', ordem: '', nivel_ensino: 'Secundário' }

export default function Classes() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(false)

  const load = () => {
    setLoading(true)
    api.get(`/pedagogico/classes${mostrarInativas ? '?incluir_inativos=1' : ''}`)
      .then(r => setClasses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [mostrarInativas])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.ordem) { setError('Nome e ordem são obrigatórios'); return }
    setSaving(true)
    try {
      await api.post('/pedagogico/classes', { ...form, ordem: parseInt(form.ordem) })
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
    if (!window.confirm('Desactivar esta classe? Pode reactivá-la depois em "Mostrar desactivadas".')) return
    try { await api.delete(`/pedagogico/classes/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const handleReactivar = async (id) => {
    try { await api.put(`/pedagogico/classes/${id}`, { activo: 1 }); load() }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Classes" subtitle="Níveis e classes do ensino"
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
              {showForm ? 'Cancelar' : 'Nova Classe'}
            </button>
          </div>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-on-surface mb-4 text-sm">Nova Classe</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ex: 8ª Classe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ordem *</label>
              <input type="number" value={form.ordem} onChange={e => set('ordem', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="8" min="1" max="13" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nível de Ensino</label>
              <select value={form.nivel_ensino} onChange={e => set('nivel_ensino', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white">
                {NIVEIS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
              {saving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : classes.length === 0 ? (
        <EmptyState icon="category" title="Nenhuma classe criada"
          description="Crie as classes para organizar o currículo escolar." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Ord.</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wider">Nível</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {classes.map(c => (
                <tr key={c.id} className={`hover:bg-surface-container-low/40 transition-colors ${!c.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{String(c.ordem).padStart(2, '0')}</td>
                  <td className="px-4 py-3 font-semibold text-on-surface">
                    {c.nome}
                    {!c.activo && <span className="ml-2 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full align-middle">Desactivada</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${c.nivel_ensino === 'Primário' ? 'bg-green-100 text-green-700'
                        : c.nivel_ensino === 'Secundário' ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'}`}>
                      {c.nivel_ensino}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.activo ? (
                      <button onClick={() => handleDelete(c.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : (
                      <button onClick={() => handleReactivar(c.id)}
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
            {classes.length} classe{classes.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
