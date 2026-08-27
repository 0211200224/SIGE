import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/financeiro', icon: 'dashboard', label: 'Visão Geral', end: true },
  { path: '/financeiro/pesquisar', icon: 'person_search', label: 'Pesquisar Aluno' },
  { section: 'Propinas' },
  { path: '/financeiro/planos-mensalidades', icon: 'event_repeat', label: 'Planos de Mensalidades' },
  { path: '/financeiro/cobrancas', icon: 'request_quote', label: 'Cobranças' },
  { path: '/financeiro/contas', icon: 'account_balance_wallet', label: 'Contas de Alunos' },
  { section: 'Pagamentos' },
  { path: '/financeiro/pagamentos', icon: 'payments', label: 'Registar Pagamento' },
  { path: '/financeiro/recibos', icon: 'receipt', label: 'Recibos' },
  { section: 'Controlo' },
  { path: '/financeiro/dividas', icon: 'money_off', label: 'Dívidas' },
  { path: '/financeiro/bolsas', icon: 'school', label: 'Bolsas e Descontos' },
  { path: '/financeiro/fecho', icon: 'lock_clock', label: 'Fecho Financeiro' },
  { section: 'Análise' },
  { path: '/financeiro/relatorios', icon: 'bar_chart', label: 'Relatórios' },
  { path: '/financeiro/iva', icon: 'receipt_long', label: 'IVA' },
]

export default function FinanceiroLayout() {
  return <PortalLayout title="Financeiro" icon="payments" items={ITEMS} />
}
