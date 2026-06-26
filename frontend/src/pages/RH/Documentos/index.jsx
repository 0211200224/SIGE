import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS_DOC = [
  'BI / Passaporte', 'NUIT', 'Cartão INSS', 'Contrato de Trabalho',
  'Certificado de Habilitações', 'Diploma', 'Curriculum Vitae',
  'Declaração', 'Atestado Médico', 'Outro',
]

const TIPO_ICON = {
  'BI / Passaporte': 'badge',
  'NUIT': 'receipt_long',
  'Cartão INSS': 'health_and_safety',
  'Contrato de Trabalho': 'description',
  'Certificado de Habilitações': 'school',
  'Diploma': 'workspace_premium',
  'Curriculum Vitae': 'person',
  'Declaração': 'article',
  'Atestado Médico': 'medical_information',
  'Outro': 'attach_file',
}

function Modal({ funcId, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: TIPOS_DOC[0], nome: '', data_doc: '', data_validade: '', observacoes: '', arquivo: ''
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErro('Ficheiro não pode exceder 5MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => set('arquivo', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErro('')
    try {
      await api.post(`/rh/funcionarios/${funcId}/documentos`, form)
      onSaved()
      onClose()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">Adicionar Documento</h2>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo de Documento</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={inputCls}>
              {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Nome / Descrição</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: BI emitido em 2023" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data do Documento</label>
              <input type="date" value={form.data_doc} onChange={e => set('data_doc', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data de Validade</label>
              <input type="date" value={form.data_validade} onChange={e => set('data_validade', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ficheiro (PDF, imagem, máx. 5MB)</label>
            <input type="file" accept=".pdf,image/*" onChange={handleArquivo}
              className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
            {form.arquivo && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Ficheiro carregado</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              rows={2} className={inputCls} />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocumentosFuncionario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [func, setFunc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [visualizar, setVisualizar] = useState(null)

  const carregar = () => {
    setLoading(true)
    Promise.all([
      api.get(`/rh/funcionarios/${id}`),
      api.get(`/rh/funcionarios/${id}/documentos`),
    ]).then(([rf, rd]) => { setFunc(rf.data); setDocs(rd.data) })
      .catch(() => navigate('/rh/funcionarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [id])

  const eliminar = async (docId) => {
    if (!window.confirm('Eliminar este documento?')) return
    try {
      await api.delete(`/rh/funcionarios/${id}/documentos/${docId}`)
      carregar()
    } catch (err) { alert(err.message) }
  }

  const verDocumento = async (docId) => {
    try {
      const r = await api.get(`/rh/funcionarios/${id}/documentos/${docId}`)
      setVisualizar(r.data)
    } catch (err) { alert(err.message) }
  }

  const isExpiring = (dataValidade) => {
    if (!dataValidade) return false
    const diff = (new Date(dataValidade) - new Date()) / (1000 * 60 * 60 * 24)
    return diff <= 30 && diff >= 0
  }

  const isExpired = (dataValidade) => {
    if (!dataValidade) return false
    return new Date(dataValidade) < new Date()
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/rh/funcionarios/${id}`)} className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-on-surface">Documentos</h1>
          {func && <p className="text-sm text-on-surface-variant">{func.nome}</p>}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Adicionar Documento
        </button>
      </div>

      {showModal && (
        <Modal funcId={id} onClose={() => setShowModal(false)} onSaved={carregar} />
      )}

      {/* Modal de visualização */}
      {visualizar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="font-semibold">{visualizar.tipo} — {visualizar.nome || ''}</h3>
              <button onClick={() => setVisualizar(null)}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {visualizar.arquivo?.startsWith('data:image') && (
                <img src={visualizar.arquivo} alt={visualizar.nome} className="max-w-full rounded-xl" />
              )}
              {visualizar.arquivo?.startsWith('data:application/pdf') && (
                <iframe src={visualizar.arquivo} className="w-full h-[60vh] rounded-xl" title="documento" />
              )}
              {!visualizar.arquivo && (
                <p className="text-center text-on-surface-variant py-10">Sem ficheiro anexado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant bg-white rounded-xl border border-outline-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">folder_open</span>
          <p className="font-medium">Nenhum documento registado</p>
          <p className="text-sm mt-1">Adicione documentos como BI, NUIT, contratos, diplomas, etc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map(d => (
            <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 ${
              isExpired(d.data_validade) ? 'border-red-300 bg-red-50/30' :
              isExpiring(d.data_validade) ? 'border-yellow-300 bg-yellow-50/30' :
              'border-outline-variant'
            }`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">{TIPO_ICON[d.tipo] || 'attach_file'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-on-surface">{d.tipo}</p>
                  {d.nome && <p className="text-xs text-on-surface-variant truncate">{d.nome}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-on-surface-variant">
                    {d.data_doc && <span>Emitido: {new Date(d.data_doc).toLocaleDateString('pt-MZ')}</span>}
                    {d.data_validade && (
                      <span className={isExpired(d.data_validade) ? 'text-red-600 font-semibold' : isExpiring(d.data_validade) ? 'text-yellow-600 font-semibold' : ''}>
                        {isExpired(d.data_validade) ? '⚠ Expirado' : isExpiring(d.data_validade) ? '⚠ Expira em breve' : `Válido até: ${new Date(d.data_validade).toLocaleDateString('pt-MZ')}`}
                      </span>
                    )}
                  </div>
                  {d.observacoes && <p className="text-xs text-on-surface-variant mt-1 italic">{d.observacoes}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => verDocumento(d.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-bright text-on-surface-variant transition-colors">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  Ver
                </button>
                <button onClick={() => eliminar(d.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
