import PortalLayout from '../../components/portal/PortalLayout'

const ITEMS = [
  { path: '/estudante', icon: 'dashboard', label: 'Visão Geral', end: true },
  { section: 'O Meu Perfil' },
  { path: '/estudante/perfil', icon: 'person', label: 'Dados Pessoais' },
  { section: 'Académico' },
  { path: '/estudante/notas', icon: 'grade', label: 'Notas e Médias' },
  { path: '/estudante/presencas', icon: 'fact_check', label: 'Presenças e Faltas' },
  { path: '/estudante/boletim', icon: 'print', label: 'Boletim' },
  { section: 'Financeiro' },
  { path: '/estudante/financeiro', icon: 'payments', label: 'Situação Financeira' },
]

export default function EstudanteLayout() {
  return (
    <PortalLayout
      title="Portal do Estudante"
      icon="school"
      color="bg-teal-600"
      items={ITEMS}
      backPath="/login"
    />
  )
}
