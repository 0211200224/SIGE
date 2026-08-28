import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const emptyForm = { nome: '', codigo: '', grade_level_ids: [], carga_horaria: '4' }

// Disciplinas mais comuns no currículo moçambicano — sugestões para agilizar
// a criação; a escola pode sempre editar o nome/código antes de guardar, ou
// ignorar a lista e escrever uma disciplina que não esteja aqui.
const DISCIPLINAS_SUGERIDAS = [
  { nome: 'Português', codigo: 'POR' },
  { nome: 'Inglês', codigo: 'ING' },
  { nome: 'Francês', codigo: 'FRA' },
  { nome: 'Matemática', codigo: 'MAT' },
  { nome: 'Física', codigo: 'FIS' },
  { nome: 'Química', codigo: 'QUI' },
  { nome: 'Biologia', codigo: 'BIO' },
  { nome: 'Ciências Naturais', codigo: 'CNT' },
  { nome: 'Ciências Sociais', codigo: 'CSO' },
  { nome: 'História', codigo: 'HIS' },
  { nome: 'Geografia', codigo: 'GEO' },
  { nome: 'Educação Física', codigo: 'EDF' },
  { nome: 'Educação Visual', codigo: 'EDV' },
  { nome: 'Educação Musical', codigo: 'EMU' },
  { nome: 'Ofícios', codigo: 'OFI' },
  { nome: 'TIC / Informática', codigo: 'TIC' },
  { nome: 'Empreendedorismo', codigo: 'EMP' },
  { nome: 'Filosofia', codigo: 'FIL' },
  { nome: 'Religião e Moral', codigo: 'REL' },
  { nome: 'Agropecuária', codigo: 'AGR' },
]

export default function Disciplinas() {
  const toast = useToast()
  const confirmar = useConfirm()
  const [disciplinas, setDisciplinas] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/pedagogico/disciplinas'),
      api.get('/pedagogico/classes'),
    ]).then(([d, c]) => {
      setDisciplinas(d.data || [])
      setClasses(c.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleClasse = (id) => {
    setForm(f => ({
      ...f,
      grade_level_ids: f.grade_level_ids.includes(id)
        ? f.grade_level_ids.filter(x => x !== id)
        : [...f.grade_level_ids, id],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      if (editando) {
        await api.put(`/pedagogico/disciplinas/${editando.id}`, {
          nome: form.nome, codigo: form.codigo, carga_horaria: parseInt(form.carga_horaria) || 4,
        })
      } else {
        await api.post('/pedagogico/disciplinas', {
          ...form,
          carga_horaria: parseInt(form.carga_horaria) || 4,
        })
      }
      setForm(emptyForm)
      setEditando(null)
      setShowForm(false)
      toast.success(editando ? 'Disciplina actualizada com sucesso.' : 'Disciplina criada com sucesso.')
      load()
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditar = (d) => {
    setEditando(d)
    setForm({ nome: d.nome || '', codigo: d.codigo || '', grade_level_ids: [], carga_horaria: String(d.carga_horaria || 4) })
    setShowForm(true)
    setError('')
  }

  const handleCancelar = () => {
    setShowForm(false)
    setEditando(null)
    setForm(emptyForm)
    setError('')
  }

  const handleDelete = async (id) => {
    const ok = await confirmar({
      title: 'Remover disciplina?',
      body: 'A disciplina deixa de estar disponível para novas atribuições e planos curriculares.',
      danger: true, confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await api.delete(`/pedagogico/disciplinas/${id}`)
      toast.success('Disciplina removida com sucesso.')
      load()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <PageHeader title="Disciplinas" subtitle="Currículo e disciplinas por classe"
        action={
          <button onClick={() => { if (showForm) handleCancelar(); else { setShowForm(true); setError('') } }}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancelar' : 'Nova Disciplina'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-on-surface mb-4 text-sm">{editando ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          {!editando && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Sugestões — clique para preencher e agilizar (pode editar depois)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DISCIPLINAS_SUGERIDAS.map(s => (
                  <button key={s.codigo} type="button"
                    onClick={() => setForm(f => ({ ...f, nome: s.nome, codigo: f.codigo || s.codigo }))}
                    className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                      form.nome === s.nome ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-primary'
                    }`}>
                    {s.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Matemática" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Código</label>
              <input value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="MAT" maxLength={8} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Carga h/semana</label>
              <input type="number" value={form.carga_horaria} onChange={e => set('carga_horaria', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                min="1" max="20" />
            </div>
            {!editando && (
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Classes (opcional — sem seleção aplica-se a todas)
                </label>
                {classes.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">Nenhuma classe criada ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map(c => {
                      const checked = form.grade_level_ids.includes(c.id)
                      return (
                        <label key={c.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                            checked ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                          }`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleClasse(c.id)} className="hidden" />
                          {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
                          {c.nome}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={handleCancelar} className="px-4 py-2 text-sm rounded-lg border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? 'A guardar...' : editando ? 'Guardar Alterações' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : disciplinas.length === 0 ? (
        <EmptyState icon="menu_book" title="Nenhuma disciplina criada"
          description="Crie disciplinas para o currículo escolar." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">h/sem</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {disciplinas.map(d => (
                <tr key={d.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    {d.codigo ? (
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{d.codigo}</span>
                    ) : <span className="text-on-surface-variant text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-on-surface">{d.nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{d.classes_nomes || d.classe_nome || 'Todas'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{d.carga_horaria}h</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEditar(d)}
                        className="text-on-surface-variant hover:text-primary hover:bg-primary/5 p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(d.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {disciplinas.length} disciplina{disciplinas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
