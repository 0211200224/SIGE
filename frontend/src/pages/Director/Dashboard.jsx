import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toLocaleString('pt-MZ')
const fmtMT  = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function lerp(a, b, t) { return a + (b - a) * t }

// ─── Animated SVG Ring ────────────────────────────────────────────────────────
function Ring({ value = 0, size = 120, stroke = 11, color, track = '#f1f5f9', label, sub, warn = false }) {
  const [displayed, setDisplayed] = useState(0)
  const r  = (size - stroke) / 2
  const c  = 2 * Math.PI * r
  const v  = Math.min(Math.max(value, 0), 100)

  useEffect(() => {
    let start = null
    const dur = 1200
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplayed(lerp(0, v, ease))
      if (p < 1) requestAnimationFrame(step)
    }
    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [v])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
            strokeWidth={stroke} strokeDasharray={c}
            strokeDashoffset={c * (1 - displayed / 100)}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none" style={{ color }}>
            {Math.round(displayed)}
            <span className="text-sm font-semibold">%</span>
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-on-surface">{label}</p>
        {sub && <p className="text-[11px] text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Donut financeiro ─────────────────────────────────────────────────────────
const ActiveShape = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent }) => (
  <g>
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
      startAngle={startAngle} endAngle={endAngle} fill={fill} />
    <Sector cx={cx} cy={cy} innerRadius={innerRadius - 5} outerRadius={innerRadius - 2}
      startAngle={startAngle} endAngle={endAngle} fill={fill} />
    <text x={cx} y={cy - 10} textAnchor="middle" fill="#1c1b1f" fontSize={15} fontWeight="700">
      {payload.name}
    </text>
    <text x={cx} y={cy + 10} textAnchor="middle" fill="#49454f" fontSize={13}>
      {(percent * 100).toFixed(0)}%
    </text>
  </g>
)

function DonutFinanceiro({ receita, pendente }) {
  const [active, setActive] = useState(0)
  const total = receita + pendente
  const data  = [
    { name: 'Arrecadado', value: receita },
    { name: 'Pendente',   value: pendente },
  ]
  const COLORS = ['#10b981', '#f59e0b']

  if (total === 0) return (
    <div className="h-48 flex flex-col items-center justify-center gap-2">
      <span className="material-symbols-outlined text-[36px] text-outline-variant">payments</span>
      <p className="text-sm text-on-surface-variant">Sem movimentos financeiros</p>
    </div>
  )

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie activeIndex={active} activeShape={ActiveShape}
              data={data} cx="50%" cy="50%"
              innerRadius={62} outerRadius={82}
              dataKey="value"
              onMouseEnter={(_, i) => setActive(i)}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-shrink-0 space-y-3 w-40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-xs text-on-surface-variant">Arrecadado</span>
          </div>
          <p className="text-base font-bold text-emerald-700 font-mono">{fmtMT(receita)} MT</p>
        </div>
        <div className="h-px bg-outline-variant" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-xs text-on-surface-variant">Pendente</span>
          </div>
          <p className="text-base font-bold text-amber-600 font-mono">{fmtMT(pendente)} MT</p>
        </div>
        <div className="h-px bg-outline-variant" />
        <div>
          <p className="text-xs text-on-surface-variant mb-1">Total</p>
          <p className="text-base font-bold text-on-surface font-mono">{fmtMT(total)} MT</p>
        </div>
        {pendente > 0 && total > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-[11px] text-amber-700 font-medium">
              {((pendente / total) * 100).toFixed(0)}% por receber
            </p>
          </div>
        )}
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
      to: '/rh/contratos',
    },
    ac.alunos_risco > 0 && {
      icon: 'person_alert', label: 'Alunos com frequência abaixo do mínimo',
      value: `${ac.alunos_risco} aluno${ac.alunos_risco > 1 ? 's' : ''} em risco`,
      color: { border:'border-orange-200', bg:'bg-orange-50', iconBg:'bg-orange-100', iconText:'text-orange-600', text:'text-orange-800' },
      to: '/secretaria/alunos',
    },
  ].filter(Boolean)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: cor }}>
        {/* Geometric decoration */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 right-32  w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-3 right-72     w-20 h-20 rounded-full bg-white/5" />

        <div className="relative z-10 px-7 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <div className="flex items-stretch gap-0 bg-white/10 rounded-xl overflow-hidden flex-shrink-0">
            {[
              { label: 'Alunos',  value: fmtNum(ac.total_alunos),         icon: 'school' },
              { label: 'Turmas',  value: fmtNum(ac.total_turmas),          icon: 'class' },
              { label: 'Staff',   value: fmtNum(rh.funcionarios_ativos),   icon: 'badge' },
              { label: 'Matrículas', value: fmtNum(ad.matriculas),         icon: 'how_to_reg' },
            ].map((s, i) => (
              <div key={s.label} className={`px-5 py-3 text-center ${i > 0 ? 'border-l border-white/15' : ''}`}>
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
        <Kpi label="Utilizadores do Sistema" value={fmtNum(ad.utilizadores_ativos)}
          icon="manage_accounts" to="/diretor/utilizadores"
          iconColor={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
          sub="Contas com acesso activo" />
      </div>

      {/* ── CHARTS ROW ──────────────────────────────────────────── */}
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

          <div className="flex items-center justify-around gap-4 py-3">
            <Ring value={Number(ac.taxa_aprovacao || 0)} color="#10b981" track="#dcfce7"
              label="Taxa de Aprovação"
              sub={ac.taxa_aprovacao > 0 ? (ac.taxa_aprovacao >= 70 ? 'Acima da meta' : 'Abaixo da meta') : 'Sem dados'} />
            <div className="w-px h-28 bg-outline-variant/60" />
            <Ring value={Number(ac.frequencia_media || 0)} color="#6366f1" track="#e0e7ff"
              label="Frequência Média"
              sub={ac.frequencia_media >= 75 ? 'Dentro do mínimo' : 'Abaixo do mínimo'} />
            <div className="w-px h-28 bg-outline-variant/60" />
            <Ring value={pctRisco} color="#ef4444" track="#fee2e2"
              label="Alunos em Risco"
              sub={`${ac.alunos_risco ?? 0} aluno${ac.alunos_risco !== 1 ? 's' : ''}`}
              warn />
          </div>

          {/* Summary strip */}
          <div className="mt-5 pt-4 border-t border-outline-variant grid grid-cols-3 gap-4">
            {[
              { label: 'Aprovados', value: `${Number(ac.taxa_aprovacao||0).toFixed(0)}%`, color: 'text-emerald-700', dot: 'bg-emerald-500' },
              { label: 'Frequência', value: `${Number(ac.frequencia_media||0).toFixed(0)}%`, color: 'text-indigo-700', dot: 'bg-indigo-500' },
              { label: 'Reprovação', value: `${Number(ac.taxa_reprovacao||0).toFixed(0)}%`, color: 'text-red-700', dot: 'bg-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Financeiro — donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant shadow-sm p-6">
          <SectionTitle icon="payments" label="Saúde Financeira"
            iconColor="text-emerald-600"
            action={
              <Link to="/financeiro" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver portal <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            }
          />
          <DonutFinanceiro receita={receita} pendente={pendente} />
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
          <div className="grid grid-cols-3 gap-3">
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
              <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Folha de Pagamento</span>
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
        <div className="flex items-center justify-between mb-4">
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
