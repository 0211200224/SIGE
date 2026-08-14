import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const inputCls = 'w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white'
const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function Iva() {
  const [cfg, setCfg] = useState({ iva_activo: false, taxa_iva: '', iva_fonte: '' })
  const [loadingCfg, setLoadingCfg] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')

  const [dados, setDados] = useState([])
  const [loadingDados, setLoadingDados] = useState(true)
  const [filtroMes, setFiltroMes] = useState('')

  const carregarConfig = () => {
    setLoadingCfg(true)
    api.get('/financeiro/configuracao-iva')
      .then(d => setCfg({ iva_activo: !!d.iva_activo, taxa_iva: d.taxa_iva ?? '', iva_fonte: d.iva_fonte || '' }))
      .catch(() => {})
      .finally(() => setLoadingCfg(false))
  }
  useEffect(() => { carregarConfig() }, [])

  const carregarDados = () => {
    setLoadingDados(true)
    const p = new URLSearchParams()
    if (filtroMes) p.set('mes_referencia', filtroMes)
    api.get(`/financeiro/relatorios/iva_apurado?${p}`)
      .then(r => setDados(Array.isArray(r) ? r : []))
      .catch(() => setDados([]))
      .finally(() => setLoadingDados(false))
  }
  useEffect(() => { carregarDados() }, [filtroMes])

  const handleSave = async () => {
    setSaving(true); setErro(''); setOk(false)
    try {
      if (cfg.iva_activo && (!cfg.taxa_iva || parseFloat(cfg.taxa_iva) <= 0)) {
        throw new Error('Indique a taxa de IVA (%) antes de activar.')
      }
      const d = await api.put('/financeiro/configuracao-iva', {
        iva_activo: cfg.iva_activo ? 1 : 0,
        taxa_iva: cfg.taxa_iva === '' ? null : parseFloat(cfg.taxa_iva),
        iva_fonte: cfg.iva_fonte || null,
      })
      setCfg({ iva_activo: !!d.iva_activo, taxa_iva: d.taxa_iva ?? '', iva_fonte: d.iva_fonte || '' })
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err) {
      setErro(err.message || 'Erro ao guardar configuração.')
    } finally { setSaving(false) }
  }

  const totais = dados.reduce((acc, r) => ({
    base: acc.base + Number(r.total_base || 0),
    iva: acc.iva + Number(r.total_iva || 0),
    bruto: acc.bruto + Number(r.total_bruto || 0),
    n: acc.n + Number(r.num_pagamentos || 0),
  }), { base: 0, iva: 0, bruto: 0, n: 0 })

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader title="IVA" subtitle="Configuração fiscal e IVA arrecadado nas cobranças sujeitas a imposto" />

      {/* Configuração */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-8">
        <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
          Configuração
        </h3>

        {loadingCfg ? (
          <div className="flex justify-center py-6">
            <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setCfg(c => ({ ...c, iva_activo: !c.iva_activo }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${cfg.iva_activo ? 'bg-primary' : 'bg-outline-variant'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${cfg.iva_activo ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-on-surface">Aplicar IVA</span>
              </label>
              <p className="text-xs text-on-surface-variant mt-1.5 ml-14">
                Só se aplica às cobranças cujo tipo esteja explicitamente marcado como "Sujeito a IVA: Sim" em{' '}
                <a href="/financeiro/taxas" className="text-primary hover:underline font-medium">Tipos de Cobrança</a>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Taxa de IVA (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={cfg.taxa_iva}
                  onChange={e => setCfg(c => ({ ...c, taxa_iva: e.target.value }))}
                  className={inputCls} placeholder="Ex: 5.00" />
                <p className="text-xs text-on-surface-variant mt-1">Cálculo "IVA por dentro" — o preço da cobrança já inclui o IVA.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Enquadramento / Fonte</label>
                <input value={cfg.iva_fonte} onChange={e => setCfg(c => ({ ...c, iva_fonte: e.target.value }))}
                  className={inputCls} placeholder="Ex: Confirmado pela direcção da escola em..." />
                <p className="text-xs text-on-surface-variant mt-1">Registo interno de por que esta taxa está correcta (auditoria).</p>
              </div>
            </div>

            {cfg.iva_activo && cfg.taxa_iva > 0 && (
              <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs">
                <p className="font-semibold text-on-surface mb-2">Exemplo com uma cobrança de 10.000 MT:</p>
                {(() => {
                  const total = 10000
                  const base = total / (1 + parseFloat(cfg.taxa_iva) / 100)
                  const ivaVal = total - base
                  return (
                    <div className="space-y-1 text-on-surface-variant">
                      <div className="flex justify-between"><span>Base tributável</span><span className="font-mono">{fmt(base)}</span></div>
                      <div className="flex justify-between"><span>IVA ({Number(cfg.taxa_iva).toFixed(2)}%)</span><span className="font-mono">{fmt(ivaVal)}</span></div>
                      <div className="flex justify-between font-bold text-primary border-t border-primary/20 pt-1 mt-1"><span>Total cobrado</span><span className="font-mono">{fmt(total)}</span></div>
                    </div>
                  )
                })()}
              </div>
            )}

            {ok && (
              <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>Configuração guardada.
              </div>
            )}
            {erro && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>{erro}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60 hover:-translate-y-0.5 transition-all">
                <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
                {saving ? 'A guardar...' : 'Guardar Configuração'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* IVA arrecadado */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center flex-wrap gap-3 justify-between">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">summarize</span>
            IVA Arrecadado
          </h3>
          <div className="flex items-center gap-2">
            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
            {filtroMes && (
              <button onClick={() => setFiltroMes('')}
                className="px-3 py-1.5 text-sm border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container">
                Todos os períodos
              </button>
            )}
          </div>
        </div>

        {loadingDados ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : dados.length === 0 ? (
          <div className="text-center py-10 text-sm text-on-surface-variant px-4">
            Sem pagamentos sujeitos a IVA {filtroMes ? 'nesse período' : 'registados ainda'}.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-outline-variant">
              <div className="rounded-xl p-4 text-center bg-blue-50 text-blue-700">
                <p className="text-xl font-bold">{totais.n}</p>
                <p className="text-xs font-medium mt-1 opacity-80">Pagamentos c/ IVA</p>
              </div>
              <div className="rounded-xl p-4 text-center bg-gray-50 text-gray-700">
                <p className="text-xl font-bold font-mono">{fmt(totais.base)}</p>
                <p className="text-xs font-medium mt-1 opacity-80">Base Tributável</p>
              </div>
              <div className="rounded-xl p-4 text-center bg-emerald-50 text-emerald-700">
                <p className="text-xl font-bold font-mono">{fmt(totais.iva)}</p>
                <p className="text-xs font-medium mt-1 opacity-80">Total de IVA Arrecadado</p>
              </div>
              <div className="rounded-xl p-4 text-center bg-primary/10 text-primary">
                <p className="text-xl font-bold font-mono">{fmt(totais.bruto)}</p>
                <p className="text-xs font-medium mt-1 opacity-80">Total Cobrado (c/ IVA)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Pagamentos</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Base Tributável</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">IVA Arrecadado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {dados.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-container-low/40">
                      <td className="px-4 py-3 font-mono font-semibold">{r.mes_referencia || '—'}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">{r.num_pagamentos}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant font-mono">{fmt(r.total_base)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">{fmt(r.total_iva)}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary font-mono">{fmt(r.total_bruto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
