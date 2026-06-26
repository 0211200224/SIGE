import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const METODOS = ['Dinheiro', 'Transferência Bancária', 'M-Pesa', 'E-Mola', 'Cheque', 'Outro']
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const emptyForm = { aluno_id: '', taxa_id: '', valor: '', data_pagamento: '', metodo: 'Dinheiro', referencia: '', mes_referencia: '', observacoes: '', comprovativo_url: '' }

const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  em_analise: 'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-600',
}
const STATUS_LABEL = { pendente: 'Pendente', em_analise: 'Em Análise', confirmado: 'Confirmado', aprovado: 'Confirmado', rejeitado: 'Rejeitado' }

export default function Pagamentos() {
  const [alunos, setAlunos] = useState([])
  const [taxas, setTaxas] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const load = () => {
    const q = filtroEstado ? `?estado=${filtroEstado}` : ''
    Promise.all([
      api.get('/secretaria/alunos'),
      api.get('/financeiro/taxas'),
      api.get(`/financeiro/pagamentos${q}`),
    ]).then(([a, t, p]) => {
      setAlunos(a.data || [])
      setTaxas(t.data || [])
      setPagamentos(p.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filtroEstado])

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'taxa_id' && v) {
      const taxa = taxas.find(t => t.id == v)
      if (taxa) next.valor = taxa.valor
    }
    return next
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.aluno_id || !form.valor) { setError('Aluno e valor são obrigatórios'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/pagamentos', {
        aluno_id: parseInt(form.aluno_id),
        taxa_id: form.taxa_id ? parseInt(form.taxa_id) : null,
        valor: parseFloat(form.valor),
        data_pagamento: form.data_pagamento || null,
        metodo: form.metodo,
        referencia: form.referencia || null,
        mes_referencia: form.mes_referencia || null,
        observacoes: form.observacoes || null,
        comprovativo_url: form.comprovativo_url || null,
      })
      setSuccess('Pagamento registado com sucesso! Aguarda análise e confirmação.')
      setForm(emptyForm)
      setAlunoSearch('')
      load()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const alunosFiltrados = alunos.filter(a => !alunoSearch || a.nome?.toLowerCase().includes(alunoSearch.toLowerCase()) || (a.numero_matricula || '').includes(alunoSearch))
  const alunoSelecionado = alunos.find(a => a.id == form.aluno_id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Registar Pagamento" subtitle="Registar e acompanhar pagamentos de propinas" />

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-red-600 text-[18px]">error</span><p className="text-sm text-red-700">{error}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span><p className="text-sm text-green-700">{success}</p></div>}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-sm text-amber-800">
        <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">info</span>
        <p>Os pagamentos registados entram como <strong>Pendente</strong>. Um responsável deve analisar e confirmar na secção de Validação de Pagamentos.</p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-8">
        <h2 className="font-semibold text-on-surface mb-4 text-sm">Novo Pagamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Pesquisar Aluno *</label>
            <input className={inputCls} placeholder="Nome ou nº de matrícula..." value={alunoSearch}
              onChange={e => { setAlunoSearch(e.target.value); set('aluno_id', '') }} />
            {alunoSearch && !alunoSelecionado && (
              <div className="border border-outline-variant rounded-lg mt-1 shadow-sm max-h-40 overflow-y-auto">
                {alunosFiltrados.slice(0, 8).map(a => (
                  <button key={a.id} type="button" onClick={() => { set('aluno_id', a.id); setAlunoSearch(a.nome) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low border-b border-outline-variant/50 last:border-0">
                    <span className="font-medium">{a.nome}</span><span className="text-xs text-on-surface-variant ml-2">{a.numero_matricula}</span>
                  </button>
                ))}
                {alunosFiltrados.length === 0 && <p className="px-3 py-2 text-sm text-on-surface-variant">Nenhum aluno encontrado</p>}
              </div>
            )}
            {alunoSelecionado && <p className="text-xs text-green-600 mt-1 font-medium">✓ {alunoSelecionado.nome} — {alunoSelecionado.numero_matricula}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Taxa / Propina</label>
            <select className={inputCls} value={form.taxa_id} onChange={e => set('taxa_id', e.target.value)}>
              <option value="">Seleccionar taxa (opcional)</option>
              {taxas.map(t => <option key={t.id} value={t.id}>{t.nome} — {fmt(t.valor)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor (MT) *</label>
            <input type="number" step="0.01" className={inputCls} value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Mês de Referência</label>
            <input type="month" className={inputCls} value={form.mes_referencia} onChange={e => set('mes_referencia', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data do Pagamento</label>
            <input type="date" className={inputCls} value={form.data_pagamento} onChange={e => set('data_pagamento', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Método de Pagamento</label>
            <select className={inputCls} value={form.metodo} onChange={e => set('metodo', e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Referência / Comprovativo</label>
            <input className={inputCls} value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Nº de transacção, cheque..." />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Observações</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
            {saving ? 'A registar...' : 'Registar Pagamento'}
          </button>
        </div>
      </form>

      {/* Lista de pagamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-on-surface text-sm">Histórico de Pagamentos</h2>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em Análise</option>
            <option value="confirmado">Confirmado</option>
            <option value="rejeitado">Rejeitado</option>
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
        ) : pagamentos.length === 0 ? (
          <EmptyState icon="payments" title="Nenhum pagamento" description="Os pagamentos registados aparecerão aqui." action={null} />
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês Ref.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Método</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pagamentos.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{p.aluno_nome}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{p.numero_matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{p.mes_referencia || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{fmt(p.valor)}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{p.metodo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.estado] || 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[p.estado] || p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
