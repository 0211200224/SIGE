import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
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
  anulado: 'bg-gray-200 text-gray-600 line-through',
}
const STATUS_LABEL = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  confirmado: 'Confirmado',
  aprovado: 'Confirmado',
  rejeitado: 'Rejeitado',
  anulado: 'Anulado',
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
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const alunoIdPreSelecionado = searchParams.get('aluno_id')
  const taxaIdPreSelecionada = searchParams.get('taxa_id')
  const mesReferenciaPreSelecionado = searchParams.get('mes_referencia')
  const [alunos, setAlunos] = useState([])
  const [taxas, setTaxas] = useState([])
  const [cfgIva, setCfgIva] = useState({ iva_activo: false, taxa_iva: null })
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [alunoBloqueado, setAlunoBloqueado] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTaxa, setFiltroTaxa] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [reciboId, setReciboId] = useState(null)
  const [reciboAluno, setReciboAluno] = useState(null)
  const [recibosMultiplos, setRecibosMultiplos] = useState(null)
  // Fila de cobranças extra para o mesmo pagamento (ex: mensalidade +
  // transporte, pagos juntos no mesmo atendimento) -- cada item vira o seu
  // próprio registo de pagamento (e recibo), reutilizando o endpoint
  // existente, nunca um pagamento "multi-linha" novo no backend.
  const [itens, setItens] = useState([])
  const [anularId, setAnularId] = useState(null)
  const [motivoAnulacao, setMotivoAnulacao] = useState('')
  const [anulando, setAnulando] = useState(false)

  const load = () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroTaxa) params.set('taxa_id', filtroTaxa)
    if (filtroMes) params.set('mes_referencia', filtroMes)
    const q = params.toString() ? `?${params}` : ''
    Promise.all([
      api.get('/secretaria/alunos').catch(() => ({ data: [] })),
      api.get('/financeiro/taxas').catch(() => []),
      api.get(`/financeiro/pagamentos${q}`).catch(() => []),
      api.get('/financeiro/configuracao-iva').catch(() => null),
    ]).then(([a, t, p, cfg]) => {
      // /secretaria/alunos devolve { data: [...] }, /financeiro/* devolve o array directamente
      const listaAlunos = Array.isArray(a?.data) ? a.data : []
      setAlunos(listaAlunos)
      setTaxas(Array.isArray(t) ? t : [])
      setPagamentos(Array.isArray(p) ? p : [])
      if (cfg) setCfgIva({ iva_activo: !!cfg.iva_activo, taxa_iva: cfg.taxa_iva })
      // Chegou aqui a partir da Ficha do Aluno (?aluno_id=) -- pré-seleccionar
      // e bloquear o campo, para não ser preciso pesquisar de novo.
      if (alunoIdPreSelecionado) {
        const aluno = listaAlunos.find(x => String(x.id) === String(alunoIdPreSelecionado))
        if (aluno) {
          setForm(f => ({ ...f, aluno_id: aluno.id }))
          setAlunoSearch(aluno.nome)
          setAlunoBloqueado(true)
        }
      }
      // Chegou aqui a partir do botão "Pagar" da lista de Dívidas (?taxa_id=
      // &mes_referencia=) -- pré-seleccionar a cobrança mais antiga em
      // dívida, para ir direito ao ponto sem reescolher tudo.
      if (taxaIdPreSelecionada) {
        const taxaLista = Array.isArray(t) ? t : []
        const taxa = taxaLista.find(x => String(x.id) === String(taxaIdPreSelecionada))
        setForm(f => ({
          ...f,
          taxa_id: taxaIdPreSelecionada,
          valor: taxa && !taxa.valor_variavel ? String(taxa.valor) : f.valor,
          mes_referencia: mesReferenciaPreSelecionado || f.mes_referencia,
        }))
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filtroEstado, filtroTaxa, filtroMes])

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

  // Adiciona a cobrança actualmente preenchida (taxa + valor) à fila, para
  // juntar mais do que uma ao mesmo pagamento -- ex: mensalidade e depois
  // transporte, antes de confirmar tudo de uma vez.
  const adicionarItem = () => {
    if (!form.taxa_id) { setErro('Seleccione o tipo de cobrança antes de adicionar'); return }
    const valor = parseFloat(form.valor)
    if (!form.valor || isNaN(valor) || valor <= 0) { setErro('Indique um valor válido antes de adicionar'); return }
    const taxa = taxas.find(t => String(t.id) === String(form.taxa_id))
    setItens(prev => [...prev, { taxa_id: form.taxa_id, taxa_nome: taxa?.nome || '—', valor, mes_referencia: form.mes_referencia }])
    setForm(f => ({ ...f, taxa_id: '', valor: '' }))
    setErro('')
  }
  const removerItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setReciboId(null)
    setReciboAluno(null)
    setRecibosMultiplos(null)

    if (!form.aluno_id) {
      setErro('Seleccione um aluno: escreva o nome e clique no aluno na lista que aparece')
      return
    }

    // Junta a cobrança ainda preenchida no formulário (se houver) à fila --
    // assim continua a dar para pagar uma única cobrança exactamente como
    // antes, sem ser obrigatório clicar em "Adicionar".
    const todosItens = [...itens]
    if (form.taxa_id || form.valor) {
      if (!form.taxa_id) { setErro('Seleccione o tipo de cobrança'); return }
      const valor = parseFloat(form.valor)
      if (!form.valor || isNaN(valor) || valor <= 0) { setErro('Indique um valor válido (maior que zero)'); return }
      todosItens.push({ taxa_id: form.taxa_id, valor, mes_referencia: form.mes_referencia })
    }
    if (todosItens.length === 0) {
      setErro('Seleccione o tipo de cobrança e o valor, ou adicione pelo menos uma cobrança à lista')
      return
    }

    setSaving(true)
    try {
      // O pagamento fica confirmado de imediato (o dinheiro já foi recebido
      // neste momento) -- o recibo sai já com o registo, sem passo extra de
      // "confirmar" separado. Cada cobrança da fila vira o seu próprio
      // pagamento (e recibo), registados em sequência.
      const registados = []
      for (const item of todosItens) {
        const r = await api.post('/financeiro/pagamentos', {
          aluno_id: Number(form.aluno_id),
          taxa_id: Number(item.taxa_id),
          valor: item.valor,
          data_pagamento: form.data_pagamento || null,
          metodo: form.metodo,
          referencia: form.referencia || null,
          numero_comprovativo: form.numero_comprovativo || null,
          mes_referencia: item.mes_referencia || null,
          observacoes: form.observacoes || null,
        })
        registados.push(r)
      }
      const totalRegistado = registados.reduce((s, r) => s + Number(r.valor), 0)
      if (registados.length === 1) {
        setReciboId(registados[0].id)
        setReciboAluno(registados[0].aluno_nome)
      } else {
        setRecibosMultiplos(registados)
      }
      toast.success(`${registados.length > 1 ? `${registados.length} pagamentos` : 'Pagamento'} de ${fmt(totalRegistado)} registado(s) e confirmado(s) para ${registados[0].aluno_nome}.`)
      setItens([])
      setForm(f => ({ ...emptyForm, aluno_id: alunoBloqueado ? f.aluno_id : '' }))
      if (!alunoBloqueado) setAlunoSearch('')
      load()
    } catch (err) {
      console.error('Erro ao registar pagamento:', err)
      setErro(err.message || 'Erro ao registar pagamento')
      toast.error(err.message || 'Erro ao registar pagamento')
    } finally {
      setSaving(false)
    }
  }

  const anular = async () => {
    if (!anularId || !motivoAnulacao.trim()) return
    setAnulando(true)
    try {
      await api.patch(`/financeiro/pagamentos/${anularId}/anular`, { motivo: motivoAnulacao })
      setAnularId(null); setMotivoAnulacao('')
      toast.success('Pagamento anulado. A cobrança voltou a ficar pendente.')
      load()
    } catch (err) {
      toast.error(err.message || 'Erro ao anular pagamento')
    } finally {
      setAnulando(false)
    }
  }

  const alunosFiltrados = alunos.filter(a =>
    alunoSearch.length >= 1 &&
    (a.nome?.toLowerCase().includes(alunoSearch.toLowerCase()) ||
      (a.numero_matricula || '').includes(alunoSearch))
  )
  const alunoSelecionado = alunos.find(a => a.id == form.aluno_id)
  const taxaSelecionada = taxas.find(t => String(t.id) === String(form.taxa_id))

  const previaIva = (() => {
    if (!taxaSelecionada || taxaSelecionada.sujeito_iva !== 'sim') return null
    if (!cfgIva.iva_activo || !cfgIva.taxa_iva) return null
    const total = parseFloat(form.valor)
    if (!total || isNaN(total) || total <= 0) return null
    const base = total / (1 + parseFloat(cfgIva.taxa_iva) / 100)
    return { base, iva: total - base, taxa: cfgIva.taxa_iva }
  })()

  const taxasPorCategoria = ['academico', 'servicos', 'administrativo', 'outro'].reduce((acc, cat) => {
    const items = taxas.filter(t => (t.categoria || 'academico') === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
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
            {alunoBloqueado && alunoSelecionado ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-400 bg-green-50 px-3 py-2.5">
                <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">{alunoSelecionado.nome}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{alunoSelecionado.numero_matricula} · {alunoSelecionado.turma_nome || 'Sem turma'}</p>
                </div>
                <button type="button" onClick={() => { setAlunoBloqueado(false); setAlunoSearch(''); setForm(f => ({ ...f, aluno_id: '' })) }}
                  className="text-xs text-primary hover:underline flex-shrink-0">Trocar aluno</button>
              </div>
            ) : (
              <>
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
                  <p className="text-xs text-on-surface-variant mt-1">
                    Escreva e clique no nome do aluno, ou use{' '}
                    <Link to="/financeiro/pesquisar" className="text-primary hover:underline font-medium">Pesquisar Aluno</Link> para abrir a ficha financeira primeiro.
                  </p>
                )}
              </>
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
            {previaIva && (
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                IVA incluído ({Number(previaIva.taxa).toFixed(2)}%): base {fmt(previaIva.base)} + IVA {fmt(previaIva.iva)}
              </p>
            )}
            <button type="button" onClick={adicionarItem}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Adicionar mais uma cobrança a este pagamento
            </button>
          </div>

          {/* Cobranças já adicionadas à fila deste pagamento (ex: mensalidade
              + transporte, pagas juntas) */}
          {itens.length > 0 && (
            <div className="col-span-2 bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Cobranças neste pagamento</p>
              {itens.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-outline-variant">
                  <span>{it.taxa_nome}{it.mes_referencia ? ` · ${it.mes_referencia}` : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmt(it.valor)}</span>
                    <button type="button" onClick={() => removerItem(i)} className="text-red-400 hover:text-red-600">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-on-surface-variant pt-1">
                Preencha o tipo de cobrança e valor seguintes acima (e "Adicionar" outra vez), ou deixe para pagar junto no botão final.
              </p>
            </div>
          )}

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

        {/* Erro — junto ao botão */}
        {erro && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-red-600 text-[20px] flex-shrink-0 mt-0.5">error</span>
            <p className="text-sm text-red-700 font-medium">{erro}</p>
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
            {saving ? 'A registar...' : itens.length > 0 ? `Registar ${itens.length + (form.taxa_id ? 1 : 0)} Pagamentos` : 'Registar Pagamento'}
          </button>
        </div>
      </div>

      {/* Pagamento confirmado no mesmo pedido -- sem estado "pendente"
          intermédio, o recibo já sai disponível de imediato. */}
      {reciboId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-center gap-4 flex-wrap">
          <span className="material-symbols-outlined text-green-600 text-[28px] flex-shrink-0">check_circle</span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-green-900">Pagamento confirmado!</p>
            <p className="text-sm text-green-700 mt-0.5">
              {reciboAluno ? `${reciboAluno} — o` : 'O'} recibo já está disponível para impressão, e a situação já reflecte no portal do aluno.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`/financeiro/recibos/${reciboId}/imprimir`} target="_blank"
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              <span className="material-symbols-outlined text-[16px]">print</span>Imprimir Recibo
            </Link>
            <button onClick={() => { setReciboId(null); setReciboAluno(null) }}
              className="px-4 py-2 text-sm rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Vários pagamentos confirmados de uma vez (mais do que uma cobrança
          neste pagamento) -- um recibo por cobrança, cada um com o seu link. */}
      {recibosMultiplos && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-green-600 text-[28px] flex-shrink-0">check_circle</span>
            <div>
              <p className="font-semibold text-green-900">{recibosMultiplos.length} pagamentos confirmados!</p>
              <p className="text-sm text-green-700 mt-0.5">
                {recibosMultiplos[0]?.aluno_nome} — os recibos já estão disponíveis para impressão, e a situação já reflecte no portal do aluno.
              </p>
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            {recibosMultiplos.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                <span className="text-sm">{r.taxa_nome} — {fmt(r.valor)}</span>
                <Link to={`/financeiro/recibos/${r.id}/imprimir`} target="_blank"
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline">
                  <span className="material-symbols-outlined text-[14px]">print</span>Imprimir Recibo
                </Link>
              </div>
            ))}
          </div>
          <button onClick={() => setRecibosMultiplos(null)}
            className="px-4 py-2 text-sm rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-colors">
            Fechar
          </button>
        </div>
      )}

      {/* Lista de pagamentos */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-semibold text-on-surface text-sm">Pagamentos Registados</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filtroTaxa} onChange={e => setFiltroTaxa(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
              <option value="">Todos os tipos de cobrança</option>
              {taxas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
              <option value="">Todos os estados</option>
              <option value="confirmado">Confirmado</option>
              <option value="anulado">Anulado</option>
            </select>
            {(filtroTaxa || filtroMes) && (
              <button onClick={() => { setFiltroTaxa(''); setFiltroMes('') }}
                className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>Limpar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : pagamentos.length === 0 ? (
          <EmptyState icon="payments" title="Nenhum pagamento registado"
            description="Os pagamentos ficam disponíveis aqui, já confirmados, assim que forem registados." action={null} />
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Tipo de Cobrança</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Método</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pagamentos.map(p => (
                  <tr key={p.id} className={`hover:bg-surface-container-low/40 ${p.anulado ? 'opacity-60' : ''}`}>
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[p.anulado ? 'anulado' : p.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[p.anulado ? 'anulado' : p.estado] || p.estado}
                      </span>
                      {p.anulado && p.anulado_motivo && (
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{p.anulado_motivo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.anulado && (p.estado === 'confirmado' || p.estado === 'aprovado') && (
                        <button onClick={() => setAnularId(p.id)}
                          className="text-xs text-red-600 hover:underline font-medium">Anular</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Anular pagamento */}
      {anularId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-3 text-red-600">Anular Pagamento</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              O pagamento deixa de contar para o total pago do aluno e a cobrança associada volta a ficar pendente. Fica registado no histórico com o motivo.
            </p>
            <textarea className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary resize-none" rows={3}
              placeholder="Motivo da anulação (obrigatório)..." value={motivoAnulacao} onChange={e => setMotivoAnulacao(e.target.value)} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setAnularId(null); setMotivoAnulacao('') }} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={anular} disabled={anulando || !motivoAnulacao.trim()}
                className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                {anulando ? 'A anular...' : 'Confirmar Anulação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
