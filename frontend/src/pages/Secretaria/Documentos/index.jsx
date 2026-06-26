import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPO_DOC = ['Certidão de Nascimento', 'BI / Passaporte', 'Fotografia', 'Histórico Escolar', 'Certificado', 'Declaração', 'Outro']
const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
}

function ModalDoc({ alunos, onClose, onSaved }) {
  const [form, setForm] = useState({ aluno_id: '', tipo: '', descricao: '', data_doc: '', arquivo: '' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErro('Ficheiro demasiado grande (máx 5 MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => set('arquivo', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErro('')
    try {
      await api.post('/secretaria/documentos', form)
      onSaved()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white"
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">Adicionar Documento</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo *</label>
              <select required value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inp}>
                <option value="">Seleccionar...</option>
                {TIPO_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data do Documento</label>
              <input type="date" value={form.data_doc} onChange={e => set('data_doc', e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Descrição</label>
            <input value={form.descricao} onChange={e => set('descricao', e.target.value)} className={inp} placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ficheiro (máx 5 MB)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile}
              className="w-full text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer" />
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

export default function ArquivoDigital() {
  const [lista, setLista] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [filterTipo, setFilterTipo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterTipo) p.set('tipo', filterTipo)
    api.get(`/secretaria/documentos?${p}`)
      .then(r => setLista(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterTipo])

  useEffect(() => {
    api.get('/secretaria/alunos').then(r => setAlunos(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatus = async (id, status) => {
    try { await api.put(`/secretaria/documentos/${id}/status`, { status }); load() }
    catch (err) { alert(err.message) }
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Arquivo Digital" subtitle="Documentos e processos dos alunos"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Adicionar Documento
          </button>
        }
      />

      {modal && <ModalDoc alunos={alunos} onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5">
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os tipos</option>
          {TIPO_DOC.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="folder_open" title="Arquivo vazio" description="Nenhum documento adicionado ao arquivo." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {lista.map(d => (
                <tr key={d.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-on-surface">{d.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant font-mono">{d.numero_matricula}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">description</span>
                      <span className="text-xs font-medium">{d.tipo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{d.descricao || '—'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(d.data_doc || d.criado_em)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select value={d.status} onChange={e => handleStatus(d.id, e.target.value)}
                      className="text-xs rounded-lg border border-outline-variant px-2 py-1 outline-none bg-white">
                      <option value="pendente">Pendente</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
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
