import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

export default function EstudantePresencas() {
  const [presencas, setPresencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    api.get('/estudante/presencas')
      .then(r => setPresencas(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const total = presencas.length
  const presentes = presencas.filter(p => p.presente).length
  const faltas = total - presentes
  const faltasInjustificadas = presencas.filter(p => !p.presente && !p.justificada).length
  const taxaPresenca = total ? Math.round((presentes / total) * 100) : 0

  const lista = presencas.filter(p => {
    if (filtro === 'presentes') return p.presente
    if (filtro === 'faltas') return !p.presente
    if (filtro === 'injustificadas') return !p.presente && !p.justificada
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Presenças e Faltas" subtitle="Registo do teu historial de presenças nas aulas" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-blue-500 text-xl mb-2">event</span>
          <p className="text-2xl font-bold text-blue-700">{total}</p>
          <p className="text-xs text-blue-600">Total de Aulas</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-green-500 text-xl mb-2">check_circle</span>
          <p className="text-2xl font-bold text-green-700">{presentes}</p>
          <p className="text-xs text-green-600">Presenças</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-red-500 text-xl mb-2">cancel</span>
          <p className="text-2xl font-bold text-red-700">{faltas}</p>
          <p className="text-xs text-red-600">Faltas ({faltasInjustificadas} injustif.)</p>
        </div>
        <div className={`border rounded-xl p-4 ${taxaPresenca >= 75 ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100'}`}>
          <span className={`material-symbols-outlined text-xl mb-2 ${taxaPresenca >= 75 ? 'text-purple-500' : 'text-orange-500'}`}>percent</span>
          <p className={`text-2xl font-bold ${taxaPresenca >= 75 ? 'text-purple-700' : 'text-orange-700'}`}>{taxaPresenca}%</p>
          <p className={`text-xs ${taxaPresenca >= 75 ? 'text-purple-600' : 'text-orange-600'}`}>Taxa de Presença</p>
        </div>
      </div>

      {taxaPresenca < 75 && total > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500 text-[20px]">warning</span>
          <p className="text-sm text-orange-700">A tua taxa de presença está abaixo do mínimo exigido (75%). Estão em falta <strong>{Math.ceil(total * 0.75) - presentes}</strong> presenças.</p>
        </div>
      )}

      {/* Filtros */}
      {total > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'presentes', label: 'Presenças' },
            { key: 'faltas', label: 'Faltas' },
            { key: 'injustificadas', label: 'Injustificadas' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${filtro === f.key ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {total === 0 ? (
        <EmptyState icon="fact_check" title="Sem registos de presença" description="Ainda não existem registos de presença para a tua conta." />
      ) : lista.length === 0 ? (
        <EmptyState icon="fact_check" title="Nenhum resultado" description="Não existem registos com este filtro." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Disciplina</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-on-surface-variant">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-on-surface-variant">Justificada</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant">Observação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {new Date(p.data).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{p.disciplina_nome || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${p.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className="material-symbols-outlined text-[12px]">{p.presente ? 'check' : 'close'}</span>
                        {p.presente ? 'Presente' : 'Falta'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!p.presente && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.justificada ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.justificada ? 'Sim' : 'Não'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{p.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
