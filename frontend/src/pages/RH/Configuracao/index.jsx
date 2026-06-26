import { useEffect, useState } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all'
const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide'

const DEFAULT_CFG = {
  dias_uteis_mes: 22,
  inss_trabalhador: 3.00,
  inss_entidade: 4.00,
  calcular_irps: true,
  componentes: [],
}

const COMP_VAZIO = { nome: '', tipo: 'bonus', percentual: false, valor: 0, obrigatorio: false }

export default function ConfiguracaoSalarial() {
  const [cfg, setCfg] = useState(DEFAULT_CFG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')
  const [novoComp, setNovoComp] = useState({ ...COMP_VAZIO })
  const [showAddComp, setShowAddComp] = useState(false)

  useEffect(() => {
    api.get('/rh/configuracao')
      .then(r => {
        const d = r.data
        setCfg({
          dias_uteis_mes: d.dias_uteis_mes ?? 22,
          inss_trabalhador: d.inss_trabalhador ?? 3,
          inss_entidade: d.inss_entidade ?? 4,
          calcular_irps: !!d.calcular_irps,
          componentes: Array.isArray(d.componentes) ? d.componentes : [],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setErro('')
    setOk(false)
    try {
      const r = await api.put('/rh/configuracao', {
        ...cfg,
        calcular_irps: cfg.calcular_irps ? 1 : 0,
      })
      const d = r.data
      setCfg({
        dias_uteis_mes: d.dias_uteis_mes ?? 22,
        inss_trabalhador: d.inss_trabalhador ?? 3,
        inss_entidade: d.inss_entidade ?? 4,
        calcular_irps: !!d.calcular_irps,
        componentes: Array.isArray(d.componentes) ? d.componentes : [],
      })
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err) {
      setErro(err.message || 'Erro ao guardar configuração.')
    } finally {
      setSaving(false)
    }
  }

  const adicionarComponente = () => {
    if (!novoComp.nome.trim()) return
    const comp = { ...novoComp, id: `c_${Date.now()}`, valor: parseFloat(novoComp.valor) || 0 }
    set('componentes', [...cfg.componentes, comp])
    setNovoComp({ ...COMP_VAZIO })
    setShowAddComp(false)
  }

  const removerComponente = (id) => {
    set('componentes', cfg.componentes.filter(c => c.id !== id))
  }

  const toggleObrigatorio = (id) => {
    set('componentes', cfg.componentes.map(c => c.id === id ? { ...c, obrigatorio: !c.obrigatorio } : c))
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )

  const exemploCal = () => {
    const base = 35000
    const diasFalta = 2
    const descFalta = (base / cfg.dias_uteis_mes) * diasFalta
    const bruto = base - descFalta
    const inss = bruto * (parseFloat(cfg.inss_trabalhador) / 100)
    const liquido = bruto - inss
    return { base, descFalta, bruto, inss, liquido }
  }
  const ex = exemploCal()
  const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Configuração Salarial"
        subtitle="Personalize a fórmula de cálculo dos salários e defina componentes fixos"
      />

      {ok && (
        <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Configuração guardada com sucesso.
        </div>
      )}
      {erro && (
        <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{erro}
        </div>
      )}

      <div className="space-y-6">
        {/* Parâmetros base */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            Parâmetros Base
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Dias úteis por mês</label>
              <input type="number" min="1" max="31" value={cfg.dias_uteis_mes}
                onChange={e => set('dias_uteis_mes', Number(e.target.value))} className={inputCls} />
              <p className="text-xs text-on-surface-variant mt-1">Para cálculo do desconto por falta</p>
            </div>
            <div>
              <label className={labelCls}>INSS Trabalhador (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={cfg.inss_trabalhador}
                onChange={e => set('inss_trabalhador', e.target.value)} className={inputCls} />
              <p className="text-xs text-on-surface-variant mt-1">Desconto no salário do colaborador</p>
            </div>
            <div>
              <label className={labelCls}>INSS Entidade (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={cfg.inss_entidade}
                onChange={e => set('inss_entidade', e.target.value)} className={inputCls} />
              <p className="text-xs text-on-surface-variant mt-1">Contribuição da instituição</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set('calcular_irps', !cfg.calcular_irps)}
                className={`w-11 h-6 rounded-full transition-colors relative ${cfg.calcular_irps ? 'bg-primary' : 'bg-outline-variant'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${cfg.calcular_irps ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-on-surface">Aplicar IRPS progressivo</span>
              <span className="text-xs text-on-surface-variant">(tabela Moçambique)</span>
            </label>
          </div>
        </div>

        {/* Fórmula visual */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-5">
          <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
            Fórmula Salarial
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-outline-variant font-semibold">Salário Base</span>
            <span className="text-on-surface-variant">−</span>
            <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg">Desconto Faltas ({cfg.dias_uteis_mes}d/mês)</span>
            <span className="text-on-surface-variant">+</span>
            <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg">Bónus / Subsídios</span>
            <span className="text-on-surface-variant">−</span>
            <span className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg">INSS ({cfg.inss_trabalhador}%)</span>
            {cfg.calcular_irps && <>
              <span className="text-on-surface-variant">−</span>
              <span className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg">IRPS Progressivo</span>
            </>}
            <span className="text-on-surface-variant">=</span>
            <span className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-bold">Salário Líquido</span>
          </div>

          {/* Exemplo */}
          <div className="mt-4 bg-white rounded-xl p-4 border border-outline-variant text-xs">
            <p className="font-semibold text-on-surface mb-2">Exemplo com salário base de 35.000 MT e 2 dias de falta:</p>
            <div className="space-y-1 text-on-surface-variant">
              <div className="flex justify-between"><span>Salário Base</span><span className="font-mono">{fmt(ex.base)} MT</span></div>
              <div className="flex justify-between text-red-600"><span>− Desconto faltas (2 × {fmt(ex.base / cfg.dias_uteis_mes)} MT)</span><span className="font-mono">− {fmt(ex.descFalta)} MT</span></div>
              <div className="flex justify-between font-semibold text-on-surface border-t border-outline-variant pt-1"><span>= Bruto após faltas</span><span className="font-mono">{fmt(ex.bruto)} MT</span></div>
              <div className="flex justify-between text-orange-600"><span>− INSS trabalhador ({cfg.inss_trabalhador}%)</span><span className="font-mono">− {fmt(ex.inss)} MT</span></div>
              <div className="flex justify-between font-bold text-primary border-t border-outline-variant pt-1"><span>= Salário Líquido (sem IRPS)</span><span className="font-mono">{fmt(ex.liquido)} MT</span></div>
            </div>
          </div>
        </div>

        {/* Componentes personalizáveis */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
              Componentes Salariais
            </h3>
            <button onClick={() => setShowAddComp(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Adicionar
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mb-4">
            Componentes <b>obrigatórios</b> são aplicados automaticamente a todos os funcionários ao gerar a folha.
            Os não-obrigatórios podem ser adicionados manualmente por funcionário.
          </p>

          {cfg.componentes.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl mb-2 block">playlist_add</span>
              <p className="text-sm">Nenhum componente configurado.</p>
              <p className="text-xs mt-1">Ex: Subsídio Alimentação, Bónus Desempenho, Quota Sindical...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cfg.componentes.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant bg-surface-bright">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.tipo === 'bonus' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{c.nome}</p>
                    <p className="text-xs text-on-surface-variant">
                      {c.tipo === 'bonus' ? 'Bónus/Subsídio' : 'Dedução'} ·{' '}
                      {c.percentual ? `${c.valor}% do salário base` : `${fmt(c.valor)} MT fixo`}
                    </p>
                  </div>
                  <button onClick={() => toggleObrigatorio(c.id)}
                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-colors ${
                      c.obrigatorio ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}>
                    {c.obrigatorio ? 'Obrigatório' : 'Opcional'}
                  </button>
                  <button onClick={() => removerComponente(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddComp && (
            <div className="mt-4 p-4 rounded-xl bg-surface-bright border border-outline-variant space-y-3">
              <h4 className="text-sm font-semibold text-on-surface">Novo componente</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Nome</label>
                  <input value={novoComp.nome} onChange={e => setNovoComp(c => ({ ...c, nome: e.target.value }))}
                    placeholder="Ex: Subsídio Alimentação" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Tipo</label>
                  <select value={novoComp.tipo} onChange={e => setNovoComp(c => ({ ...c, tipo: e.target.value }))} className={inputCls}>
                    <option value="bonus">Bónus / Subsídio (+)</option>
                    <option value="deducao">Dedução / Desconto (−)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cálculo</label>
                  <select value={novoComp.percentual ? 'pct' : 'fixo'} onChange={e => setNovoComp(c => ({ ...c, percentual: e.target.value === 'pct' }))} className={inputCls}>
                    <option value="fixo">Valor fixo (MT)</option>
                    <option value="pct">Percentagem do salário base</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{novoComp.percentual ? 'Percentagem (%)' : 'Valor (MT)'}</label>
                  <input type="number" min="0" step={novoComp.percentual ? '0.01' : '1'}
                    value={novoComp.valor} onChange={e => setNovoComp(c => ({ ...c, valor: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={novoComp.obrigatorio}
                      onChange={e => setNovoComp(c => ({ ...c, obrigatorio: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary" />
                    Aplicar automaticamente a todos
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddComp(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-outline-variant hover:bg-white">Cancelar</button>
                <button onClick={adicionarComponente}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary text-on-primary font-semibold">Adicionar</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {saving
              ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A guardar...</>
              : <><span className="material-symbols-outlined text-[18px]">save</span>Guardar Configuração</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
