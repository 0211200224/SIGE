import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPO_LABEL = {
  declaracao: 'Declaração',
  historico: 'Histórico Escolar',
  certificado: 'Certificado',
  declaracao_matricula: 'Declaração de Matrícula',
  declaracao_frequencia: 'Declaração de Frequência',
  comprovativo: 'Comprovativo',
}
const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  em_processamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-600',
}

function ModalNovaSolicitacao({ alunos, onClose, onSaved }) {
  const [form, setForm] = useState({ aluno_id: '', tipo: 'declaracao_matricula', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    try {
      await api.post('/secretaria/solicitacoes', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">Nova Solicitação</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Aluno *</label>
            <select required value={form.aluno_id} onChange={e => set('aluno_id', e.target.value)} className={inp}>
              <option value="">Seleccionar aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo de Documento *</label>
            <select required value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
              {Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
              className={inp + ' resize-none'} placeholder="Opcional" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A criar...' : 'Criar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalProcessar({ sol, onClose, onSaved }) {
  const [form, setForm] = useState({ status: sol.status, numero_doc: sol.numero_doc || '', data_conclusao: sol.data_conclusao?.slice(0,10) || '', observacoes: sol.observacoes || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/secretaria/solicitacoes/${sol.id}`, form)
      onSaved()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Processar Solicitação</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          <b>{sol.aluno_nome}</b> — {TIPO_LABEL[sol.tipo]}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
              <option value="pendente">Pendente</option>
              <option value="em_processamento">Em Processamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nº Documento</label>
            <input value={form.numero_doc} onChange={e => set('numero_doc', e.target.value)} className={inp} placeholder="Ex: DEC-2026-001" />
          </div>
          {form.status === 'concluida' && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data de Conclusão</label>
              <input type="date" value={form.data_conclusao} onChange={e => set('data_conclusao', e.target.value)} className={inp} />
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Solicitacoes() {
  const [lista, setLista] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [modalProcessar, setModalProcessar] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterStatus) p.set('status', filterStatus)
    if (filterTipo) p.set('tipo', filterTipo)
    api.get(`/secretaria/solicitacoes?${p}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus, filterTipo])

  useEffect(() => {
    api.get('/secretaria/alunos').then(r => setAlunos(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Solicitações de Documentos" subtitle={`${lista.filter(s => s.status === 'pendente').length} pendente(s)`}
        action={
          <button onClick={() => setModalNova(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Solicitação
          </button>
        }
      />

      {modalNova && (
        <ModalNovaSolicitacao alunos={alunos} onClose={() => setModalNova(false)} onSaved={() => { setModalNova(false); load() }} />
      )}
      {modalProcessar && (
        <ModalProcessar sol={modalProcessar} onClose={() => setModalProcessar(null)} onSaved={() => { setModalProcessar(null); load() }} />
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="em_processamento">Em Processamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="pending_actions" title="Sem solicitações" description="Nenhuma solicitação de documento registada." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nº Doc</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {lista.map(s => (
                <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-on-surface">{s.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant font-mono">{s.numero_matricula}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{TIPO_LABEL[s.tipo]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{s.numero_doc || '—'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    <p>{fmtData(s.criado_em)}</p>
                    {s.data_conclusao && <p className="text-green-600">{fmtData(s.data_conclusao)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModalProcessar(s)}
                      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors" title="Processar">
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
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
