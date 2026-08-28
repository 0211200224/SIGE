import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const emptyForm = { professor_id: '', class_group_ids: [], subject_ids: [], ano_lectivo: new Date().getFullYear().toString() }

export default function Atribuicoes() {
  const toast = useToast()
  const confirmar = useConfirm()
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

  const toggleId = (campo, id) => {
    setForm(f => ({
      ...f,
      [campo]: f[campo].includes(id) ? f[campo].filter(x => x !== id) : [...f[campo], id],
    }))
  }

  // Um professor pode ser habilitado a varias turmas e/ou varias disciplinas
  // de uma so vez -- cria uma atribuicao por cada combinacao (turma x
  // disciplina) seleccionada, reaproveitando o endpoint existente (que ja
  // ignora combinacoes repetidas) em vez de repetir o formulario manualmente.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.professor_id || !form.class_group_ids.length || !form.subject_ids.length) {
      setError('Professor, pelo menos uma turma e pelo menos uma disciplina são obrigatórios'); return
    }
    setSaving(true)
    try {
      let criadas = 0, falhas = 0
      for (const turmaId of form.class_group_ids) {
        for (const disciplinaId of form.subject_ids) {
          try {
            await api.post('/pedagogico/atribuicoes', {
              professor_id: parseInt(form.professor_id),
              class_group_id: turmaId,
              subject_id: disciplinaId,
              ano_lectivo: form.ano_lectivo,
            })
            criadas++
          } catch { falhas++ }
        }
      }
      setForm(emptyForm)
      setShowForm(false)
      load()
      if (falhas > 0) setError(`${criadas} atribuição(ões) criada(s); ${falhas} já existiam ou falharam.`)
      else toast.success(`${criadas} atribuição(ões) criada(s) com sucesso.`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmar({
      title: 'Remover atribuição?',
      body: 'O professor deixa de estar habilitado a esta turma/disciplina. Pode voltar a atribuí-lo mais tarde, se necessário.',
      danger: true, confirmLabel: 'Remover',
    })
    if (!ok) return
    try {
      await api.delete(`/pedagogico/atribuicoes/${id}`)
      toast.success('Atribuição removida com sucesso.')
      load()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
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
          <p className="text-xs text-on-surface-variant mb-4">
            Seleccione uma ou mais turmas e uma ou mais disciplinas — cria-se uma atribuição para cada combinação,
            para habilitar o professor a várias turmas/disciplinas de uma só vez.
          </p>
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
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo</label>
              <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="2025" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Turmas * {form.class_group_ids.length > 0 && <span className="text-primary">({form.class_group_ids.length} seleccionada{form.class_group_ids.length !== 1 ? 's' : ''})</span>}
              </label>
              {turmas.length === 0 ? (
                <p className="text-xs text-on-surface-variant">Nenhuma turma criada ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {turmas.map(t => {
                    const checked = form.class_group_ids.includes(t.id)
                    return (
                      <label key={t.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                        }`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleId('class_group_ids', t.id)} className="hidden" />
                        {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {t.nome} — {t.classe_nome}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Disciplinas * {form.subject_ids.length > 0 && <span className="text-primary">({form.subject_ids.length} seleccionada{form.subject_ids.length !== 1 ? 's' : ''})</span>}
              </label>
              {disciplinas.length === 0 ? (
                <p className="text-xs text-on-surface-variant">Nenhuma disciplina criada ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {disciplinas.map(d => {
                    const checked = form.subject_ids.includes(d.id)
                    return (
                      <label key={d.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                        }`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleId('subject_ids', d.id)} className="hidden" />
                        {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {d.nome}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? 'A guardar...' : `Guardar ${form.class_group_ids.length * form.subject_ids.length > 1 ? `${form.class_group_ids.length * form.subject_ids.length} Atribuições` : 'Atribuição'}`}
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
          <div className="overflow-x-auto">
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
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {a.professor_nome?.charAt(0)}
                      </div>
                      <span className="font-medium text-on-surface text-sm truncate">{a.professor_nome}</span>
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
          </div>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {atribuicoes.length} atribuiç{atribuicoes.length !== 1 ? 'ões' : 'ão'}
          </div>
        </div>
      )}
    </div>
  )
}
