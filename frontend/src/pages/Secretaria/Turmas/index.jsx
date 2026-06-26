import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TURNO_COLOR = { 'Manhã': 'bg-yellow-100 text-yellow-700', 'Tarde': 'bg-orange-100 text-orange-700', 'Noite': 'bg-indigo-100 text-indigo-700' }

function ModalTurma({ classes, inicial, onClose, onSaved }) {
  const [form, setForm] = useState(inicial || { nome: '', grade_level_id: '', turno: 'Manhã', capacidade: 30, ano_lectivo: String(new Date().getFullYear()) })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    try {
      if (inicial?.id) await api.put(`/secretaria/turmas/${inicial.id}`, form)
      else await api.post('/secretaria/turmas', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">{inicial?.id ? 'Editar Turma' : 'Nova Turma'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Classe *</label>
            <select required value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)} className={inp}>
              <option value="">Seleccionar classe...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome da Turma *</label>
            <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inp} placeholder="Ex: 10ª A, 11ª Informática" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Turno</label>
              <select value={form.turno} onChange={e => set('turno', e.target.value)} className={inp}>
                <option>Manhã</option>
                <option>Tarde</option>
                <option>Noite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Capacidade</label>
              <input type="number" min={1} max={80} value={form.capacidade} onChange={e => set('capacidade', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ano Lectivo</label>
              <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} className={inp} placeholder="2026" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TurmasSecretaria() {
  const [turmas, setTurmas] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/secretaria/turmas')
      .then(r => setTurmas(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    api.get('/secretaria/classes').then(r => setClasses(r.data || [])).catch(() => {})
  }, [load])

  const handleEncerrar = async (id, nome) => {
    if (!window.confirm(`Encerrar a turma "${nome}"? Os alunos perderão a associação à turma.`)) return
    try { await api.put(`/secretaria/turmas/${id}`, { activo: 0 }); load() }
    catch (err) { alert(err.message) }
  }

  const getPctColor = (pct) => pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Turmas" subtitle="Criar e gerir turmas da escola"
        action={
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Turma
          </button>
        }
      />

      {modal !== null && (
        <ModalTurma classes={classes} inicial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : turmas.length === 0 ? (
        <EmptyState icon="class" title="Nenhuma turma criada"
          description="Crie a primeira turma clicando em Nova Turma."
          action={<button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition-all shadow-sm"><span className="material-symbols-outlined text-[16px]">add</span>Nova Turma</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map(t => {
            const total = Number(t.total_alunos) || 0
            const pct = Math.round((total / (t.capacidade || 30)) * 100)
            const cheio = total >= (t.capacidade || 30)
            return (
              <div key={t.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-on-surface text-lg">{t.nome}</h3>
                    <p className="text-xs text-on-surface-variant">{t.classe_nome} · {t.nivel_ensino || ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TURNO_COLOR[t.turno] || 'bg-gray-100 text-gray-600'}`}>
                    {t.turno}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-on-surface-variant">{total} alunos</span>
                    <span className={`font-semibold ${cheio ? 'text-red-600' : 'text-on-surface'}`}>{total}/{t.capacidade}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getPctColor(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {cheio && <p className="text-xs text-red-600 mt-1 font-medium">Turma lotada</p>}
                </div>

                <div className="text-xs text-on-surface-variant mb-4">
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">calendar_today</span>
                  {t.ano_lectivo}
                  {t.sala_nome && <span className="ml-3"><span className="material-symbols-outlined text-[14px] align-middle mr-1">meeting_room</span>{t.sala_nome}</span>}
                </div>

                <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
                  <div className="flex gap-2">
                    <Link to={`/secretaria/matriculas?class_group_id=${t.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">list</span>Ver alunos
                    </Link>
                    <Link to="/secretaria/matriculas/nova"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span>Matricular
                    </Link>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal(t)} className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1 rounded-lg transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleEncerrar(t.id, t.nome)} className="text-on-surface-variant hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors" title="Encerrar">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
