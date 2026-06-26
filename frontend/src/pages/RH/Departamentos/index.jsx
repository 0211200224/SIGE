import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function Modal({ item, onClose, onSaved, funcionarios }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({
    nome: item?.nome || '',
    descricao: item?.descricao || '',
    responsavel_id: item?.responsavel_id || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    try {
      if (isEdit) await api.put(`/rh/departamentos/${item.id}`, form)
      else await api.post('/rh/departamentos', { nome: form.nome, descricao: form.descricao })
      onSaved(form.nome)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">{isEdit ? 'Editar' : 'Novo'} Departamento</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className={inputCls} placeholder="Ex: Pedagogia, Administração..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} className={inputCls} placeholder="Opcional" />
          </div>

          {/* Responsável só na edição — na criação ainda não há funcionários */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">
                Responsável
              </label>
              <select value={form.responsavel_id} onChange={e => setForm(f => ({ ...f, responsavel_id: e.target.value }))}
                className={inputCls}>
                <option value="">Sem responsável</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <p className="text-xs text-on-surface-variant mt-1">Atribuído após os funcionários estarem registados.</p>
            </div>
          )}

          {!isEdit && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <span className="material-symbols-outlined text-blue-500 text-[16px] mt-0.5 flex-shrink-0">info</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                O responsável é atribuído depois, quando já tiver funcionários registados neste departamento.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60 flex items-center gap-2">
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Departamentos() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [funcionarios, setFuncionarios] = useState([])
  const [modal, setModal] = useState(null)
  const [ultimoCriado, setUltimoCriado] = useState(null)

  const carregar = () => {
    setLoading(true)
    Promise.all([api.get('/rh/departamentos'), api.get('/rh/funcionarios')])
      .then(([d, f]) => { setLista(d.data); setFuncionarios(f.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const eliminar = async (id) => {
    if (!window.confirm('Desactivar este departamento?')) return
    try { await api.delete(`/rh/departamentos/${id}`); carregar() } catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Departamentos"
        subtitle={`${lista.filter(d => d.activo).length} departamento(s) activo(s)`}
        action={
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Departamento
          </button>
        }
      />

      {/* Banner de próximo passo */}
      {ultimoCriado && (
        <div className="mb-5 flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-green-600 text-[22px]">check_circle</span>
            <div>
              <p className="text-sm font-semibold text-green-800">"{ultimoCriado}" criado com sucesso</p>
              <p className="text-xs text-green-700 mt-0.5">Próximo passo: defina os cargos para este departamento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setUltimoCriado(null)} className="text-xs text-green-700 hover:underline">Ficar aqui</button>
            <Link to="/rh/cargos"
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              Criar Cargo
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {modal !== null && <Modal item={modal} funcionarios={funcionarios} onClose={() => setModal(null)}
        onSaved={(nome) => { setModal(null); setUltimoCriado(nome); carregar() }} />}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">apartment</span>
          <p className="font-medium">Nenhum departamento criado</p>
          <button onClick={() => setModal({})} className="mt-3 text-primary text-sm hover:underline">Criar primeiro departamento</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lista.map(d => (
            <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!d.activo ? 'opacity-50' : 'border-outline-variant'}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">apartment</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-on-surface">{d.nome}</h3>
                  {d.descricao && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{d.descricao}</p>}
                  <div className="mt-1.5">
                    {d.responsavel_nome
                      ? (
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">person</span>
                          {d.responsavel_nome}
                        </p>
                      ) : (
                        <button onClick={() => setModal(d)}
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline">
                          <span className="material-symbols-outlined text-[12px]">person_add</span>
                          Atribuir responsável
                        </button>
                      )
                    }
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(d)} className="p-1.5 rounded-lg hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  {d.activo && (
                    <button onClick={() => eliminar(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
