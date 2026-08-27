import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function ValidacaoNotas() {
  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroDisc, setFiltroDisc] = useState('')
  const [filtroTrimestre, setFiltroTrimestre] = useState('')
  const [reabrindo, setReabrindo] = useState(null)
  const [reabrindoMassa, setReabrindoMassa] = useState(false)
  const [modalProfessor, setModalProfessor] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState('')
  const [trimestreProf, setTrimestreProf] = useState('')
  const [reabrindoProf, setReabrindoProf] = useState(false)

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
      api.get('/pedagogico/professores'),
    ]).then(([t, d, p]) => { setTurmas(t.data || []); setDisciplinas(d.data || []); setProfessores(p.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const getMediaCls = (m) => {
    if (!m) return 'text-on-surface-variant'
    if (m >= 14) return 'text-green-600 font-bold'
    if (m >= 10) return 'text-blue-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  // Fiscalização: só o Pedagógico reabre um lançamento já submetido pelo
  // professor — nunca o próprio professor.
  const handleReabrir = async (lancamentoId) => {
    const motivo = window.prompt('Motivo da reabertura (fica registado para auditoria):')
    if (motivo === null) return
    setReabrindo(lancamentoId)
    try {
      await api.patch(`/pedagogico/lancamentos-notas/${lancamentoId}/reabrir`, { motivo })
      load()
    } catch (err) { alert(err.message) }
    finally { setReabrindo(null) }
  }

  // Reabre de uma vez todos os lançamentos submetidos do trimestre em
  // filtro (para todos os professores/turmas/disciplinas).
  const handleReabrirMassa = async () => {
    if (!filtroTrimestre) { alert('Seleccione primeiro um trimestre no filtro acima.'); return }
    const submetidos = dados.filter(d => d.lancamento_estado === 'submetido').length
    if (!submetidos) { alert('Não há lançamentos submetidos para reabrir com estes filtros.'); return }
    const motivo = window.prompt(`Reabrir os ${submetidos} lançamento(s) submetido(s) do ${filtroTrimestre}º trimestre? Indique o motivo (fica registado para auditoria):`)
    if (motivo === null) return
    setReabrindoMassa(true)
    try {
      const r = await api.patch('/pedagogico/lancamentos-notas/reabrir-massa', { trimestre: Number(filtroTrimestre), motivo })
      alert(`${r.data.reabertos} lançamento(s) reaberto(s).`)
      load()
    } catch (err) { alert(err.message) }
    finally { setReabrindoMassa(false) }
  }

  // Reabre todas as turmas/disciplinas submetidas de UM professor específico
  // (num trimestre), sem ser preciso ir linha a linha na tabela.
  const handleReabrirProfessor = async () => {
    if (!profSelecionado) { alert('Seleccione o professor.'); return }
    if (!trimestreProf) { alert('Seleccione o trimestre.'); return }
    const motivo = window.prompt('Motivo da reabertura (fica registado para auditoria):')
    if (motivo === null) return
    setReabrindoProf(true)
    try {
      const r = await api.patch('/pedagogico/lancamentos-notas/reabrir-professor', {
        professor_id: Number(profSelecionado), trimestre: Number(trimestreProf), motivo,
      })
      alert(`${r.data.reabertos} lançamento(s) reaberto(s) para este professor.`)
      setModalProfessor(false); setProfSelecionado(''); setTrimestreProf('')
      load()
    } catch (err) { alert(err.message) }
    finally { setReabrindoProf(false) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
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
        <span className="flex-1" />
        <button onClick={handleReabrirMassa} disabled={reabrindoMassa || !filtroTrimestre}
          className="flex items-center gap-1.5 text-sm text-red-700 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!filtroTrimestre ? 'Seleccione um trimestre para reabrir tudo' : ''}>
          <span className="material-symbols-outlined text-[16px]">{reabrindoMassa ? 'progress_activity' : 'lock_open'}</span>
          {reabrindoMassa ? 'A reabrir...' : 'Reabrir Tudo (trimestre)'}
        </button>
        <button onClick={() => setModalProfessor(true)}
          className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5">
          <span className="material-symbols-outlined text-[16px]">person</span>Reabrir por Professor
        </button>
      </div>

      {modalProfessor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-1">Reabrir por Professor</h3>
            <p className="text-sm text-on-surface-variant mb-4">Reabre de uma vez todas as turmas/disciplinas submetidas por este professor, no trimestre indicado.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Professor *</label>
                <select value={profSelecionado} onChange={e => setProfSelecionado(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                  <option value="">— Seleccionar professor —</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Trimestre *</label>
                <select value={trimestreProf} onChange={e => setTrimestreProf(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                  <option value="">— Seleccionar trimestre —</option>
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setModalProfessor(false); setProfSelecionado(''); setTrimestreProf('') }}
                className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Cancelar</button>
              <button onClick={handleReabrirProfessor} disabled={reabrindoProf}
                className="px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-60">
                {reabrindoProf ? 'A reabrir...' : 'Reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : dados.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 block">fact_check</span>
          <p className="text-sm text-on-surface-variant">Nenhuma nota encontrada para os filtros seleccionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trimestre</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Alunos c/ Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Média Turma</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Mín / Máx</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Qualidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Lançamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {dados.map((d, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-medium text-xs">{d.turma_nome || `Turma #${d.turma_id}`}</td>
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
                  <td className="px-4 py-3">
                    {d.lancamento_estado === 'submetido' ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-red-700 font-medium bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <span className="material-symbols-outlined text-[13px]">lock</span>Submetido
                        </span>
                        <button onClick={() => handleReabrir(d.lancamento_id)} disabled={reabrindo === d.lancamento_id}
                          className="text-xs text-primary hover:underline disabled:opacity-50 whitespace-nowrap">
                          {reabrindo === d.lancamento_id ? 'A reabrir...' : 'Reabrir'}
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                        <span className="material-symbols-outlined text-[13px]">lock_open</span>Aberto
                      </span>
                    )}
                    {d.submetido_por_nome && (
                      <p className="text-[10px] text-on-surface-variant mt-0.5">por {d.submetido_por_nome}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
              <tr>
                <td className="px-4 py-3 font-bold text-xs uppercase tracking-wide" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right font-bold">{dados.reduce((s, d) => s + Number(d.total_alunos_com_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-on-surface-variant">{dados.reduce((s, d) => s + Number(d.total_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  {dados.length ? (dados.reduce((s, d) => s + Number(d.media_turma || 0), 0) / dados.length).toFixed(1) : '—'}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
