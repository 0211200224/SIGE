import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/secretaria', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Alunos' },
  { path: '/secretaria/alunos', icon: 'groups', label: 'Lista de Alunos' },
  { path: '/secretaria/alunos/novo', icon: 'person_add', label: 'Novo Aluno' },
  { path: '/secretaria/encarregados', icon: 'supervisor_account', label: 'Encarregados' },
  { section: 'Matrículas' },
  { path: '/secretaria/matriculas', icon: 'assignment', label: 'Matrículas' },
  { path: '/secretaria/matriculas/nova', icon: 'add_circle', label: 'Nova Matrícula' },
  { path: '/secretaria/transferencias', icon: 'swap_horiz', label: 'Transferências' },
  { section: 'Organização' },
  { path: '/secretaria/turmas', icon: 'class', label: 'Turmas' },
  { section: 'Documentação' },
  { path: '/secretaria/solicitacoes', icon: 'pending_actions', label: 'Solicitações' },
  { path: '/secretaria/documentos', icon: 'folder_open', label: 'Arquivo Digital' },
  { path: '/secretaria/relatorios', icon: 'bar_chart', label: 'Relatórios' },
]

export default function SecretariaLayout() {
  return (
    <PortalLayout
      title="Secretaria"
      icon="desk"
      items={ITEMS}
    />
  )
}
