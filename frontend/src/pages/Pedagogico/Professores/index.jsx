import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

export default function Professores() {
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/pedagogico/professores/completo')
      .then(r => setProfessores(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Professores" subtitle="Professores registados pelo RH e as turmas atribuídas" />

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : professores.length === 0 ? (
        <EmptyState icon="person" title="Nenhum professor registado"
          description="Registe professores no portal de RH (Funcionários) para que apareçam aqui." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Cargo / Departamento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Acesso ao Sistema</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turmas Atribuídas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {professores.map(p => (
                <tr key={p.funcionario_id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.nome?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface text-sm">{p.nome}</div>
                        {p.email && <div className="text-xs text-on-surface-variant">{p.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {p.cargo_nome || '—'}{p.departamento_nome ? ` · ${p.departamento_nome}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {!p.utilizador_id ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Sem acesso</span>
                    ) : p.utilizador_activo ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700" title={p.utilizador_codigo}>
                        Activo · {p.utilizador_codigo}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Acesso revogado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.total_turmas > 0 ? (
                      <div>
                        <span className="text-xs font-semibold text-on-surface">{p.total_turmas} turma{p.total_turmas !== '1' ? 's' : ''}</span>
                        <div className="text-xs text-on-surface-variant">{p.turmas_nomes}</div>
                      </div>
                    ) : p.utilizador_id ? (
                      <span className="text-xs text-on-surface-variant">Nenhuma turma atribuída</span>
                    ) : (
                      <span className="text-xs text-on-surface-variant">Precisa de acesso ao sistema primeiro</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-outline-variant text-xs text-on-surface-variant">
            {professores.length} professor{professores.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
