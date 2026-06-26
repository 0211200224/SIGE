export default function StatCard({ label, value, icon, color = 'text-primary', bg = 'bg-primary/10', trend, sub }) {
  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined ${color}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-on-surface-variant">{label}</p>
        <p className="text-2xl font-bold text-on-surface mt-0.5">{value ?? '—'}</p>
        {(trend !== undefined || sub) && (
          <p className="text-xs text-on-surface-variant mt-1">{sub || trend}</p>
        )}
      </div>
    </div>
  )
}
