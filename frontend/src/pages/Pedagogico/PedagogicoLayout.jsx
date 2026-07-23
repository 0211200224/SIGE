import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/pedagogico', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Estrutura Escolar' },
  { path: '/pedagogico/classes', icon: 'category', label: 'Classes' },
  { path: '/pedagogico/salas', icon: 'meeting_room', label: 'Salas' },
  { path: '/pedagogico/turmas', icon: 'class', label: 'Turmas' },
  { section: 'Currículo' },
  { path: '/pedagogico/disciplinas', icon: 'menu_book', label: 'Disciplinas' },
  { path: '/pedagogico/planos', icon: 'list_alt', label: 'Planos Curriculares' },
  { section: 'Docência' },
  { path: '/pedagogico/professores', icon: 'person', label: 'Professores' },
  { path: '/pedagogico/atribuicoes', icon: 'assignment_ind', label: 'Distribuição Docente' },
  { path: '/pedagogico/periodos', icon: 'date_range', label: 'Períodos Lectivos' },
  { path: '/pedagogico/avaliacoes', icon: 'quiz', label: 'Avaliações' },
  { section: 'Controlo Académico' },
  { path: '/pedagogico/validacao-notas', icon: 'fact_check', label: 'Validação de Notas' },
  { path: '/pedagogico/frequencia', icon: 'how_to_reg', label: 'Frequência' },
  { path: '/pedagogico/fecho-periodo', icon: 'lock_clock', label: 'Fecho de Período' },
  { path: '/pedagogico/conselhos', icon: 'groups', label: 'Conselhos de Classe' },
  { path: '/pedagogico/resultados', icon: 'emoji_events', label: 'Resultados Finais' },
  { section: 'Análise' },
  { path: '/pedagogico/ranking', icon: 'leaderboard', label: 'Ranking' },
  { path: '/pedagogico/relatorios', icon: 'bar_chart', label: 'Relatórios' },
]

export default function PedagogicoLayout() {
  return (
    <PortalLayout
      title="Pedagógico"
      icon="school"
      items={ITEMS}
    />
  )
}
