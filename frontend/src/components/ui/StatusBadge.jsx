const VARIANTS = {
  activo:     'bg-green-100 text-green-700',
  inactivo:   'bg-surface-container-highest text-on-surface-variant',
  pendente:   'bg-yellow-100 text-yellow-700',
  aprovado:   'bg-green-100 text-green-700',
  rejeitado:  'bg-red-100 text-red-700',
  publicado:  'bg-blue-100 text-blue-700',
  rascunho:   'bg-surface-container-highest text-on-surface-variant',
  pago:       'bg-green-100 text-green-700',
  em_divida:  'bg-red-100 text-red-700',
  matriculado:'bg-blue-100 text-blue-700',
  transferido:'bg-purple-100 text-purple-700',
  desistente: 'bg-orange-100 text-orange-700',
}

export default function StatusBadge({ status, label }) {
  const cls = VARIANTS[status] || 'bg-surface-container-highest text-on-surface-variant'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label || status}
    </span>
  )
}
