import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPO_LABEL = {
  interna: 'Interna',
  externa_saida: 'Saída Externa',
  externa_entrada: 'Entrada Externa',
  mudanca_turma: 'Mudança de Turma',
  mudanca_curso: 'Mudança de Curso',
}
const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  aprovada: 'bg-green-100 text-green-700',
  rejeitada: 'bg-red-100 text-red-600',
}

function ModalTransferencia({ turmas, alunos, onClose, onSaved }) {
  const [form, setForm] = useState({
    aluno_id: '', tipo: 'mudanca_turma',
    class_group_origem_id: '', class_group_destino_id: '',
    escola_origem: '', escola_destino: '',
    motivo: '', data: new Date().toISOString().slice(0, 10), observacoes: ''
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    try {
      await api.post('/secretaria/transferencias', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"
  const interna = ['interna','mudanca_turma','mudanca_curso'].includes(form.tipo)
  const entrada = form.tipo === 'externa_entrada'
  const saida = form.tipo === 'externa_saida'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">Nova Transferência</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Aluno *</label>
            <select required value={form.aluno_id} onChange={e => set('aluno_id', e.target.value)} className={inp}>
              <option value="">Seleccionar aluno...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.numero_matricula})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo *</label>
            <select required value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(interna || saida) && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Turma de Origem</label>
              <select value={form.class_group_origem_id} onChange={e => set('class_group_origem_id', e.target.value)} className={inp}>
                <option value="">Seleccionar...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
              </select>
            </div>
          )}
          {(interna) && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Turma de Destino *</label>
              <select value={form.class_group_destino_id} onChange={e => set('class_group_destino_id', e.target.value)} className={inp}>
                <option value="">Seleccionar...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
              </select>
            </div>
          )}
          {saida && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Escola de Destino</label>
              <input value={form.escola_destino} onChange={e => set('escola_destino', e.target.value)} className={inp} placeholder="Nome da escola" />
            </div>
          )}
          {entrada && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Escola de Origem</label>
              <input value={form.escola_origem} onChange={e => set('escola_origem', e.target.value)} className={inp} placeholder="Nome da escola anterior" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data *</label>
              <input required type="date" value={form.data} onChange={e => set('data', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Motivo</label>
              <input value={form.motivo} onChange={e => set('motivo', e.target.value)} className={inp} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} className={inp + ' resize-none'} placeholder="Opcional" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A registar...' : 'Registar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Transferencias() {
  const [lista, setLista] = useState([])
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterTipo) p.set('tipo', filterTipo)
    if (filterStatus) p.set('status', filterStatus)
    api.get(`/secretaria/transferencias?${p}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterTipo, filterStatus])

  useEffect(() => {
    api.get('/secretaria/turmas').then(r => setTurmas(r.data || [])).catch(() => {})
    api.get('/secretaria/alunos').then(r => setAlunos(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatus = async (id, status) => {
    try { await api.patch(`/secretaria/transferencias/${id}/status`, { status }); load() }
    catch (err) { alert(err.message) }
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Transferências" subtitle="Histórico de transferências e mudanças de turma"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Transferência
          </button>
        }
      />

      {modal && (
        <ModalTransferencia turmas={turmas} alunos={alunos}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="rejeitada">Rejeitada</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="swap_horiz" title="Sem transferências" description="Nenhuma transferência registada ainda." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Detalhe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {lista.map(t => (
                <tr key={t.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-on-surface">{t.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant font-mono">{t.numero_matricula}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">{TIPO_LABEL[t.tipo]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {t.turma_origem_nome && <p>De: {t.turma_origem_nome}</p>}
                    {t.turma_destino_nome && <p>Para: {t.turma_destino_nome}</p>}
                    {t.escola_destino && <p>Para: {t.escola_destino}</p>}
                    {t.escola_origem && <p>De: {t.escola_origem}</p>}
                    {t.motivo && <p className="italic">{t.motivo}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(t.data)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'pendente' && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleStatus(t.id, 'aprovada')}
                          className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Aprovar">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        </button>
                        <button onClick={() => handleStatus(t.id, 'rejeitada')}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Rejeitar">
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      </div>
                    )}
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
