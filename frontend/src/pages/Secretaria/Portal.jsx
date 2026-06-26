import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'

export default function SecretariaPortal() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/secretaria/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const modulos = [
    { path: '/secretaria/alunos', icon: 'groups', label: 'Lista de Alunos', desc: 'Ver e gerir todos os alunos', color: 'bg-blue-500' },
    { path: '/secretaria/alunos/novo', icon: 'person_add', label: 'Novo Aluno', desc: 'Registar um novo aluno no sistema', color: 'bg-green-500' },
    { path: '/secretaria/matriculas', icon: 'assignment', label: 'Matrículas', desc: 'Gerir matrículas por turma e ano', color: 'bg-purple-500' },
    { path: '/secretaria/transferencias', icon: 'swap_horiz', label: 'Transferências', desc: 'Gerir transferências internas e externas', color: 'bg-amber-500' },
    { path: '/secretaria/turmas', icon: 'class', label: 'Turmas', desc: 'Criar e gerir turmas da escola', color: 'bg-teal-500' },
    { path: '/secretaria/encarregados', icon: 'supervisor_account', label: 'Encarregados', desc: 'Gerir encarregados de educação', color: 'bg-cyan-500' },
    { path: '/secretaria/solicitacoes', icon: 'pending_actions', label: 'Solicitações', desc: 'Pedidos de declarações e documentos', color: 'bg-orange-500', badge: stats?.solicitacoes_pendentes },
    { path: '/secretaria/documentos', icon: 'folder_open', label: 'Arquivo Digital', desc: 'Documentação e processo dos alunos', color: 'bg-rose-500', badge: stats?.documentos_pendentes },
    { path: '/secretaria/relatorios', icon: 'bar_chart', label: 'Relatórios', desc: 'Estatísticas e relatórios académicos', color: 'bg-indigo-500' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Secretaria Académica"
        subtitle="Gestão administrativa de alunos, matrículas e documentação"
        action={
          <Link to="/secretaria/alunos/novo"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Novo Aluno
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de Alunos" value={stats?.total_alunos ?? '—'} icon="groups" color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Alunos Activos" value={stats?.alunos_activos ?? '—'} icon="how_to_reg" color="text-green-600" bg="bg-green-50" />
        <StatCard label="Solicitações" value={stats?.solicitacoes_pendentes ?? '—'} icon="pending_actions" color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Turmas" value={stats?.total_turmas ?? '—'} icon="class" color="text-purple-600" bg="bg-purple-50" />
      </div>

      {(stats?.alunos_suspensos > 0 || stats?.alunos_transferidos > 0) && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {stats?.alunos_suspensos > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
              <span className="text-amber-700 font-medium">{stats.alunos_suspensos} aluno(s) suspenso(s)</span>
            </div>
          )}
          {stats?.alunos_transferidos > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm">
              <span className="material-symbols-outlined text-blue-600 text-[18px]">swap_horiz</span>
              <span className="text-blue-700 font-medium">{stats.alunos_transferidos} aluno(s) transferido(s)</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map((m) => (
          <Link key={m.path} to={m.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center flex-shrink-0 relative`}>
              <span className="material-symbols-outlined text-white">{m.icon}</span>
              {m.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {m.badge}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] flex-shrink-0">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
