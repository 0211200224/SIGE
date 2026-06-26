import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/relatorios', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Académicos' },
  { path: '/relatorios/academicos', icon: 'school', label: 'Relatório Académico' },
  { path: '/relatorios/pautas', icon: 'table_chart', label: 'Pautas' },
  { path: '/relatorios/boletins', icon: 'description', label: 'Boletins' },
  { section: 'Financeiros' },
  { path: '/relatorios/financeiros', icon: 'payments', label: 'Relatório Financeiro' },
  { section: 'Recursos Humanos' },
  { path: '/relatorios/rh', icon: 'groups', label: 'Relatório RH' },
]

export default function RelatoriosLayout() {
  return (
    <PortalLayout
      title="Relatórios"
      icon="analytics"
      items={ITEMS}
    />
  )
}
