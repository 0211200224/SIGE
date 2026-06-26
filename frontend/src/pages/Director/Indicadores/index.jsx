import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function GaugeBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-surface-variant rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function IndicadorCard({ title, value, icon, color, bg, sub, barColor, barMax }) {
  return (
    <div className={`${bg} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-on-surface-variant">{title}</span>
        <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      {barColor && <GaugeBar value={parseFloat(value)} max={barMax || 100} color={barColor} />}
    </div>
  )
}

export default function IndicadoresInstitucionais() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/diretor/indicadores')
      .then(r => setDados(r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
    </div>
  )

  if (!dados) return <div className="p-8 text-center text-sm text-on-surface-variant">Erro ao carregar indicadores</div>

  const gradeColor = (pct) => pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'
  const gradeBg = (pct) => pct >= 80 ? 'bg-green-50' : pct >= 60 ? 'bg-yellow-50' : 'bg-red-50'
  const gradeBar = (pct) => pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  const ap = dados.taxa_aprovacao
  const fr = dados.taxa_frequencia
  const ar = dados.taxa_arrecadacao

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Indicadores Institucionais" subtitle="Métricas de desempenho académico, financeiro e de frequência" />

      <div className="space-y-6">
        {/* Resumo visual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IndicadorCard
            title="Taxa de Aprovação" value={`${ap}%`} icon="school"
            color={gradeColor(ap)} bg={gradeBg(ap)}
            sub={`${dados.alunos_aprovados} de ${dados.total_alunos} alunos`}
            barColor={gradeBar(ap)}
          />
          <IndicadorCard
            title="Taxa de Frequência" value={`${fr}%`} icon="event_available"
            color={gradeColor(fr)} bg={gradeBg(fr)}
            sub={`${dados.presencas_dadas} de ${dados.total_presencas} presenças`}
            barColor={gradeBar(fr)}
          />
          <IndicadorCard
            title="Taxa de Arrecadação" value={`${ar}%`} icon="payments"
            color={gradeColor(ar)} bg={gradeBg(ar)}
            sub={`${Number(dados.valor_arrecadado).toLocaleString('pt-MZ')} MT arrecadados`}
            barColor={gradeBar(ar)}
          />
        </div>

        {/* Análise detalhada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Académico */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <h3 className="font-semibold text-sm text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 text-[18px]">school</span>
              Desempenho Académico
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total de alunos', value: dados.total_alunos, unit: '' },
                { label: 'Alunos aprovados', value: dados.alunos_aprovados, unit: '' },
                { label: 'Alunos reprovados', value: dados.alunos_reprovados, unit: '' },
                { label: 'Taxa de aprovação', value: `${dados.taxa_aprovacao}%`, unit: '' },
                { label: 'Taxa de reprovação', value: `${dados.taxa_reprovacao}%`, unit: '' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-outline-variant/50 last:border-0">
                  <span className="text-sm text-on-surface-variant">{label}</span>
                  <span className="text-sm font-semibold text-on-surface">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frequência */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
            <h3 className="font-semibold text-sm text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[18px]">event_available</span>
              Frequência Escolar
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total de presenças registadas', value: dados.total_presencas },
                { label: 'Presenças dadas', value: dados.presencas_dadas },
                { label: 'Faltas', value: dados.total_presencas - dados.presencas_dadas },
                { label: 'Taxa de frequência', value: `${dados.taxa_frequencia}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-outline-variant/50 last:border-0">
                  <span className="text-sm text-on-surface-variant">{label}</span>
                  <span className="text-sm font-semibold text-on-surface">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financeiro */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 md:col-span-2">
            <h3 className="font-semibold text-sm text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-600 text-[18px]">payments</span>
              Arrecadação Financeira
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total facturado (MT)', value: Number(dados.valor_total).toLocaleString('pt-MZ') },
                { label: 'Total arrecadado (MT)', value: Number(dados.valor_arrecadado).toLocaleString('pt-MZ') },
                { label: 'Taxa de arrecadação', value: `${dados.taxa_arrecadacao}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-variant rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-on-surface">{value}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="bg-surface-variant rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">info</span>
          <div className="text-xs text-on-surface-variant space-y-0.5">
            <p><span className="text-green-600 font-semibold">Verde (≥ 80%):</span> Indicador satisfatório</p>
            <p><span className="text-yellow-600 font-semibold">Amarelo (60–79%):</span> Indicador requer atenção</p>
            <p><span className="text-red-600 font-semibold">Vermelho (&lt; 60%):</span> Indicador crítico — requer acção imediata</p>
          </div>
        </div>
      </div>
    </div>
  )
}
