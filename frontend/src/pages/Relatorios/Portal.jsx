import { Link } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'

export default function RelatoriosPortal() {
  const relatorios = [
    { path: '/relatorios/academicos', icon: 'school', label: 'Relatório Académico', desc: 'Desempenho, médias e frequência por turma', color: 'bg-blue-500' },
    { path: '/relatorios/pautas', icon: 'table_chart', label: 'Pautas', desc: 'Imprimir pautas de avaliação por turma', color: 'bg-green-500' },
    { path: '/relatorios/boletins', icon: 'description', label: 'Boletins', desc: 'Gerar boletins individuais dos alunos', color: 'bg-purple-500' },
    { path: '/relatorios/financeiros', icon: 'payments', label: 'Relatório Financeiro', desc: 'Receitas, dívidas e pagamentos por período', color: 'bg-yellow-500' },
    { path: '/relatorios/rh', icon: 'groups', label: 'Relatório RH', desc: 'Funcionários, departamentos e folha salarial', color: 'bg-orange-500' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Relatórios"
        subtitle="Documentos, pautas, boletins e análises do sistema"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relatorios.map((r) => (
          <Link key={r.path} to={r.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-12 h-12 ${r.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="material-symbols-outlined text-white">{r.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{r.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{r.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[20px]">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
