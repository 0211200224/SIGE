import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const PARENTESCO = ['Pai','Mãe','Pai/Mãe','Avó','Avô','Tio','Tia','Irmão','Irmã','Tutor Legal','Outro']

function ModalEncarregado({ inicial, onClose, onSaved }) {
  const [form, setForm] = useState(inicial || { nome:'', parentesco:'Pai/Mãe', telefone:'', email:'', endereco:'', profissao:'' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    try {
      if (inicial?.id) await api.put(`/secretaria/encarregados/${inicial.id}`, form)
      else await api.post('/secretaria/encarregados', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none"
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">{inicial?.id ? 'Editar Encarregado' : 'Novo Encarregado'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome completo *</label>
              <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inp} placeholder="Nome do encarregado" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Parentesco</label>
              <select value={form.parentesco} onChange={e => set('parentesco', e.target.value)} className={inp + ' bg-white'}>
                {PARENTESCO.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Profissão</label>
              <input value={form.profissao} onChange={e => set('profissao', e.target.value)} className={inp} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)} className={inp} placeholder="+258 8X XXX XXXX" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="Opcional" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Endereço</label>
              <input value={form.endereco} onChange={e => set('endereco', e.target.value)} className={inp} placeholder="Opcional" />
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

export default function Encarregados() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    api.get(`/secretaria/encarregados?${params}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Encarregados" subtitle={`${lista.length} encarregado(s) registado(s)`}
        action={
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Encarregado
          </button>
        }
      />

      {modal !== null && (
        <ModalEncarregado inicial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm outline-none focus:border-primary" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="supervisor_account" title="Nenhum encarregado encontrado"
          description="Registe o primeiro encarregado de educação." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Encarregado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Parentesco</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Profissão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {lista.map(e => (
                <tr key={e.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {e.nome?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <p className="font-semibold text-on-surface">{e.nome}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{e.parentesco}</td>
                  <td className="px-4 py-3">
                    {e.telefone && <p className="text-xs">{e.telefone}</p>}
                    {e.email && <p className="text-xs text-on-surface-variant">{e.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{e.profissao || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal(e)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
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
