import PageHeader from './PageHeader'

export default function ComingSoon({ title, subtitle, icon = 'construction', features = [] }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-10 flex flex-col items-center text-center">
        <span className="material-symbols-outlined text-5xl text-secondary mb-4">{icon}</span>
        <h3 className="text-lg font-semibold text-on-surface mb-2">Módulo em Implementação</h3>
        <p className="text-sm text-on-surface-variant max-w-sm mb-6">
          Esta secção está a ser desenvolvida. Em breve estará disponível com todas as funcionalidades.
        </p>
        {features.length > 0 && (
          <div className="w-full max-w-sm text-left">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Funcionalidades previstas:</p>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
