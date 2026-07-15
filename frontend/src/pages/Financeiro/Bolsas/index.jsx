import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
const TIPOS = ['parcial', 'total', 'merito', 'familiar', 'outro']
const STATUS_CLS = { pendente: 'bg-amber-100 text-amber-700', aprovada: 'bg-green-100 text-green-700', rejeitada: 'bg-red-100 text-red-600' }
const TIPO_CLS = { total: 'bg-green-100 text-green-700', parcial: 'bg-blue-100 text-blue-700', merito: 'bg-purple-100 text-purple-700', familiar: 'bg-orange-100 text-orange-700', outro: 'bg-gray-100 text-gray-600' }

const emptyForm = { aluno_id: '', tipo: 'parcial', desconto_pct: '', valor_fixo: '', motivo: '', ano_lectivo: new Date().getFullYear().toString() }

export default function Bolsas() {
  const [bolsas, setBolsas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [decisaoModal, setDecisaoModal] = useState(null)
  const [decisaoForm, setDecisaoForm] = useState({ decisao: 'aprovada', motivo: '' })
  const [processando, setProcessando] = useState(null)

  const load = () => {
    setLoading(true)
    const q = filtroStatus ? `?status=${filtroStatus}` : ''
    Promise.all([api.get(`/financeiro/bolsas${q}`), api.get('/secretaria/alunos')])
      .then(([b, a]) => { setBolsas(Array.isArray(b) ? b : []); setAlunos(Array.isArray(a) ? a : []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filtroStatus])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSalvar = async () => {
    if (!form.aluno_id || !form.tipo) { alert('Aluno e tipo são obrigatórios'); return }
    if (!form.desconto_pct && !form.valor_fixo) { alert('Indique a percentagem ou valor fixo do desconto'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/bolsas', { ...form, aluno_id: parseInt(form.aluno_id), desconto_pct: form.desconto_pct || null, valor_fixo: form.valor_fixo || null })
      setModal(null); setForm(emptyForm); setAlunoSearch(''); load()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  const handleDecisao = async () => {
    setProcessando(decisaoModal.id)
    try {
      await api.patch(`/financeiro/bolsas/${decisaoModal.id}/decidir`, decisaoForm)
      setDecisaoModal(null); load()
    } catch (err) { alert(err.message) } finally { setProcessando(null) }
  }

  const alunosFiltrados = alunos.filter(a => !alunoSearch || a.nome?.toLowerCase().includes(alunoSearch.toLowerCase()) || (a.numero_matricula || '').includes(alunoSearch))
  const alunoSelecionado = alunos.find(a => a.id == form.aluno_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Bolsas e Descontos" subtitle="Gerir bolsas de estudo e isenções de propinas"
        action={<button onClick={() => { setModal(true); setForm(emptyForm); setAlunoSearch('') }} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all"><span className="material-symbols-outlined text-[18px]">add</span>Nova Bolsa</button>} />

      <div className="flex gap-3 mb-5">
        {['', 'pendente', 'aprovada', 'rejeitada'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${filtroStatus === s ? 'bg-primary text-on-primary border-primary' : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container'}`}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : bolsas.length === 0 ? (
        <EmptyState icon="school" title="Nenhuma bolsa registada" description="Registe bolsas de estudo ou isenções de propinas para alunos."
          action={<button onClick={() => { setModal(true); setForm(emptyForm) }} className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium">Nova Bolsa</button>} />
      ) : (
        <div className="space-y-3">
          {bolsas.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">school</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-on-surface">{b.aluno_nome}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIPO_CLS[b.tipo] || 'bg-gray-100 text-gray-600'}`}>{b.tipo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                </div>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">{b.numero_matricula}</p>
                <div className="text-xs text-on-surface-variant mt-1 flex gap-4">
                  {b.desconto_pct && <span>Desconto: <strong>{b.desconto_pct}%</strong></span>}
                  {b.valor_fixo && <span>Valor fixo: <strong>{Number(b.valor_fixo).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</strong></span>}
                  {b.ano_lectivo && <span>Ano: {b.ano_lectivo}</span>}
                </div>
                {b.motivo && <p className="text-xs text-on-surface-variant mt-0.5 italic">{b.motivo}</p>}
              </div>
              {b.status === 'pendente' && (
                <button onClick={() => { setDecisaoModal(b); setDecisaoForm({ decisao: 'aprovada', motivo: '' }) }}
                  className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:shadow-md transition-all">
                  <span className="material-symbols-outlined text-[16px]">gavel</span>Decidir
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar bolsa */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold">Nova Bolsa / Desconto</h2>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Pesquisar Aluno *</label>
                <input className={inputCls} placeholder="Nome ou nº matrícula..." value={alunoSearch}
                  onChange={e => { setAlunoSearch(e.target.value); set('aluno_id', '') }} />
                {alunoSearch && !alunoSelecionado && (
                  <div className="border border-outline-variant rounded-lg mt-1 shadow-sm max-h-32 overflow-y-auto">
                    {alunosFiltrados.slice(0, 6).map(a => (
                      <button key={a.id} type="button" onClick={() => { set('aluno_id', a.id); setAlunoSearch(a.nome) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low border-b border-outline-variant/50 last:border-0">
                        <span className="font-medium">{a.nome}</span><span className="text-xs text-on-surface-variant ml-2">{a.numero_matricula}</span>
                      </button>
                    ))}
                  </div>
                )}
                {alunoSelecionado && <p className="text-xs text-green-600 mt-1">✓ {alunoSelecionado.nome}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo *</label>
                  <select className={inputCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo</label>
                  <input className={inputCls} value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Desconto (%)</label>
                  <input type="number" className={inputCls} value={form.desconto_pct} onChange={e => set('desconto_pct', e.target.value)} placeholder="Ex: 50" min="0" max="100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor Fixo (MT)</label>
                  <input type="number" className={inputCls} value={form.valor_fixo} onChange={e => set('valor_fixo', e.target.value)} placeholder="0.00" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Justificação</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={form.motivo} onChange={e => set('motivo', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleSalvar} disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-60">{saving ? 'A guardar...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal decisão */}
      {decisaoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-2">Decidir Bolsa</h3>
            <p className="text-sm text-on-surface-variant mb-4">Bolsa de <strong>{decisaoModal.aluno_nome}</strong> ({decisaoModal.tipo})</p>
            <div className="flex gap-3 mb-4">
              {['aprovada', 'rejeitada'].map(d => (
                <button key={d} onClick={() => setDecisaoForm(f => ({ ...f, decisao: d }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize ${decisaoForm.decisao === d ? (d === 'aprovada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            {decisaoForm.decisao === 'rejeitada' && (
              <textarea className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary resize-none mb-3" rows={2}
                placeholder="Motivo da rejeição..." value={decisaoForm.motivo} onChange={e => setDecisaoForm(f => ({ ...f, motivo: e.target.value }))} />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setDecisaoModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleDecisao} disabled={processando === decisaoModal.id}
                className={`px-4 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 ${decisaoForm.decisao === 'aprovada' ? 'bg-green-600' : 'bg-red-600'}`}>
                {processando === decisaoModal.id ? 'A processar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
