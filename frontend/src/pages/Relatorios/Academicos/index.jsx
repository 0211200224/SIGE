import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

function SemDados({ msg = 'Sem dados disponíveis para os filtros seleccionados' }) {
  return (
    <div className="py-10 text-center text-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[36px] text-outline-variant block mb-2">table_view</span>
      {msg}
    </div>
  )
}

export default function RelatorioAcademicos() {
  const [notas, setNotas] = useState(null)
  const [frequencia, setFrequencia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ turma_id: '', trimestre: '' })
  const [turmas, setTurmas] = useState([])

  useEffect(() => {
    api.get('/pedagogico/turmas').then(r => setTurmas(r.data?.data || r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtros.turma_id) p.set('turma_id', filtros.turma_id)
    if (filtros.trimestre) p.set('trimestre', filtros.trimestre)
    Promise.all([
      api.get(`/relatorios/academico?${p}`).then(r => r.data?.data || r.data || []).catch(() => []),
      api.get(`/relatorios/frequencia?${p}`).then(r => r.data?.data || r.data || []).catch(() => []),
    ]).then(([n, f]) => { setNotas(n); setFrequencia(f) }).finally(() => setLoading(false))
  }, [filtros])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Relatório Académico" subtitle="Desempenho por disciplina, médias e frequência" />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Turma</label>
          <select value={filtros.turma_id} onChange={e => setFiltros(p => ({ ...p, turma_id: e.target.value }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-44">
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Trimestre</label>
          <select value={filtros.trimestre} onChange={e => setFiltros(p => ({ ...p, trimestre: e.target.value }))}
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Todos</option>
            <option value="1">1.º Trimestre</option>
            <option value="2">2.º Trimestre</option>
            <option value="3">3.º Trimestre</option>
          </select>
        </div>
        <button onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-[16px]">print</span>
          Imprimir / PDF
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-on-surface-variant">A carregar dados...</div>
      ) : (
        <>
          {/* Médias por disciplina */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 text-[20px]">grade</span>
              <h3 className="font-semibold text-sm text-on-surface">Médias por Disciplina</h3>
              {notas?.length > 0 && <span className="ml-auto text-xs text-on-surface-variant">{notas.length} disciplina(s)</span>}
            </div>
            {!notas?.length ? <SemDados /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-variant text-on-surface-variant">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Disciplina</th>
                      <th className="text-center px-4 py-3 font-medium">Avaliações</th>
                      <th className="text-center px-4 py-3 font-medium">Média</th>
                      <th className="text-center px-4 py-3 font-medium">Classificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {notas.map((row, i) => {
                      const m = parseFloat(row.media || 0)
                      const [cor, bg, lbl] = m >= 10 ? ['text-green-700','bg-green-100','Satisfatório'] : m >= 8 ? ['text-yellow-700','bg-yellow-100','Atenção'] : ['text-red-700','bg-red-100','Crítico']
                      return (
                        <tr key={i} className="hover:bg-surface-variant/20">
                          <td className="px-4 py-3 font-medium text-on-surface">{row.disciplina}</td>
                          <td className="px-4 py-3 text-center text-on-surface-variant">{row.total_notas}</td>
                          <td className={`px-4 py-3 text-center font-bold text-base ${cor}`}>{m.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${bg} ${cor}`}>{lbl}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Frequência */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">event_available</span>
              <h3 className="font-semibold text-sm text-on-surface">Frequência por Aluno</h3>
              {frequencia?.length > 0 && <span className="ml-auto text-xs text-on-surface-variant">{frequencia.length} aluno(s)</span>}
            </div>
            {!frequencia?.length ? <SemDados msg="Sem registos de frequência disponíveis" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-variant text-on-surface-variant">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Aluno</th>
                      <th className="text-center px-4 py-3 font-medium">Total Aulas</th>
                      <th className="text-center px-4 py-3 font-medium">Presenças</th>
                      <th className="text-center px-4 py-3 font-medium">Taxa</th>
                      <th className="text-center px-4 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {frequencia.map((row, i) => {
                      const taxa = parseFloat(row.taxa || 0)
                      const [cor, bg, lbl] = taxa >= 75 ? ['text-green-700','bg-green-100','Regular'] : taxa >= 50 ? ['text-yellow-700','bg-yellow-100','Atenção'] : ['text-red-700','bg-red-100','Em Risco']
                      return (
                        <tr key={i} className="hover:bg-surface-variant/20">
                          <td className="px-4 py-3 font-medium text-on-surface">{row.nome}</td>
                          <td className="px-4 py-3 text-center text-on-surface-variant">{row.total_aulas}</td>
                          <td className="px-4 py-3 text-center text-on-surface-variant">{row.presencas}</td>
                          <td className={`px-4 py-3 text-center font-bold ${cor}`}>{taxa.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${bg} ${cor}`}>{lbl}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
