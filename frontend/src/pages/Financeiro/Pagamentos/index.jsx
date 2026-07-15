import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const METODOS = ['Dinheiro', 'Transferência Bancária', 'M-Pesa', 'E-Mola', 'Cheque', 'Outro']

const CAT_LABEL = { academico: 'Académico', servicos: 'Serviços', administrativo: 'Administrativo', outro: 'Outro' }
const CAT_CLS = {
  academico: 'bg-blue-100 text-blue-700',
  servicos: 'bg-teal-100 text-teal-700',
  administrativo: 'bg-orange-100 text-orange-700',
  outro: 'bg-gray-100 text-gray-700',
}

const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  em_analise: 'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-600',
}
const STATUS_LABEL = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  confirmado: 'Confirmado',
  aprovado: 'Confirmado',
  rejeitado: 'Rejeitado',
}

const inputCls = 'w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'
const emptyForm = {
  aluno_id: '',
  taxa_id: '',
  valor: '',
  data_pagamento: new Date().toISOString().split('T')[0],
  metodo: 'Dinheiro',
  referencia: '',
  numero_comprovativo: '',
  mes_referencia: new Date().toISOString().substring(0, 7),
  observacoes: '',
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function Pagamentos() {
  const [alunos, setAlunos] = useState([])
  const [taxas, setTaxas] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const load = () => {
    const q = filtroEstado ? `?estado=${filtroEstado}` : ''
    Promise.all([
      api.get('/secretaria/alunos').catch(() => []),
      api.get('/financeiro/taxas').catch(() => []),
      api.get(`/financeiro/pagamentos${q}`).catch(() => []),
    ]).then(([a, t, p]) => {
      setAlunos(Array.isArray(a) ? a : [])
      setTaxas(Array.isArray(t) ? t : [])
      setPagamentos(Array.isArray(p) ? p : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filtroEstado])

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'taxa_id' && v) {
      const taxa = taxas.find(t => String(t.id) === String(v))
      if (taxa && !taxa.valor_variavel) next.valor = String(taxa.valor)
      else if (taxa && taxa.valor_variavel) next.valor = ''
    }
    return next
  })

  const selecionarAluno = (aluno) => {
    setForm(f => ({ ...f, aluno_id: aluno.id }))
    setAlunoSearch(aluno.nome)
    setShowDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.aluno_id) {
      setErro('Seleccione um aluno: escreva o nome e clique no aluno na lista que aparece')
      return
    }
    if (!form.taxa_id) {
      setErro('Seleccione o tipo de cobrança')
      return
    }
    const valor = parseFloat(form.valor)
    if (!form.valor || isNaN(valor) || valor <= 0) {
      setErro('Indique um valor válido (maior que zero)')
      return
    }

    setSaving(true)
    try {
      await api.post('/financeiro/pagamentos', {
        aluno_id: Number(form.aluno_id),
        taxa_id: Number(form.taxa_id),
        valor,
        data_pagamento: form.data_pagamento || null,
        metodo: form.metodo,
        referencia: form.referencia || null,
        numero_comprovativo: form.numero_comprovativo || null,
        mes_referencia: form.mes_referencia || null,
        observacoes: form.observacoes || null,
      })
      setSucesso('Pagamento registado com sucesso! Aparece na lista abaixo como Pendente.')
      setForm(emptyForm)
      setAlunoSearch('')
      load()
    } catch (err) {
      console.error('Erro ao registar pagamento:', err)
      setErro(err.message || 'Erro ao registar pagamento')
    } finally {
      setSaving(false)
    }
  }

  const alunosFiltrados = alunos.filter(a =>
    alunoSearch.length >= 1 &&
    (a.nome?.toLowerCase().includes(alunoSearch.toLowerCase()) ||
      (a.numero_matricula || '').includes(alunoSearch))
  )
  const alunoSelecionado = alunos.find(a => a.id == form.aluno_id)
  const taxaSelecionada = taxas.find(t => String(t.id) === String(form.taxa_id))

  const taxasPorCategoria = ['academico', 'servicos', 'administrativo', 'outro'].reduce((acc, cat) => {
    const items = taxas.filter(t => (t.categoria || 'academico') === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Registar Pagamento"
        subtitle="Propinas, serviços, taxas e qualquer cobrança da instituição"
      />

      {/* Formulário */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-8">
        <h2 className="font-semibold text-on-surface mb-5 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
          Novo Pagamento
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Aluno */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              1. Aluno *
            </label>
            <div className="relative">
              <input
                className={`${inputCls} ${alunoSelecionado ? 'border-green-400 bg-green-50' : ''}`}
                placeholder="Escreva o nome ou nº de matrícula e clique no aluno..."
                value={alunoSearch}
                autoComplete="off"
                onChange={e => {
                  setAlunoSearch(e.target.value)
                  setForm(f => ({ ...f, aluno_id: '' }))
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
              {showDropdown && alunoSearch.length >= 1 && !alunoSelecionado && (
                <div className="absolute z-10 w-full border border-outline-variant rounded-lg mt-1 shadow-lg bg-white max-h-48 overflow-y-auto">
                  {alunosFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-on-surface-variant text-center">Nenhum aluno encontrado para "{alunoSearch}"</p>
                  ) : (
                    alunosFiltrados.slice(0, 10).map(a => (
                      <button key={a.id} type="button"
                        onMouseDown={() => selecionarAluno(a)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 border-b border-outline-variant/30 last:border-0 flex items-center gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>
                        <div>
                          <span className="font-semibold text-on-surface">{a.nome}</span>
                          <span className="text-xs text-on-surface-variant ml-2 font-mono">{a.numero_matricula}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {alunoSelecionado ? (
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                {alunoSelecionado.nome} — {alunoSelecionado.numero_matricula}
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant mt-1">Escreva e clique no nome do aluno para seleccionar</p>
            )}
          </div>

          {/* Tipo de Cobrança */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              2. Tipo de Cobrança *
            </label>
            {taxas.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                Não há tipos de cobrança criados. Crie primeiro em{' '}
                <a href="/financeiro/taxas" className="underline font-medium">Tipos de Cobrança</a>.
              </div>
            ) : (
              <select
                className={`${inputCls} ${taxaSelecionada ? 'border-green-400' : ''}`}
                value={form.taxa_id}
                onChange={e => set('taxa_id', e.target.value)}
              >
                <option value="">— Seleccionar tipo de cobrança —</option>
                {Object.entries(taxasPorCategoria).map(([cat, items]) => (
                  <optgroup key={cat} label={`── ${CAT_LABEL[cat] || cat} ──`}>
                    {items.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome}{!t.valor_variavel ? ` (${fmt(t.valor)})` : ' (valor variável)'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            {taxaSelecionada && (
              <p className="text-xs mt-1 flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-full font-medium ${CAT_CLS[taxaSelecionada.categoria] || 'bg-gray-100 text-gray-700'}`}>
                  {CAT_LABEL[taxaSelecionada.categoria]}
                </span>
                {taxaSelecionada.descricao && <span className="text-on-surface-variant">{taxaSelecionada.descricao}</span>}
              </p>
            )}
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              3. Valor (MT) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls}
              value={form.valor}
              onChange={e => set('valor', e.target.value)}
              placeholder="Ex: 2500.00"
            />
          </div>

          {/* Método */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              4. Método de Pagamento
            </label>
            <select className={inputCls} value={form.metodo} onChange={e => set('metodo', e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Mês de Referência */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Mês de Referência</label>
            <input type="month" className={inputCls} value={form.mes_referencia}
              onChange={e => set('mes_referencia', e.target.value)} />
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Data do Pagamento</label>
            <input type="date" className={inputCls} value={form.data_pagamento}
              onChange={e => set('data_pagamento', e.target.value)} />
          </div>

          {/* Nº Comprovativo */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Nº do Comprovativo</label>
            <input className={inputCls} value={form.numero_comprovativo}
              onChange={e => set('numero_comprovativo', e.target.value)}
              placeholder="Nº de recibo ou transacção..." />
          </div>

          {/* Referência */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Referência Adicional</label>
            <input className={inputCls} value={form.referencia}
              onChange={e => set('referencia', e.target.value)}
              placeholder="Referência interna..." />
          </div>

          {/* Observações */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Observações</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)} placeholder="Opcional..." />
          </div>
        </div>

        {/* Erro e Sucesso — junto ao botão */}
        {erro && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-red-600 text-[20px] flex-shrink-0 mt-0.5">error</span>
            <p className="text-sm text-red-700 font-medium">{erro}</p>
          </div>
        )}
        {sucesso && (
          <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-300 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-green-600 text-[20px] flex-shrink-0 mt-0.5">check_circle</span>
            <p className="text-sm text-green-700 font-medium">{sucesso}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
            {saving ? 'A registar...' : 'Registar Pagamento'}
          </button>
        </div>
      </div>

      {/* Lista de pagamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-on-surface text-sm">Pagamentos Registados</h2>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em Análise</option>
            <option value="confirmado">Confirmado</option>
            <option value="rejeitado">Rejeitado</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : pagamentos.length === 0 ? (
          <EmptyState icon="payments" title="Nenhum pagamento registado"
            description="Os pagamentos registados aparecem aqui como Pendente até serem confirmados." action={null} />
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Tipo de Cobrança</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês</th>
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
                    <td className="px-4 py-3">
                      <p className="text-sm">{p.taxa_nome || '—'}</p>
                      {p.numero_comprovativo && (
                        <p className="text-xs text-on-surface-variant font-mono">#{p.numero_comprovativo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{p.mes_referencia || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{fmt(p.valor)}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{p.metodo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[p.estado] || p.estado}
                      </span>
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
