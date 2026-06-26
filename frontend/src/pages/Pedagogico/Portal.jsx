import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'

const MODULOS = [
  { path: '/pedagogico/atribuicoes', icon: 'assignment_ind', label: 'Distribuição Docente', desc: 'Atribuir professores a turmas e disciplinas', color: 'bg-blue-500' },
  { path: '/pedagogico/periodos', icon: 'date_range', label: 'Períodos Lectivos', desc: 'Gerir trimestres e exames', color: 'bg-indigo-500' },
  { path: '/pedagogico/avaliacoes', icon: 'quiz', label: 'Avaliações', desc: 'Definir estrutura e calendário de avaliações', color: 'bg-violet-500' },
  { path: '/pedagogico/validacao-notas', icon: 'fact_check', label: 'Validação de Notas', desc: 'Verificar e consolidar notas lançadas', color: 'bg-green-500' },
  { path: '/pedagogico/frequencia', icon: 'how_to_reg', label: 'Frequência', desc: 'Consolidar taxas de presença por turma', color: 'bg-teal-500' },
  { path: '/pedagogico/fecho-periodo', icon: 'lock_clock', label: 'Fecho de Período', desc: 'Encerrar períodos e bloquear edição', color: 'bg-amber-500' },
  { path: '/pedagogico/conselhos', icon: 'groups', label: 'Conselhos de Classe', desc: 'Registar análise e decisões pedagógicas', color: 'bg-orange-500' },
  { path: '/pedagogico/resultados', icon: 'emoji_events', label: 'Resultados Finais', desc: 'Aprovados, reprovados e exames', color: 'bg-red-500' },
  { path: '/pedagogico/planos', icon: 'list_alt', label: 'Planos Curriculares', desc: 'Definir disciplinas por classe', color: 'bg-cyan-500' },
  { path: '/pedagogico/relatorios', icon: 'bar_chart', label: 'Relatórios', desc: 'Desempenho, frequência e resultados', color: 'bg-purple-500' },
]

export default function PedagogicoPortal() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/pedagogico/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const s = stats || {}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Coordenação Pedagógica"
        subtitle="Gestão académica, curricular e validação de resultados"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Turmas Activas" value={s.total_turmas ?? '—'} icon="class" color="text-green-600" bg="bg-green-50" />
        <StatCard label="Professores" value={s.total_professores ?? '—'} icon="person_play" color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Períodos Abertos" value={s.periodos_abertos ?? '—'} icon="date_range" color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard label="Resultados Pendentes" value={s.resultados_pendentes ?? '—'} icon="pending_actions" color="text-amber-600" bg="bg-amber-50" />
      </div>

      {s.resultados_pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-500">warning</span>
          <p className="text-sm text-amber-700 font-medium">{s.resultados_pendentes} aluno(s) com resultados por calcular.</p>
          <Link to="/pedagogico/resultados" className="ml-auto text-xs text-amber-700 font-semibold underline">Ver Resultados</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS.map(m => (
          <Link key={m.path} to={m.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-11 h-11 ${m.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="material-symbols-outlined text-white text-[20px]">{m.icon}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[18px] flex-shrink-0">chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
