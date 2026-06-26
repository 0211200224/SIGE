import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/professor', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'As Minhas Turmas' },
  { path: '/professor/turmas', icon: 'class', label: 'Turmas Atribuídas' },
  { section: 'Avaliação' },
  { path: '/professor/notas', icon: 'grade', label: 'Lançar Notas' },
  { path: '/professor/pautas', icon: 'print', label: 'Pautas' },
  { section: 'Presenças' },
  { path: '/professor/presencas', icon: 'fact_check', label: 'Registar Presenças' },
]

export default function ProfessorLayout() {
  return (
    <PortalLayout
      title="Portal do Professor"
      icon="person"
      items={ITEMS}
    />
  )
}
