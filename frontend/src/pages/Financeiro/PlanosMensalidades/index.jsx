import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const inputCls = 'w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'
const emptyForm = { grade_level_id: '', ano_lectivo: String(new Date().getFullYear()), taxa_id: '', meses_cobrados: 10, mes_inicio: 1, dia_vencimento: '' }
const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function PlanosMensalidades() {
  const [planos, setPlanos] = useState([])
  const [classes, setClasses] = useState([])
  const [taxas, setTaxas] = useState([])
  const [diaPadrao, setDiaPadrao] = useState(8)
  const [diaPadraoInput, setDiaPadraoInput] = useState('8')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gerando, setGerando] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [salvandoDia, setSalvandoDia] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/financeiro/planos-propinas').catch(() => []),
      api.get('/pedagogico/classes').catch(() => []),
      api.get('/financeiro/taxas').catch(() => []),
      api.get('/financeiro/configuracao-iva').catch(() => null),
    ]).then(([p, c, t, cfg]) => {
      setPlanos(Array.isArray(p) ? p : [])
      setClasses(Array.isArray(c?.data) ? c.data : [])
      setTaxas(Array.isArray(t) ? t : [])
      if (cfg?.dia_vencimento_mensalidade) {
        setDiaPadrao(cfg.dia_vencimento_mensalidade)
        setDiaPadraoInput(String(cfg.dia_vencimento_mensalidade))
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salvarDiaPadrao = async () => {
    const dia = parseInt(diaPadraoInput, 10)
    if (!dia || dia < 1 || dia > 28) { alert('Indique um dia entre 1 e 28'); return }
    setSalvandoDia(true)
    try {
      await api.put('/financeiro/configuracao-vencimento', { dia_vencimento_mensalidade: dia })
      setDiaPadrao(dia)
    } catch (err) {
      alert(err.message || 'Erro ao guardar')
    } finally {
      setSalvandoDia(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.grade_level_id) { setError('Seleccione a classe'); return }
    if (!form.ano_lectivo) { setError('Indique o ano lectivo'); return }
    if (!form.taxa_id) { setError('Seleccione o tipo de cobrança (propina)'); return }
    setSaving(true)
    try {
      await api.post('/financeiro/planos-propinas', {
        grade_level_id: Number(form.grade_level_id),
        ano_lectivo: form.ano_lectivo,
        taxa_id: Number(form.taxa_id),
        meses_cobrados: Number(form.meses_cobrados),
        mes_inicio: Number(form.mes_inicio),
        dia_vencimento: form.dia_vencimento ? Number(form.dia_vencimento) : null,
      })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message || 'Erro ao criar plano')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (plano) => {
    try {
      await api.put(`/financeiro/planos-propinas/${plano.id}`, { activo: plano.activo ? 0 : 1 })
      load()
    } catch (err) {
      alert(err.message || 'Erro ao actualizar plano')
    }
  }

  const gerar = async (plano) => {
    if (!window.confirm(`Gerar já as cobranças de ${plano.meses_cobrados} meses para todos os alunos activos de ${plano.classe_nome || 'esta classe'} (${plano.ano_lectivo})? Cobranças já existentes não são duplicadas.`)) return
    setGerando(plano.id)
    setResultado(null)
    try {
      const r = await api.post(`/financeiro/planos-propinas/${plano.id}/gerar`, {})
      setResultado({ id: plano.id, ...r })
    } catch (err) {
      alert(err.message || 'Erro ao gerar cobranças')
    } finally {
      setGerando(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader title="Planos de Mensalidades" subtitle="Geração automática e rígida das cobranças mensais por classe" />

      {/* Dia de vencimento padrão */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <span className="material-symbols-outlined text-primary text-[22px]">event_available</span>
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-on-surface">Dia de vencimento padrão</p>
          <p className="text-xs text-on-surface-variant">Usado em todas as cobranças geradas automaticamente, salvo quando um plano define o seu próprio dia. Actualmente: dia {diaPadrao}.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min="1" max="28" value={diaPadraoInput} onChange={e => setDiaPadraoInput(e.target.value)}
            className="w-20 rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white text-center" />
          <button onClick={salvarDiaPadrao} disabled={salvandoDia}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            {salvandoDia ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:-translate-y-0.5 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancelar' : 'Novo Plano'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-8">
          <h2 className="font-semibold text-on-surface mb-4 text-sm">Novo Plano de Mensalidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Classe *</label>
              <select className={inputCls} value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)}>
                <option value="">— Seleccionar classe —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Ano Lectivo *</label>
              <input className={inputCls} value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} placeholder="Ex: 2026" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Tipo de Cobrança (propina) *</label>
              <select className={inputCls} value={form.taxa_id} onChange={e => set('taxa_id', e.target.value)}>
                <option value="">— Seleccionar tipo de cobrança —</option>
                {taxas.map(t => <option key={t.id} value={t.id}>{t.nome} ({fmt(t.valor)})</option>)}
              </select>
              <p className="text-xs text-on-surface-variant mt-1">O valor de cada cobrança gerada é fixado (snapshot) a partir do valor actual desta taxa.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Nº de Meses Cobrados</label>
              <select className={inputCls} value={form.meses_cobrados} onChange={e => set('meses_cobrados', e.target.value)}>
                <option value={10}>10 meses (sem mês de exame)</option>
                <option value={11}>11 meses (inclui mês de exame)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Mês de Início</label>
              <select className={inputCls} value={form.mes_inicio} onChange={e => set('mes_inicio', e.target.value)}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Dia de Vencimento (opcional)</label>
              <input type="number" min="1" max="28" className={inputCls} value={form.dia_vencimento}
                onChange={e => set('dia_vencimento', e.target.value)} placeholder={`Deixe em branco para usar o padrão da escola (dia ${diaPadrao})`} />
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-red-600 text-[20px] flex-shrink-0 mt-0.5">error</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
              {saving ? 'A criar...' : 'Criar Plano'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : planos.length === 0 ? (
        <EmptyState icon="event_repeat" title="Sem planos de mensalidades" description="Crie um plano por classe para gerar automaticamente as cobranças mensais do ano lectivo, com data de vencimento sempre rigorosa." action={null} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Classe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Ano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Cobrança</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Valor/mês</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Período</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Vencimento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {planos.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3 font-semibold">{p.classe_nome || '—'}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{p.ano_lectivo}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{p.taxa_nome || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(p.valor)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${p.meses_cobrados === 11 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.meses_cobrados} meses{p.meses_cobrados === 11 ? ' (c/ exame)' : ''}
                      </span>
                      <p className="text-on-surface-variant mt-0.5">{MESES[p.mes_inicio - 1]} a {MESES[p.mes_inicio + p.meses_cobrados - 2]}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">Dia {p.dia_vencimento || diaPadrao}{!p.dia_vencimento && ' (padrão)'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActivo(p)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => gerar(p)} disabled={gerando === p.id || !p.activo}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-primary/20 transition-colors ml-auto">
                        <span className="material-symbols-outlined text-[15px]">{gerando === p.id ? 'progress_activity' : 'auto_awesome'}</span>
                        {gerando === p.id ? 'A gerar...' : 'Gerar Cobranças'}
                      </button>
                      {resultado?.id === p.id && (
                        <p className="text-[11px] text-green-700 mt-1">{resultado.cobrancas_criadas} cobrança(s) criada(s) para {resultado.alunos} aluno(s)</p>
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
  )
}
