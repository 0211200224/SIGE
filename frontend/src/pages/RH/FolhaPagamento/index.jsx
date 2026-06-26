import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ESTADO_CONFIG = {
  rascunho:   { label: 'Rascunho',   badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', icon: 'edit_note' },
  processado: { label: 'Processado', badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400',   icon: 'pending_actions' },
  pago:       { label: 'Pago',       badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: 'check_circle' },
}

function fmt(v) {
  return parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
}

export default function FolhaPagamento() {
  const navigate = useNavigate()
  const hoje = new Date()
  const [folhas, setFolhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [erro, setErro] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const carregar = () => {
    setLoading(true)
    api.get('/rh/folhas')
      .then(r => setFolhas(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []))
      .catch(() => setFolhas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const gerarFolha = async () => {
    setGerando(true)
    setErro('')
    try {
      const r = await api.post('/rh/folhas', { mes, ano })
      navigate(`/rh/folha-pagamento/${r.data.id}`)
    } catch (err) {
      setErro(err.message || 'Erro ao gerar folha.')
    } finally { setGerando(false) }
  }

  // Mapa rápido de folha por "ano-mes"
  const folhaMap = {}
  folhas.forEach(f => { folhaMap[`${f.ano}-${String(f.mes).padStart(2, '0')}`] = f })

  // Estado do mês actual
  const chaveActual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const folhaActual = folhaMap[chaveActual]

  // Anos com registos + ano corrente
  const anosComRegistos = [...new Set(folhas.map(f => f.ano)), hoje.getFullYear()].sort((a, b) => b - a)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Folha de Pagamento"
        subtitle="Processamento salarial mensal"
        action={
          <button onClick={() => setMostrarForm(f => !f)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Processamento
          </button>
        }
      />

      {/* Banner mês actual */}
      <div className={`mb-6 rounded-2xl border p-5 flex items-center justify-between gap-4 ${
        folhaActual
          ? folhaActual.estado === 'pago' ? 'bg-green-50 border-green-200' : folhaActual.estado === 'processado' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
          : 'bg-surface-bright border-outline-variant'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            folhaActual
              ? folhaActual.estado === 'pago' ? 'bg-green-100' : folhaActual.estado === 'processado' ? 'bg-blue-100' : 'bg-yellow-100'
              : 'bg-surface border border-outline-variant'
          }`}>
            <span className={`material-symbols-outlined text-[24px] ${
              folhaActual
                ? folhaActual.estado === 'pago' ? 'text-green-600' : folhaActual.estado === 'processado' ? 'text-blue-600' : 'text-yellow-600'
                : 'text-on-surface-variant'
            }`}>
              {folhaActual ? ESTADO_CONFIG[folhaActual.estado]?.icon : 'calendar_month'}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Mês Actual</p>
            <p className="font-bold text-on-surface text-lg">{MESES_FULL[hoje.getMonth()]} {hoje.getFullYear()}</p>
            {folhaActual
              ? <p className="text-sm text-on-surface-variant mt-0.5">
                  {folhaActual.total_funcionarios} funcionário(s) · Líquido: <span className="font-semibold">{fmt(folhaActual.total_liquido)} MT</span>
                </p>
              : <p className="text-sm text-on-surface-variant mt-0.5">Ainda não foi processada este mês</p>
            }
          </div>
        </div>
        <div className="flex-shrink-0">
          {folhaActual ? (
            <button onClick={() => navigate(`/rh/folha-pagamento/${folhaActual.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-outline-variant text-sm font-semibold text-on-surface hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Ver Folha
            </button>
          ) : (
            <button onClick={() => { setMes(hoje.getMonth() + 1); setAno(hoje.getFullYear()); setMostrarForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:-translate-y-0.5 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              Processar Agora
            </button>
          )}
        </div>
      </div>

      {/* Formulário de gerar */}
      {mostrarForm && (
        <div className="mb-6 bg-white rounded-2xl border border-outline-variant shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
              Gerar Nova Folha
            </h3>
            <button onClick={() => setMostrarForm(false)}>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
            </button>
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-4">
              <span className="material-symbols-outlined text-[16px]">error</span>{erro}
            </div>
          )}

          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Mês</label>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
                {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Ano</label>
              <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))}
                className="w-24 px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none" />
            </div>
            <button onClick={gerarFolha} disabled={gerando}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
              {gerando
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A gerar...</>
                : <><span className="material-symbols-outlined text-[18px]">play_arrow</span>Gerar Rascunho</>
              }
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Só funcionários com contrato activo são incluídos. Faltas injustificadas são deduzidas automaticamente.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : folhas.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant bg-white rounded-xl border border-outline-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">payments</span>
          <p className="font-medium">Nenhuma folha processada ainda</p>
          <p className="text-sm mt-1">Use o botão "Novo Processamento" para gerar a primeira folha.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {anosComRegistos.map(anoGrid => {
            const folhasDoAno = folhas.filter(f => f.ano === anoGrid)
            if (anoGrid !== hoje.getFullYear() && folhasDoAno.length === 0) return null
            return (
              <div key={anoGrid}>
                <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">calendar_today</span>
                  {anoGrid}
                  <span className="text-xs font-normal text-on-surface-variant">
                    ({folhasDoAno.length} processamento{folhasDoAno.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {MESES.map((m, i) => {
                    const chave = `${anoGrid}-${String(i + 1).padStart(2, '0')}`
                    const f = folhaMap[chave]
                    const cfg = f ? ESTADO_CONFIG[f.estado] : null
                    const isFuturo = new Date(anoGrid, i) > hoje
                    return (
                      <button key={i}
                        onClick={() => f ? navigate(`/rh/folha-pagamento/${f.id}`) : null}
                        disabled={!f}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          f
                            ? 'bg-white border-outline-variant hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                            : isFuturo
                              ? 'bg-surface-bright border-outline-variant/50 opacity-40 cursor-default'
                              : 'bg-surface-bright border-outline-variant border-dashed cursor-default'
                        }`}
                      >
                        <p className="text-xs font-bold text-on-surface">{m}</p>
                        {f ? (
                          <>
                            <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                              {cfg.label}
                            </div>
                            <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                              {fmt(f.total_liquido).split(',')[0]} MT
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant/60 mt-1">
                            {isFuturo ? '—' : 'Não proc.'}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
