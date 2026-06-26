import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function ValidacaoNotas() {
  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroDisc, setFiltroDisc] = useState('')
  const [filtroTrimestre, setFiltroTrimestre] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtroTurma) p.set('class_group_id', filtroTurma)
    if (filtroDisc) p.set('disciplina_id', filtroDisc)
    if (filtroTrimestre) p.set('trimestre', filtroTrimestre)
    api.get(`/pedagogico/validacao-notas?${p}`)
      .then(r => setDados(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroTurma, filtroDisc, filtroTrimestre])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/disciplinas'),
    ]).then(([t, d]) => { setTurmas(t.data || []); setDisciplinas(d.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const getMediaCls = (m) => {
    if (!m) return 'text-on-surface-variant'
    if (m >= 14) return 'text-green-600 font-bold'
    if (m >= 10) return 'text-blue-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Validação de Notas" subtitle="Verificação e consolidação das notas lançadas pelos professores" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 flex-shrink-0">info</span>
        <p className="text-sm text-amber-700">As notas são lançadas exclusivamente pelo Portal do Professor. O Pedagógico apenas valida e consolida os dados. Dados após fecho de período são imutáveis.</p>
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
        <select value={filtroTrimestre} onChange={e => setFiltroTrimestre(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os trimestres</option>
          <option value="1">1º Trimestre</option>
          <option value="2">2º Trimestre</option>
          <option value="3">3º Trimestre</option>
        </select>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5">
          <span className="material-symbols-outlined text-[16px]">refresh</span>Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : dados.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">fact_check</span>
          <p className="text-sm text-on-surface-variant">Nenhuma nota encontrada para os filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trimestre</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Alunos c/ Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Média Turma</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Mín / Máx</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {dados.map((d, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-medium">{d.disciplina_nome || `Disciplina #${d.disciplina_id}`}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{d.trimestre}º Trimestre</td>
                  <td className="px-4 py-3 text-right">{d.total_alunos_com_notas}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{d.total_notas}</td>
                  <td className={`px-4 py-3 text-right text-base ${getMediaCls(d.media_turma)}`}>{d.media_turma ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-xs text-on-surface-variant">{d.nota_min} / {d.nota_max}</td>
                  <td className="px-4 py-3">
                    {d.media_turma >= 10 ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><span className="material-symbols-outlined text-[14px]">check_circle</span>OK</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-700 font-medium"><span className="material-symbols-outlined text-[14px]">warning</span>Atenção</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
              <tr>
                <td className="px-4 py-3 font-bold text-xs uppercase tracking-wide" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold">{dados.reduce((s, d) => s + Number(d.total_alunos_com_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-on-surface-variant">{dados.reduce((s, d) => s + Number(d.total_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  {dados.length ? (dados.reduce((s, d) => s + Number(d.media_turma || 0), 0) / dados.length).toFixed(1) : '—'}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
