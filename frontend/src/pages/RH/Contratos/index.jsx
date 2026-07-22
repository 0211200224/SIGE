import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS = ['efectivo', 'termo_certo', 'termo_incerto', 'prestacao_servicos', 'estagio']
const ESTADOS = ['activo', 'expirado', 'rescindido', 'renovado']
const ESTADO_BADGE = {
  activo: 'bg-green-100 text-green-700',
  expirado: 'bg-yellow-100 text-yellow-700',
  rescindido: 'bg-red-100 text-red-700',
  renovado: 'bg-blue-100 text-blue-700',
}

function Modal({ item, onClose, onSaved, funcionarios }) {
  const [form, setForm] = useState({
    funcionario_id: item?.funcionario_id || '', tipo: item?.tipo || '',
    data_inicio: item?.data_inicio?.slice(0, 10) || '', data_fim: item?.data_fim?.slice(0, 10) || '',
    salario: item?.salario || '', horas_semanais: item?.horas_semanais || 40,
    estado: item?.estado || 'activo', observacoes: item?.observacoes || '',
    arquivo: item?.arquivo || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Ficheiro não pode exceder 5MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, arquivo: ev.target.result }))
    reader.readAsDataURL(file)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.funcionario_id || !form.tipo || !form.data_inicio || !form.salario) {
      setError('Preencha os campos obrigatórios.'); return
    }
    setLoading(true)
    try {
      if (item?.id) await api.put(`/rh/contratos/${item.id}`, form)
      else await api.post('/rh/contratos', form)
      onSaved()
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant sticky top-0 bg-white">
          <h2 className="font-semibold text-on-surface">{item?.id ? 'Editar' : 'Novo'} Contrato</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Funcionário *</label>
            <select value={form.funcionario_id} onChange={e => setForm(f => ({ ...f, funcionario_id: e.target.value }))} className={inputCls}>
              <option value="">Seleccionar funcionário</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar</option>
                {TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className={inputCls}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Início *</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data Fim</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Salário (MT) *</label>
              <input type="number" value={form.salario} onChange={e => setForm(f => ({ ...f, salario: e.target.value }))} min="0" step="0.01" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Horas/semana</label>
              <input type="number" value={form.horas_semanais} onChange={e => setForm(f => ({ ...f, horas_semanais: e.target.value }))} min="1" max="168" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">
              Contrato Original (PDF ou imagem, máx. 5MB)
            </label>
            <p className="text-[11px] text-on-surface-variant mb-1.5">Guardado no sistema para efeitos de auditoria futura.</p>
            <input type="file" accept=".pdf,image/*" onChange={handleArquivo}
              className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
            {form.arquivo && (
              <div className="mt-1.5 flex items-center gap-3">
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> Ficheiro anexado
                </p>
                <a href={form.arquivo} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver</a>
                <button type="button" onClick={() => setForm(f => ({ ...f, arquivo: '' }))} className="text-xs text-red-600 hover:underline">Remover</button>
              </div>
            )}
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

export default function Contratos() {
  const [searchParams] = useSearchParams()
  const [lista, setLista] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtroFuncionario, setFiltroFuncionario] = useState(searchParams.get('funcionario_id') || '')
  const [filtroEstado, setFiltroEstado] = useState('')
  const novoFuncId = searchParams.get('novo_func')
  const novoFuncNome = searchParams.get('nome')
  const [bannerVisible, setBannerVisible] = useState(!!novoFuncId)

  const carregar = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filtroFuncionario) q.set('funcionario_id', filtroFuncionario)
    if (filtroEstado) q.set('estado', filtroEstado)
    Promise.all([api.get(`/rh/contratos?${q}`), api.get('/rh/funcionarios')])
      .then(([c, f]) => { setLista(c.data); setFuncionarios(f.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filtroFuncionario, filtroEstado])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Banner: chegou do fluxo de admissão */}
      {bannerVisible && novoFuncId && (
        <div className="mb-5 flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-600 text-[22px]">celebration</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                {novoFuncNome ? `"${novoFuncNome}" registado!` : 'Funcionário registado!'} Último passo: criar contrato
              </p>
              <p className="text-xs text-blue-700 mt-0.5">Clique em "Novo Contrato" para associar um contrato a este funcionário</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setBannerVisible(false)} className="text-xs text-blue-700 hover:underline">Dispensar</button>
            <button
              onClick={() => { setBannerVisible(false); setModal({ funcionario_id: novoFuncId }) }}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              <span className="material-symbols-outlined text-[16px]">description</span>
              Criar Contrato Agora
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Contratos"
        subtitle={`${lista.length} contrato(s)`}
        action={
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Contrato
          </button>
        }
      />

      {modal !== null && <Modal item={modal} funcionarios={funcionarios} onClose={() => setModal(null)} onSaved={() => { setModal(null); carregar() }} />}

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
          <span className="material-symbols-outlined text-5xl mb-3 block">description</span>
          <p className="font-medium">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-cyan-600 text-[20px]">description</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-on-surface">{c.funcionario_nome}</p>
                <p className="text-xs text-on-surface-variant">{c.tipo?.replace(/_/g, ' ')} · {c.horas_semanais}h/sem</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-on-surface">{parseFloat(c.salario).toLocaleString('pt-MZ')} MT</p>
                <p className="text-xs text-on-surface-variant">{c.data_inicio?.slice(0, 10)} {c.data_fim ? `→ ${c.data_fim.slice(0, 10)}` : '(indefinido)'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
              {c.arquivo && (
                <a href={c.arquivo} target="_blank" rel="noreferrer" title="Ver contrato original"
                  className="p-1.5 rounded-lg hover:bg-surface-bright text-green-600 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </a>
              )}
              <button onClick={() => setModal(c)} className="p-1.5 rounded-lg hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
