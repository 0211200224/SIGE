import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const PERIODOS = ['única', 'mensal', 'trimestral', 'anual']
const PERIODO_BADGE = {
  'única': 'bg-purple-100 text-purple-700',
  mensal: 'bg-blue-100 text-blue-700',
  trimestral: 'bg-teal-100 text-teal-700',
  anual: 'bg-green-100 text-green-700',
}

const CATEGORIAS = [
  { value: 'academico', label: 'Académico', icon: 'school', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { value: 'servicos', label: 'Serviços', icon: 'local_shipping', color: 'bg-teal-100 text-teal-700', border: 'border-teal-200' },
  { value: 'administrativo', label: 'Administrativo', icon: 'admin_panel_settings', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  { value: 'outro', label: 'Outro', icon: 'more_horiz', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
]

const CAT_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.value, c]))

const EXEMPLOS = {
  academico: 'Ex: Propina, Matrícula, Inscrição, Exames, Actividades extracurriculares',
  servicos: 'Ex: Transporte escolar, Alimentação, Uniformes, Livros e material didáctico',
  administrativo: 'Ex: Emissão de declarações, Certificados, Taxas diversas, Multas',
  outro: 'Qualquer outra cobrança personalizada da instituição',
}

const inputCls = 'w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'
const emptyForm = { nome: '', categoria: 'academico', valor: '', valor_variavel: false, periodicidade: 'mensal', grade_level_id: '', descricao: '', obrigatoria: true }
const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function TiposCobranca() {
  const [taxas, setTaxas] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/financeiro/taxas').catch(() => []),
      api.get('/pedagogico/classes').catch(() => []),
    ]).then(([t, c]) => {
      setTaxas(Array.isArray(t) ? t : [])
      setClasses(Array.isArray(c) ? c : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome) { setError('Nome da cobrança é obrigatório'); return }
    if (!form.valor_variavel && !form.valor) { setError('Valor é obrigatório quando não é variável'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/taxas', {
        ...form,
        valor: form.valor_variavel ? 0 : parseFloat(form.valor),
        valor_variavel: form.valor_variavel ? 1 : 0,
        grade_level_id: form.grade_level_id || null,
        obrigatoria: form.obrigatoria ? 1 : 0,
      })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      console.error('Erro ao criar tipo de cobrança:', err)
      setError(err.message || 'Erro ao criar tipo de cobrança')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Desactivar este tipo de cobrança?')) return
    try { await api.delete(`/financeiro/taxas/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  const taxasFiltradas = filtroCategoria ? taxas.filter(t => t.categoria === filtroCategoria) : taxas

  const porCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    items: taxasFiltradas.filter(t => (t.categoria || 'academico') === cat.value),
  })).filter(cat => cat.items.length > 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Tipos de Cobrança"
        subtitle="Configurar serviços, taxas e cobranças da instituição"
        action={
          <button onClick={() => { setShowForm(v => !v); setError('') }}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancelar' : 'Novo Tipo'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-sm text-on-surface mb-4">Novo Tipo de Cobrança</h3>

          {/* Categoria */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-2">Categoria *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIAS.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => set('categoria', cat.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.categoria === cat.value ? cat.color + ' border-current' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                  <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
            {form.categoria && (
              <p className="text-xs text-on-surface-variant mt-1.5 italic">{EXEMPLOS[form.categoria]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nome da Cobrança *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)} className={inputCls} placeholder="Ex: Propina Mensal, Transporte..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Periodicidade</label>
              <select value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)} className={inputCls}>
                {PERIODOS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Classe (opcional)</label>
              <select value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)} className={inputCls}>
                <option value="">Todas as classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor Padrão (MT)</label>
              <input type="number" value={form.valor} onChange={e => set('valor', e.target.value)}
                className={inputCls} placeholder="0.00" min="0" step="0.01"
                disabled={form.valor_variavel} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Descrição</label>
              <input value={form.descricao} onChange={e => set('descricao', e.target.value)} className={inputCls} placeholder="Opcional..." />
            </div>
            <div className="sm:col-span-4 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.valor_variavel} onChange={e => { set('valor_variavel', e.target.checked); if (e.target.checked) set('valor', '') }}
                  className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-on-surface">Valor variável</span>
                <span className="text-xs text-on-surface-variant">(definido no momento do pagamento)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.obrigatoria} onChange={e => set('obrigatoria', e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-on-surface">Cobrança obrigatória</span>
              </label>
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <span className="material-symbols-outlined text-red-600 text-[18px] flex-shrink-0">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'add_circle'}</span>
              {saving ? 'A guardar...' : 'Criar Tipo de Cobrança'}
            </button>
          </div>
        </form>
      )}

      {/* Filtro de categoria */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFiltroCategoria('')}
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!filtroCategoria ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
          Todos
        </button>
        {CATEGORIAS.map(cat => (
          <button key={cat.value} onClick={() => setFiltroCategoria(filtroCategoria === cat.value ? '' : cat.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${filtroCategoria === cat.value ? cat.color + ' border-current' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
            <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : taxasFiltradas.length === 0 ? (
        <EmptyState icon="receipt_long" title="Nenhum tipo de cobrança criado"
          description="Crie os tipos de cobrança da escola (propinas, transportes, taxas...) para poder registar pagamentos." />
      ) : (
        <div className="space-y-6">
          {porCategoria.map(cat => (
            <div key={cat.value}>
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${cat.border} ${cat.color} w-fit`}>
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span className="font-semibold text-sm">{cat.label}</span>
                <span className="text-xs opacity-70">({cat.items.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map(t => (
                  <div key={t.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-on-surface truncate">{t.nome}</h3>
                        {t.descricao && <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{t.descricao}</p>}
                      </div>
                      <button onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-2 flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <div className="text-xl font-bold text-primary mb-3">
                      {t.valor_variavel ? <span className="text-base text-on-surface-variant italic">Valor variável</span> : fmt(t.valor)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PERIODO_BADGE[t.periodicidade] || 'bg-gray-100 text-gray-600'}`}>{t.periodicidade}</span>
                      {t.classe_nome && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t.classe_nome}</span>}
                      {t.obrigatoria ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Obrigatória</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Facultativa</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
