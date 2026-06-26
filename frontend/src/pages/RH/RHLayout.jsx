import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/rh', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Admissão' },
  { path: '/rh/departamentos', icon: 'apartment', label: 'Departamentos' },
  { path: '/rh/cargos', icon: 'work', label: 'Cargos' },
  { path: '/rh/funcionarios', icon: 'badge', label: 'Funcionários' },
  { path: '/rh/contratos', icon: 'description', label: 'Contratos' },
  { section: 'Gestão' },
  { path: '/rh/ferias', icon: 'beach_access', label: 'Férias & Licenças' },
  { path: '/rh/faltas', icon: 'event_busy', label: 'Faltas' },
  { section: 'Financeiro' },
  { path: '/rh/folha-pagamento', icon: 'payments', label: 'Folha de Pagamento' },
  { section: 'Configuração' },
  { path: '/rh/configuracao', icon: 'tune', label: 'Fórmula Salarial' },
]

export default function RHLayout() {
  return (
    <PortalLayout
      title="Recursos Humanos"
      icon="groups"
      items={ITEMS}
    />
  )
}
