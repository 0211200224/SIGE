import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/financeiro', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'Propinas' },
  { path: '/financeiro/planos', icon: 'receipt_long', label: 'Planos de Propinas' },
  { path: '/financeiro/cobrancas', icon: 'request_quote', label: 'Cobranças' },
  { path: '/financeiro/contas', icon: 'account_balance_wallet', label: 'Contas de Alunos' },
  { section: 'Pagamentos' },
  { path: '/financeiro/pagamentos', icon: 'payments', label: 'Registar Pagamento' },
  { path: '/financeiro/pendentes', icon: 'pending_actions', label: 'Validação de Pagamentos' },
  { path: '/financeiro/recibos', icon: 'receipt', label: 'Recibos' },
  { section: 'Controlo' },
  { path: '/financeiro/dividas', icon: 'money_off', label: 'Dívidas' },
  { path: '/financeiro/bolsas', icon: 'school', label: 'Bolsas e Descontos' },
  { path: '/financeiro/fecho', icon: 'lock_clock', label: 'Fecho Financeiro' },
  { section: 'Análise' },
  { path: '/financeiro/relatorios', icon: 'bar_chart', label: 'Relatórios' },
]

export default function FinanceiroLayout() {
  return <PortalLayout title="Financeiro" icon="payments" items={ITEMS} />
}
