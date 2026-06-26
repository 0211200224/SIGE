import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function Modal({ item, onClose, onSaved, departamentos }) {
  const [form, setForm] = useState({ nome: item?.nome || '', departamento_id: item?.departamento_id || '', salario_base: item?.salario_base || '', descricao: item?.descricao || '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    try {
      if (item?.id) await api.put(`/rh/cargos/${item.id}`, form)
      else await api.post('/rh/cargos', form)
      onSaved(form.nome)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">{item?.id ? 'Editar' : 'Novo'} Cargo</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome do Cargo *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} placeholder="Ex: Professor, Director Adjunto..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Departamento</label>
            <select value={form.departamento_id} onChange={e => setForm(f => ({ ...f, departamento_id: e.target.value }))} className={inputCls}>
              <option value="">Sem departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Salário Base (MT)</label>
            <input type="number" value={form.salario_base} onChange={e => setForm(f => ({ ...f, salario_base: e.target.value }))} min="0" step="0.01" className={inputCls} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60 flex items-center gap-2">
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Cargos() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [departamentos, setDepartamentos] = useState([])
  const [modal, setModal] = useState(null)
  const [ultimoCriado, setUltimoCriado] = useState(null)

  const carregar = () => {
    setLoading(true)
    Promise.all([api.get('/rh/cargos'), api.get('/rh/departamentos')])
      .then(([c, d]) => { setLista(c.data); setDepartamentos(d.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const eliminar = async (id) => {
    if (!window.confirm('Desactivar este cargo?')) return
    try { await api.delete(`/rh/cargos/${id}`); carregar() } catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Cargos"
        subtitle={`${lista.filter(c => c.activo).length} cargo(s) activo(s)`}
        action={
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Cargo
          </button>
        }
      />

      {/* Banner próximo passo */}
      {ultimoCriado && (
        <div className="mb-5 flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-green-600 text-[22px]">check_circle</span>
            <div>
              <p className="text-sm font-semibold text-green-800">"{ultimoCriado}" criado com sucesso</p>
              <p className="text-xs text-green-700 mt-0.5">Próximo passo: registar o funcionário</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setUltimoCriado(null)} className="text-xs text-green-700 hover:underline">Ficar aqui</button>
            <Link to="/rh/funcionarios/novo"
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              Registar Funcionário
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {modal !== null && <Modal item={modal} departamentos={departamentos} onClose={() => setModal(null)}
        onSaved={(nome) => { setModal(null); setUltimoCriado(nome); carregar() }} />}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">work</span>
          <p className="font-medium">Nenhum cargo criado</p>
          <button onClick={() => setModal({})} className="mt-3 text-primary text-sm hover:underline">Criar primeiro cargo</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-bright border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Cargo</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Departamento</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Salário Base</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {lista.map(c => (
                <tr key={c.id} className={`hover:bg-surface-bright/60 transition-colors ${!c.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-on-surface-variant line-clamp-1">{c.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.departamento_nome || '—'}</td>
                  <td className="px-4 py-3 font-mono text-on-surface">
                    {c.salario_base ? `${parseFloat(c.salario_base).toLocaleString('pt-MZ')} MT` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal(c)} className="p-1.5 rounded-lg hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      {c.activo && (
                        <button onClick={() => eliminar(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
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
