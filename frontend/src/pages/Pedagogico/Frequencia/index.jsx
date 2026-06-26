import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function Frequencia() {
  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroDisc, setFiltroDisc] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    if (filtroDisc) p.set('disciplina_id', filtroDisc)
    api.get(`/pedagogico/frequencia?${p}`)
      .then(r => setDados(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroTurma, filtroDisc])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/disciplinas'),
    ]).then(([t, d]) => { setTurmas(t.data || []); setDisciplinas(d.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const getTaxaCls = (taxa) => {
    if (taxa >= 90) return 'text-green-600 font-bold'
    if (taxa >= 75) return 'text-blue-600 font-semibold'
    if (taxa >= 60) return 'text-amber-600 font-semibold'
    return 'text-red-600 font-bold'
  }

  const getTaxaBg = (taxa) => {
    if (taxa >= 90) return 'bg-green-400'
    if (taxa >= 75) return 'bg-blue-400'
    if (taxa >= 60) return 'bg-amber-400'
    return 'bg-red-400'
  }

  const abaixoMinimo = dados.filter(d => d.taxa_presenca < 75).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Frequência" subtitle="Consolidação das presenças registadas pelos professores" />

      {abaixoMinimo > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">warning</span>
          <p className="text-sm text-red-700 font-medium">{abaixoMinimo} aluno(s) abaixo da frequência mínima (75%).</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-400 flex-shrink-0">info</span>
        <p className="text-sm text-blue-700">As presenças são registadas pelos professores no Portal do Professor. Este módulo consolida e apresenta as taxas de frequência por aluno e disciplina.</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filtroDisc} onChange={e => setFiltroDisc(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as disciplinas</option>
          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5">
          <span className="material-symbols-outlined text-[16px]">refresh</span>Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : dados.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">how_to_reg</span>
          <p className="text-sm text-on-surface-variant">Nenhum registo de frequência encontrado para os filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aulas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Presenças</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Faltas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Just.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-48">Taxa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {dados.map((d, i) => (
                <tr key={i} className={`hover:bg-surface-container-low/40 ${d.taxa_presenca < 75 ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium">{d.aluno_nome}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{d.disciplina_nome || `Disciplina #${d.disciplina_id}`}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{d.total_aulas}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{d.presencas}</td>
                  <td className="px-4 py-3 text-right text-red-500">{d.faltas}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant text-xs">{d.faltas_justificadas}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getTaxaBg(d.taxa_presenca)}`} style={{ width: `${Math.min(d.taxa_presenca || 0, 100)}%` }} />
                      </div>
                      <span className={`text-xs min-w-[40px] text-right ${getTaxaCls(d.taxa_presenca)}`}>{d.taxa_presenca ?? '—'}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
