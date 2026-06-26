import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPOS = ['Sala de Aula', 'Laboratório', 'Auditório', 'Biblioteca', 'Ginásio', 'Sala de Reuniões']
const emptyForm = { codigo: '', nome: '', tipo: 'Sala de Aula', capacidade: '40' }

export default function Salas() {
  const [salas, setSalas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/pedagogico/salas')
      .then(r => setSalas(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      await api.post('/pedagogico/salas', { ...form, capacidade: parseInt(form.capacidade) || 40 })
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
    if (!window.confirm('Remover esta sala?')) return
    try { await api.delete(`/pedagogico/salas/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Salas" subtitle="Gestão de salas e capacidades"
        action={
          <button onClick={() => { setShowForm(v => !v); setError('') }}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancelar' : 'Nova Sala'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-on-surface mb-4 text-sm">Nova Sala</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Código</label>
              <input value={form.codigo} onChange={e => set('codigo', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="S01" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Sala 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary bg-white">
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Capacidade</label>
              <input type="number" value={form.capacidade} onChange={e => set('capacidade', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                min="1" max="300" />
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
      ) : salas.length === 0 ? (
        <EmptyState icon="meeting_room" title="Nenhuma sala criada"
          description="Crie salas para associar às turmas." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Cap.</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {salas.map(s => (
                <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.codigo || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-on-surface">{s.nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{s.tipo}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{s.capacidade}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {salas.length} sala{salas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
