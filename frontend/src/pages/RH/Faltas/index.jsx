import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS = [
  { v: 'injustificada', l: 'Falta Injustificada', badge: 'bg-red-100 text-red-700' },
  { v: 'justificada', l: 'Falta Justificada', badge: 'bg-yellow-100 text-yellow-700' },
  { v: 'medica', l: 'Licença Médica', badge: 'bg-blue-100 text-blue-700' },
  { v: 'atraso', l: 'Atraso', badge: 'bg-orange-100 text-orange-700' },
  { v: 'licenca', l: 'Licença Especial', badge: 'bg-purple-100 text-purple-700' },
]
const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.v, t]))

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function Modal({ onClose, onSaved, funcionarios, prefFuncionarioId }) {
  const [form, setForm] = useState({
    funcionario_id: prefFuncionarioId || '',
    data: new Date().toISOString().slice(0, 10),
    dias: 1,
    tipo: 'injustificada',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.funcionario_id || !form.data) { setError('Seleccione o funcionário e a data.'); return }
    setLoading(true)
    try {
      await api.post('/rh/faltas', form)
      onSaved()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">Registar Falta</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Funcionário *</label>
            <select value={form.funcionario_id} onChange={e => set('funcionario_id', e.target.value)} className={inputCls} required>
              <option value="">Seleccionar funcionário</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nº de Dias</label>
              <input type="number" min="1" max="31" value={form.dias}
                onChange={e => set('dias', Number(e.target.value))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo *</label>
            <div className="grid grid-cols-1 gap-2">
              {TIPOS.map(t => (
                <label key={t.v} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  form.tipo === t.v ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-outline'
                }`}>
                  <input type="radio" name="tipo" value={t.v} checked={form.tipo === t.v}
                    onChange={e => set('tipo', e.target.value)} className="sr-only" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.badge}`}>{t.l}</span>
                  {t.v === 'injustificada' && <span className="text-xs text-red-500 ml-auto">desconta salário</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              rows={2} placeholder="Motivo, documento apresentado, etc." className={inputCls} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60 flex items-center gap-2">
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Registar Falta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Faltas() {
  const [searchParams] = useSearchParams()
  const prefFuncId = searchParams.get('funcionario_id') || ''
  const [lista, setLista] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtroFuncionario, setFiltroFuncionario] = useState(prefFuncId)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1))
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()))

  const carregar = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filtroFuncionario) q.set('funcionario_id', filtroFuncionario)
    if (filtroTipo) q.set('tipo', filtroTipo)
    if (filtroMes) q.set('mes', filtroMes)
    if (filtroAno) q.set('ano', filtroAno)
    Promise.all([api.get(`/rh/faltas?${q}`), api.get('/rh/funcionarios')])
      .then(([fa, f]) => { setLista(fa.data); setFuncionarios(f.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filtroFuncionario, filtroTipo, filtroMes, filtroAno])

  const eliminar = async (id) => {
    if (!window.confirm('Eliminar este registo de falta?')) return
    try { await api.delete(`/rh/faltas/${id}`); carregar() } catch (err) { alert(err.message) }
  }

  const totalDias = lista.reduce((s, f) => s + (Number(f.dias) || 1), 0)
  const totalInj = lista.filter(f => f.tipo === 'injustificada').reduce((s, f) => s + (Number(f.dias) || 1), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Registo de Faltas"
        subtitle="Controlo manual de ausências dos funcionários"
        action={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Registar Falta
          </button>
        }
      />

      {showModal && (
        <Modal
          funcionarios={funcionarios}
          prefFuncionarioId={prefFuncId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); carregar() }}
        />
      )}

      {/* Resumo */}
      {lista.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-on-surface">{lista.length}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Registos</p>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-on-surface">{totalDias}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">Total de dias</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-red-700">{totalInj}</p>
            <p className="text-xs text-red-600 mt-0.5">Dias injustificados</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroFuncionario} onChange={e => setFiltroFuncionario(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os funcionários</option>
          {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os meses</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
          placeholder="Ano" className="w-24 px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant bg-white rounded-xl border border-outline-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">event_available</span>
          <p className="font-medium">Nenhuma falta registada</p>
          <p className="text-sm mt-1">Use os filtros para ajustar o período ou registe uma nova falta.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-bright border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Funcionário</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Data</th>
                <th className="text-center px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Dias</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Observações</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {lista.map(fa => (
                <tr key={fa.id} className="hover:bg-surface-bright/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">{fa.funcionario_nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{fa.data?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-on-surface">{fa.dias || 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_MAP[fa.tipo]?.badge || 'bg-gray-100 text-gray-600'}`}>
                      {TIPO_MAP[fa.tipo]?.l || fa.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs max-w-xs truncate">{fa.observacoes || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => eliminar(fa.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
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
