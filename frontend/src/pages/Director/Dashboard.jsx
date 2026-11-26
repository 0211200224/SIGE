import { useState, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toLocaleString('pt-MZ')
const fmtMT  = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Cores validadas (distinguíveis também para daltónicos) e sempre
// acompanhadas de rótulo e valor -- a cor nunca fala sozinha.
const COR = {
  pago:     { forte: '#008a17', clara: '#4ade80' },
  divida:   { forte: '#e24d4e', clara: '#fca5a5' },
  pendente: { forte: '#f59e0b', clara: '#fcd34d' },
  azul:     { forte: '#257de0', clara: '#93c5fd' },
}

// ─── Anel decorado (gradiente, faixa suave, contagem animada) ─────────────────
function Anel({ percent = 0, cor, label, sub, icon, centro }) {
  const gid = useId().replace(/:/g, '')
  const [visto, setVisto] = useState(0)
  const p = Math.min(Math.max(Number(percent) || 0, 0), 100)
  const r = 50
  const c = 2 * Math.PI * r

  useEffect(() => {
    let inicio = null, raf
    const passo = (ts) => {
      if (!inicio) inicio = ts
      const t = Math.min((ts - inicio) / 1100, 1)
      setVisto(p * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [p])

  return (
    <div className="flex flex-col items-center text-center min-w-0">
      <div className="relative w-[96px] h-[96px] sm:w-[118px] sm:h-[118px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" role="img" aria-label={`${label}: ${Math.round(p)}%`}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={cor.clara} />
              <stop offset="100%" stopColor={cor.forte} />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke={cor.clara} strokeOpacity="0.22" strokeWidth="11" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - visto / 100)}
            style={{ filter: `drop-shadow(0 2px 3px ${cor.forte}40)` }} />
        </svg>
        <div className="absolute inset-[18%] rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[16px] leading-none" style={{ color: cor.forte }}>{icon}</span>
          <span className="text-lg sm:text-xl font-bold text-on-surface leading-tight tabular-nums">
            {centro ?? <>{Math.round(visto)}<span className="text-[11px] font-semibold text-on-surface-variant">%</span></>}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-on-surface mt-2.5">{label}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── Pizza financeira: pago (verde) | dívida vencida (vermelho) | pendente (laranja)
const rotuloFatia = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const RAD = Math.PI / 180
  const raio = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + raio * Math.cos(-midAngle * RAD)
  const y = cy + raio * Math.sin(-midAngle * RAD)
  return (
    <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

function TooltipPizza({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-outline-variant rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-on-surface">{d.nome}</p>
      <p className="tabular-nums">{fmtMT(d.valor)} MT</p>
    </div>
  )
}

function PizzaFinanceira({ pago, vencida, pendente }) {
  const fatias = [
    { nome: 'Pago', valor: pago, cor: COR.pago.forte, desc: 'Já recebido' },
    { nome: 'Dívida vencida', valor: vencida, cor: COR.divida.forte, desc: 'Prazo já passou' },
    { nome: 'Pendente', valor: pendente, cor: COR.pendente.forte, desc: 'Ainda dentro do prazo' },
  ]
  const total = pago + vencida + pendente
  if (total === 0) return (
    <div className="h-56 flex flex-col items-center justify-center gap-2">
      <span className="material-symbols-outlined text-[36px] text-outline-variant">pie_chart</span>
      <p className="text-sm text-on-surface-variant">Ainda sem movimentos financeiros</p>
    </div>
  )

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="w-[210px] h-[210px] flex-shrink-0 relative">
        <div className="absolute inset-3 rounded-full bg-surface-container-low blur-md opacity-60" aria-hidden="true" />
        <ResponsiveContainer>
          <PieChart>
            <Pie data={fatias.filter(f => f.valor > 0)} dataKey="valor" nameKey="nome" cx="50%" cy="50%"
              outerRadius={98} startAngle={90} endAngle={-270} stroke="#ffffff" strokeWidth={3}
              labelLine={false} label={rotuloFatia} isAnimationActive>
              {fatias.filter(f => f.valor > 0).map(f => <Cell key={f.nome} fill={f.cor} />)}
            </Pie>
            <Tooltip content={<TooltipPizza />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {fatias.map(f => (
          <div key={f.nome} className="flex items-center gap-3 rounded-xl border border-outline-variant px-3 py-2.5">
            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-4" style={{ backgroundColor: f.cor, '--tw-ring-color': `${f.cor}26` }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-on-surface">{f.nome}</p>
              <p className="text-[10px] text-on-surface-variant">{f.desc}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-on-surface tabular-nums">{fmtMT(f.valor)} MT</p>
              <p className="text-[10px] text-on-surface-variant tabular-nums">{total > 0 ? Math.round((f.valor * 100) / total) : 0}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function Kpi({ label, value, icon, iconColor, sub, to, alert }) {
  const body = (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all h-full flex flex-col justify-between ${
      alert ? 'border-red-200' : 'border-outline-variant'
    }`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor.bg}`}>
          <span className={`material-symbols-outlined text-[22px] ${iconColor.text}`}>{icon}</span>
        </div>
        {alert && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[12px]">warning</span>
            Atenção
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-on-surface tracking-tight">{value ?? '—'}</p>
        <p className="text-sm text-on-surface-variant mt-1">{label}</p>
        {sub && <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
  return to
    ? <Link to={to} className="block">{body}</Link>
    : body
}

// ─── Alert pill ───────────────────────────────────────────────────────────────
function AlertItem({ icon, label, value, color, to }) {
  const inner = (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color.border} ${color.bg}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.iconBg}`}>
        <span className={`material-symbols-outlined text-[18px] ${color.iconText}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${color.text}`}>{value}</p>
        <p className="text-xs text-on-surface-variant truncate">{label}</p>
      </div>
      {to && <span className={`material-symbols-outlined text-[16px] ${color.iconText}`}>arrow_forward</span>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ icon, label, iconColor, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
        <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">{label}</h2>
      </div>
      {action}
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function DashboardExecutivo() {
  const { user, escola } = useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/diretor/dashboard')
      .then(r => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hora      = new Date().getHours()
  const saudacao  = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const cor       = escola?.cor_principal || '#1a2b4b'
  const dataHoje  = new Date().toLocaleDateString('pt-MZ', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined animate-spin text-[40px]" style={{ color: cor }}>progress_activity</span>
        <p className="text-sm text-on-surface-variant">A carregar dados...</p>
      </div>
    </div>
  )

  const ac = data?.academicos    || {}
  const fi = data?.financeiros   || {}
  const rh = data?.rh            || {}
  const ad = data?.administrativos || {}

  const receita  = Number(fi.receita  || 0)
  const pendente = Number(fi.pendente || 0)
  const total    = receita + pendente
  const pctRisco = ac.total_alunos > 0
    ? Math.round((ac.alunos_risco / ac.total_alunos) * 100)
    : 0
  const taxaCobranca = total > 0 ? (receita * 100) / total : 0

  // Alertas dinâmicos — só aparecem quando há algo a resolver
  const alertas = [
    fi.inadimplentes > 0 && {
      icon: 'account_balance_wallet', label: 'Alunos com pagamentos em falta',
      value: `${fi.inadimplentes} inadimplente${fi.inadimplentes > 1 ? 's' : ''}`,
      color: { border:'border-red-200', bg:'bg-red-50', iconBg:'bg-red-100', iconText:'text-red-600', text:'text-red-800' },
      to: '/financeiro',
    },
    rh.contratos_vencer > 0 && {
      icon: 'description', label: 'Contratos a vencer nos próximos 30 dias',
      value: `${rh.contratos_vencer} contrato${rh.contratos_vencer > 1 ? 's' : ''}`,
      color: { border:'border-amber-200', bg:'bg-amber-50', iconBg:'bg-amber-100', iconText:'text-amber-600', text:'text-amber-800' },
      to: '/rh/funcionarios',
    },
    ac.alunos_risco > 0 && {
      icon: 'person_alert', label: 'Alunos com frequência abaixo do mínimo',
      value: `${ac.alunos_risco} aluno${ac.alunos_risco > 1 ? 's' : ''} em risco`,
      color: { border:'border-orange-200', bg:'bg-orange-50', iconBg:'bg-orange-100', iconText:'text-orange-600', text:'text-orange-800' },
      to: '/secretaria/alunos',
    },
  ].filter(Boolean)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: cor }}>
        {/* Geometric decoration */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 right-32  w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-3 right-72     w-20 h-20 rounded-full bg-white/5" />

        <div className="relative z-10 px-4 sm:px-7 py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left */}
          <div>
            <p className="text-white/60 text-sm font-medium">{saudacao},</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{user?.nome}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="text-white/55 text-xs">{escola?.nome}</span>
              <span className="text-white/25 hidden sm:inline">·</span>
              <span className="text-white/55 text-xs capitalize">{dataHoje}</span>
              {escola?.ano_lectivo && (
                <>
                  <span className="text-white/25 hidden sm:inline">·</span>
                  <span className="text-white/55 text-xs">Ano Lectivo {escola.ano_lectivo}</span>
                </>
              )}
            </div>
          </div>

          {/* Right — mini stats */}
          <div className="flex flex-wrap items-stretch gap-0 bg-white/10 rounded-xl overflow-hidden flex-shrink-0 w-full sm:w-auto">
            {[
              { label: 'Alunos',  value: fmtNum(ac.total_alunos),         icon: 'school' },
              { label: 'Turmas',  value: fmtNum(ac.total_turmas),          icon: 'class' },
              { label: 'Staff',   value: fmtNum(rh.funcionarios_ativos),   icon: 'badge' },
              { label: 'Matriculados', value: fmtNum(ad.matriculas),         icon: 'how_to_reg' },
            ].map((s, i) => (
              <div key={s.label} className={`w-1/2 sm:w-auto px-3 sm:px-5 py-3 text-center ${i > 0 ? 'border-l border-white/15' : ''} ${i > 1 ? 'border-t border-white/15 sm:border-t-0' : ''}`}>
                <span className="material-symbols-outlined text-white/50 text-[14px] block mb-0.5">{s.icon}</span>
                <p className="text-xl font-bold text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total de Alunos" value={fmtNum(ac.total_alunos)}
          icon="school" to="/secretaria/alunos"
          iconColor={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          sub={`${ac.total_turmas ?? 0} turma${ac.total_turmas !== 1 ? 's' : ''} activa${ac.total_turmas !== 1 ? 's' : ''}`} />
        <Kpi label="Receita Arrecadada" value={`${fmtMT(receita)} MT`}
          icon="payments" to="/financeiro"
          iconColor={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
          sub={pendente > 0 ? `+ ${fmtMT(pendente)} MT pendente` : 'Sem pendências'}
          alert={fi.inadimplentes > 0} />
        <Kpi label="Funcionários Activos" value={fmtNum(rh.funcionarios_ativos)}
          icon="badge" to="/rh/funcionarios"
          iconColor={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          sub={rh.contratos_vencer > 0 ? `${rh.contratos_vencer} contrato(s) a vencer` : 'Contratos em ordem'}
          alert={rh.contratos_vencer > 0} />
        <Kpi label="Dívida em Aberto" value={`${fmtMT(pendente)} MT`}
          icon="money_off" to="/financeiro/dividas"
          iconColor={{ bg: 'bg-red-50', text: 'text-red-600' }}
          sub={pendente > 0 ? `${fmtNum(fi.inadimplentes)} devedor(es) · ${fmtMT(fi.divida_vencida)} MT vencida` : 'Sem dívidas'}
          alert={fi.divida_vencida > 0} />
      </div>

      {/* ── ACADÉMICO + FINANCEIRO ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Académico — anéis */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <SectionTitle icon="school" label="Desempenho Académico"
            iconColor="text-indigo-600"
            action={
              <Link to="/diretor/indicadores" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver detalhes <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-2 py-2">
            <Anel percent={ac.taxa_aprovacao} cor={COR.pago} icon="task_alt" label="Aprovação"
              sub={ac.alunos_avaliados > 0 ? `${ac.alunos_aprovados} de ${ac.alunos_avaliados} alunos` : 'Sem notas ainda'} />
            <Anel percent={ac.taxa_reprovacao} cor={COR.divida} icon="cancel" label="Reprovação"
              sub={ac.alunos_avaliados > 0 ? `${ac.alunos_reprovados} aluno(s)` : 'Sem notas ainda'} />
            <Anel percent={ac.frequencia_media} cor={COR.azul} icon="how_to_reg" label="Frequência"
              sub={ac.frequencia_media >= 75 ? 'Dentro do mínimo' : 'Abaixo do mínimo'} />
            <Anel percent={pctRisco} cor={COR.pendente} icon="person_alert" label="Alunos em risco"
              sub={`${fmtNum(ac.alunos_risco)} aluno(s)`} />
          </div>
        </div>

        {/* Financeiro — pizza */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <SectionTitle icon="payments" label="Saúde Financeira"
            iconColor="text-emerald-600"
            action={
              <Link to="/financeiro" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver portal <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            }
          />
          <PizzaFinanceira pago={receita} vencida={Number(fi.divida_vencida || 0)} pendente={Number(fi.divida_por_vencer || 0)} />
          {total > 0 && (
            <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">{fmtNum(fi.inadimplentes)} aluno(s) com dívida</span>
              <span className="text-on-surface-variant">Taxa de cobrança <b className="text-on-surface text-sm tabular-nums">{Math.round(taxaCobranca)}%</b></span>
            </div>
          )}
        </div>
      </div>

      {/* ── RH + ALERTAS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* RH */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <SectionTitle icon="badge" label="Recursos Humanos"
            iconColor="text-blue-600"
            action={
              <Link to="/rh" className="text-xs text-primary hover:underline flex items-center gap-1">
                Portal RH <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Funcionários activos', value: rh.funcionarios_ativos ?? 0,
                icon: 'badge', c: 'text-blue-700', bg: 'bg-blue-50/60', border: 'border-blue-100' },
              { label: 'Contratos a vencer', value: rh.contratos_vencer ?? 0,
                icon: 'description', c: rh.contratos_vencer > 0 ? 'text-amber-700' : 'text-on-surface-variant',
                bg: rh.contratos_vencer > 0 ? 'bg-amber-50/60' : 'bg-surface-bright', border: rh.contratos_vencer > 0 ? 'border-amber-100' : 'border-outline-variant' },
              { label: 'Faltas nos últimos 30 dias', value: rh.faltas_mes ?? 0,
                icon: 'event_busy', c: rh.faltas_mes > 5 ? 'text-red-700' : 'text-on-surface-variant',
                bg: rh.faltas_mes > 5 ? 'bg-red-50/60' : 'bg-surface-bright', border: rh.faltas_mes > 5 ? 'border-red-100' : 'border-outline-variant' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 text-center`}>
                <span className={`material-symbols-outlined text-[20px] ${s.c} mb-2 block`}>{s.icon}</span>
                <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Folha salarial status */}
          <Link to="/rh/folha-pagamento"
            className="mt-4 flex items-center justify-between gap-3 bg-surface-bright rounded-xl px-4 py-3 border border-outline-variant hover:border-primary/30 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">payments</span>
              <div className="min-w-0">
                <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Folha de Pagamento</span>
                {rh.ultima_folha && (
                  <p className="text-[11px] text-on-surface-variant">
                    Última: {MESES_CURTOS[rh.ultima_folha.mes - 1]} {rh.ultima_folha.ano} · <b className="text-on-surface tabular-nums">{fmtMT(rh.ultima_folha.total_liquido)} MT</b> · {rh.ultima_folha.estado}
                  </p>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
          </Link>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <SectionTitle icon="notification_important" label="Itens que Requerem Atenção"
            iconColor="text-red-500"
            action={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                alertas.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {alertas.length > 0 ? `${alertas.length} alerta${alertas.length > 1 ? 's' : ''}` : 'Tudo em ordem'}
              </span>
            }
          />

          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-[28px]">check_circle</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-on-surface">Sem alertas activos</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Todos os indicadores dentro dos parâmetros</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alertas.map((a, i) => (
                <AlertItem key={i} {...a} />
              ))}
            </div>
          )}

          {/* Admin quick links */}
          <div className="mt-4 pt-4 border-t border-outline-variant flex gap-2 flex-wrap">
            <Link to="/diretor/aprovacoes"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">approval</span>Aprovações
            </Link>
            <span className="text-outline-variant">·</span>
            <Link to="/diretor/auditoria"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">history</span>Auditoria
            </Link>
            <span className="text-outline-variant">·</span>
            <Link to="/diretor/utilizadores"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[14px]">manage_accounts</span>Utilizadores
            </Link>
          </div>
        </div>
      </div>

      {/* ── ACESSO RÁPIDO ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Acesso Rápido</h2>
          <p className="text-[11px] text-on-surface-variant">Todos os portais e secções</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/secretaria',            icon: 'desk',               label: 'Secretaria',         c: 'text-sky-700     bg-sky-50     border-sky-200'     },
            { to: '/pedagogico',            icon: 'menu_book',          label: 'Pedagógico',         c: 'text-teal-700    bg-teal-50    border-teal-200'    },
            { to: '/rh',                    icon: 'groups',             label: 'Recursos Humanos',   c: 'text-blue-700    bg-blue-50    border-blue-200'    },
            { to: '/financeiro',            icon: 'account_balance',    label: 'Financeiro',         c: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { to: '/diretor/indicadores',   icon: 'bar_chart',          label: 'Indicadores',        c: 'text-indigo-700  bg-indigo-50  border-indigo-200'  },
            { to: '/diretor/politicas/academicas', icon: 'policy',      label: 'Políticas',          c: 'text-violet-700  bg-violet-50  border-violet-200'  },
            { to: '/diretor/relatorios',    icon: 'analytics',          label: 'Relatórios',         c: 'text-purple-700  bg-purple-50  border-purple-200'  },
          ].map(({ to, icon, label, c }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold hover:-translate-y-0.5 transition-all ${c}`}>
              <span className="material-symbols-outlined text-[15px]">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
