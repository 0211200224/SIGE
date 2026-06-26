import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const ESTADOS = ['pendente', 'aprovado', 'rejeitado', 'gozado']
const ESTADO_BADGE = {
  pendente: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-700',
  gozado: 'bg-gray-100 text-gray-600',
}

function Modal({ onClose, onSaved, funcionarios }) {
  const [form, setForm] = useState({ funcionario_id: '', ano: new Date().getFullYear(), data_inicio: '', data_fim: '', observacoes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.funcionario_id || !form.data_inicio || !form.data_fim) { setError('Preencha os campos obrigatórios.'); return }
    if (new Date(form.data_fim) < new Date(form.data_inicio)) { setError('Data fim deve ser após data início.'); return }
    setLoading(true)
    try { await api.post('/rh/ferias', form); onSaved() }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">Pedido de Férias</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Funcionário *</label>
            <select value={form.funcionario_id} onChange={e => setForm(f => ({ ...f, funcionario_id: e.target.value }))} className={inputCls}>
              <option value="">Seleccionar</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ano *</label>
            <input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Início *</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Fim *</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} className={inputCls} />
            </div>
          </div>
          {form.data_inicio && form.data_fim && new Date(form.data_fim) >= new Date(form.data_inicio) && (
            <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Total: {Math.round((new Date(form.data_fim) - new Date(form.data_inicio)) / (1000 * 60 * 60 * 24)) + 1} dias
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60 flex items-center gap-2">
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Registar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Ferias() {
  const [searchParams] = useSearchParams()
  const [lista, setLista] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtroFuncionario, setFiltroFuncionario] = useState(searchParams.get('funcionario_id') || '')
  const [filtroEstado, setFiltroEstado] = useState('')

  const carregar = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filtroFuncionario) q.set('funcionario_id', filtroFuncionario)
    if (filtroEstado) q.set('estado', filtroEstado)
    Promise.all([api.get(`/rh/ferias?${q}`), api.get('/rh/funcionarios')])
      .then(([fe, f]) => { setLista(fe.data); setFuncionarios(f.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filtroFuncionario, filtroEstado])

  const atualizarEstado = async (id, estado) => {
    try { await api.patch(`/rh/ferias/${id}/estado`, { estado }); carregar() }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Férias"
        subtitle={`${lista.length} pedido(s) de férias`}
        action={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Registar Férias
          </button>
        }
      />

      {showModal && <Modal funcionarios={funcionarios} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); carregar() }} />}

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroFuncionario} onChange={e => setFiltroFuncionario(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os funcionários</option>
          {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">beach_access</span>
          <p className="font-medium">Nenhum pedido de férias</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(fe => (
            <div key={fe.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-teal-600 text-[20px]">beach_access</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface">{fe.funcionario_nome}</p>
                  <p className="text-xs text-on-surface-variant">
                    {fe.data_inicio?.slice(0, 10)} → {fe.data_fim?.slice(0, 10)} · <strong>{fe.dias} dias</strong> · {fe.ano}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[fe.estado] || 'bg-gray-100 text-gray-600'}`}>{fe.estado}</span>
                {fe.estado === 'pendente' && (
                  <div className="flex gap-2">
                    <button onClick={() => atualizarEstado(fe.id, 'aprovado')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">check</span>Aprovar
                    </button>
                    <button onClick={() => atualizarEstado(fe.id, 'rejeitado')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">close</span>Rejeitar
                    </button>
                  </div>
                )}
                {fe.estado === 'aprovado' && (
                  <button onClick={() => atualizarEstado(fe.id, 'gozado')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">done_all</span>Marcar Gozado
                  </button>
                )}
              </div>
              {fe.observacoes && <p className="mt-2 text-xs text-on-surface-variant pl-14">{fe.observacoes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
