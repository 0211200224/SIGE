import { Fragment, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import { TIPOS_AVALIACAO, NOTA_MIN, NOTA_MAX, temValor, calcularTrimestre, corNota } from '../../../utils/avaliacao'

const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

const foraDaEscala = (v) => temValor(v) && (Number(v) < NOTA_MIN || Number(v) > NOTA_MAX)

// Célula calculada (só leitura): Média ACS / Média do trimestre
function MediaCalculada({ valor, destaque }) {
  if (!temValor(valor)) return <span className="text-xs text-on-surface-variant">—</span>
  return (
    <span className={`inline-flex min-w-[2.5rem] justify-center rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${corNota(valor)} ${
      destaque ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-surface-container-low'}`}>
      {valor}
    </span>
  )
}

export default function ProfessorNotas() {
  const toast = useToast()
  const confirmar = useConfirm()
  const [searchParams] = useSearchParams()
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [estado, setEstado] = useState(null)
  const [submetendo, setSubmetendo] = useState(false)

  const [turmaId, setTurmaId] = useState(searchParams.get('turma_id') || '')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [trimestre, setTrimestre] = useState('1')
  // notas[aluno_id] = { acs1, acs2, ap } -- colunas fixas da regra de avaliação
  const [notas, setNotas] = useState({})
  const [alterado, setAlterado] = useState(false)

  const [disciplinas, setDisciplinas] = useState([])

  useEffect(() => {
    api.get('/professor/minhas-turmas').then(r => {
      const porTurma = {}
      for (const a of (r.data || [])) {
        if (!porTurma[a.turma_id]) {
          porTurma[a.turma_id] = { turma_id: a.turma_id, turma_nome: a.turma_nome, classe_nome: a.classe_nome, disciplinas: [] }
        }
        porTurma[a.turma_id].disciplinas.push({ id: a.disciplina_id, nome: a.disciplina_nome })
      }
      setTurmas(Object.values(porTurma))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = turmas.find(t => String(t.turma_id) === String(turmaId))
    setDisciplinas(t?.disciplinas || [])
    setDisciplinaId(t?.disciplinas[0]?.id || '')
  }, [turmaId, turmas])

  const carregarAlunos = useCallback(async () => {
    if (!turmaId || !disciplinaId) return
    setLoadingAlunos(true)
    try {
      const [a, n, e] = await Promise.all([
        api.get(`/professor/turmas/${turmaId}/alunos`),
        api.get(`/professor/notas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&trimestre=${trimestre}`),
        api.get(`/professor/notas/estado?turma_id=${turmaId}&disciplina_id=${disciplinaId}&trimestre=${trimestre}`),
      ])
      setEstado(e.data)
      setAlunos(a.data || [])
      const ns = {}
      for (const nota of (n.data || [])) {
        const tipo = String(nota.tipo || '').toLowerCase()
        if (!TIPOS_AVALIACAO.some(t => t.tipo === tipo)) continue
        if (!ns[nota.aluno_id]) ns[nota.aluno_id] = {}
        ns[nota.aluno_id][tipo] = nota.valor !== null ? String(Number(nota.valor)) : ''
      }
      setNotas(ns)
      setAlterado(false)
    } catch {}
    finally { setLoadingAlunos(false) }
  }, [turmaId, disciplinaId, trimestre])

  useEffect(() => { carregarAlunos() }, [carregarAlunos])

  const setNota = (alunoId, tipo, valor) => {
    setNotas(prev => ({ ...prev, [alunoId]: { ...(prev[alunoId] || {}), [tipo]: valor } }))
    setAlterado(true)
  }

  const invalidas = alunos.flatMap(a => TIPOS_AVALIACAO.filter(t => foraDaEscala(notas[a.id]?.[t.tipo])).map(t => `${a.nome} (${t.sigla})`))

  const handleSave = async () => {
    if (invalidas.length) { toast.error(`Há notas fora da escala ${NOTA_MIN}–${NOTA_MAX}: ${invalidas.slice(0, 3).join(', ')}${invalidas.length > 3 ? '…' : ''}`); return }
    setSaving(true)
    const batch = []
    for (const aluno of alunos) {
      for (const { tipo } of TIPOS_AVALIACAO) {
        const v = notas[aluno.id]?.[tipo]
        batch.push({ aluno_id: aluno.id, tipo, valor: temValor(v) ? Number(v) : null, observacoes: null })
      }
    }
    try {
      await api.post('/professor/notas/lote', { turma_id: parseInt(turmaId), disciplina_id: parseInt(disciplinaId), trimestre: parseInt(trimestre), notas: batch })
      setAlterado(false)
      toast.success('Notas guardadas com sucesso.')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // Submeter fecha o lançamento desta turma/disciplina/trimestre -- deixa de
  // poder editar até o Pedagógico reabrir explicitamente (fiscalização).
  const handleSubmeter = async () => {
    const semMedia = alunos.filter(a => calcularTrimestre(notas[a.id]).media_trimestral === null).length
    const ok = await confirmar({
      title: 'Submeter notas?',
      body: `${semMedia > 0 ? `Atenção: ${semMedia} aluno(s) ainda sem Média do trimestre (falta ACS 1, ACS 2 ou AP). ` : ''}Depois de submeter, estas notas ficam bloqueadas e não poderá editá-las — só o Pedagógico pode reabrir o lançamento desta turma/disciplina/trimestre.`,
      danger: true, confirmLabel: 'Submeter Notas',
    })
    if (!ok) return
    if (alterado) await handleSave()
    setSubmetendo(true)
    try {
      await api.post('/professor/notas/submeter', { turma_id: parseInt(turmaId), disciplina_id: parseInt(disciplinaId), trimestre: parseInt(trimestre) })
      toast.success('Notas submetidas com sucesso. O lançamento está agora bloqueado para edição.')
      await carregarAlunos()
    } catch (err) { toast.error(err.message) }
    finally { setSubmetendo(false) }
  }

  const turmaSelecionada = turmas.find(t => String(t.turma_id) === String(turmaId))
  const linhas = alunos.map(a => ({ aluno: a, calc: calcularTrimestre(notas[a.id]) }))
  const comMedia = linhas.filter(l => l.calc.media_trimestral !== null)
  const positivas = comMedia.filter(l => l.calc.media_trimestral >= 10).length
  const mediaTurma = comMedia.length ? Math.round(comMedia.reduce((s, l) => s + l.calc.media_trimestral, 0) / comMedia.length * 10) / 10 : null

  if (loading) {
    return <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <PageHeader title="Lançar Notas" subtitle="ACS 1, ACS 2 e Avaliação Provincial por trimestre — médias calculadas automaticamente" />

      {/* Selecção */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turma *</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={inputCls}>
              <option value="">Seleccionar turma</option>
              {turmas.map(t => <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} · {t.classe_nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Disciplina *</label>
            <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} className={inputCls}>
              <option value="">Seleccionar disciplina</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Trimestre</label>
            <select value={trimestre} onChange={e => setTrimestre(e.target.value)} className={inputCls}>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fórmula -- sempre visível */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-on-surface">
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <span className="material-symbols-outlined text-[18px]">function</span>Cálculo automático
        </span>
        <span><b>Média ACS</b> = (ACS 1 + ACS 2) ÷ 2</span>
        <span><b>Média do trimestre</b> = (2 × Média ACS + <b className="text-amber-700">AP</b>) ÷ 3</span>
        <span className="text-on-surface-variant">Arredondado às unidades · escala {NOTA_MIN}–{NOTA_MAX}</span>
      </div>

      {turmaId && disciplinaId && estado && !estado.disponivel && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[20px] flex-shrink-0">lock</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Lançamento indisponível</p>
            <p className="text-xs text-red-700 mt-0.5">
              {estado.submetido
                ? `Estas notas já foram submetidas${estado.submetido_em ? ` em ${new Date(estado.submetido_em).toLocaleDateString('pt-MZ')}` : ''} e estão bloqueadas para edição. Dirija-se ao Pedagógico para pedir a reabertura.`
                : estado.periodo_encontrado
                  ? 'O período lectivo deste trimestre está fechado pelo Pedagógico — o lançamento de notas não está disponível.'
                  : 'O Pedagógico ainda não abriu o período lectivo deste trimestre — o lançamento de notas não está disponível.'}
            </p>
          </div>
        </div>
      )}

      {!turmaId || !disciplinaId ? (
        <EmptyState icon="grade" title="Seleccione turma e disciplina" description="Escolha a turma e disciplina para lançar notas." />
      ) : loadingAlunos ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : alunos.length === 0 ? (
        <EmptyState icon="groups" title="Nenhum aluno matriculado" description="Não existem alunos activos nesta turma." />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-surface-container-low border-b border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {alunos.length} alunos · {turmaSelecionada?.turma_nome} · {trimestre}º Trimestre
              </p>
              <p className="text-xs text-on-surface-variant">
                Com média: <b className="text-on-surface">{comMedia.length}/{alunos.length}</b>
                {comMedia.length > 0 && <> · Positivas: <b className="text-on-surface">{positivas}</b> · Média da turma: <b className={corNota(mediaTurma)}>{mediaTurma}</b></>}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant">
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-medium text-on-surface-variant w-8">#</th>
                    <th className="text-left px-3 sm:px-4 py-3 text-xs font-medium text-on-surface-variant min-w-44">Aluno</th>
                    <th className="px-2 py-3 text-xs font-semibold text-on-surface text-center w-24" title={TIPOS_AVALIACAO[0].nome}>ACS 1</th>
                    <th className="px-2 py-3 text-xs font-semibold text-on-surface text-center w-24" title={TIPOS_AVALIACAO[1].nome}>ACS 2</th>
                    <th className="px-2 py-3 text-xs font-medium text-on-surface-variant text-center w-24 bg-surface-container-low/60">
                      Média ACS<span className="block text-[9px] font-normal normal-case">automática</span>
                    </th>
                    <th className="px-2 py-3 text-xs font-semibold text-amber-800 text-center w-28 bg-amber-50 border-x border-amber-100" title="Avaliação / Prova Provincial">
                      AP<span className="block text-[9px] font-normal normal-case">Prova Provincial</span>
                    </th>
                    <th className="px-2 py-3 text-xs font-semibold text-primary text-center w-28 bg-primary/5">
                      Média Trimestre<span className="block text-[9px] font-normal normal-case">automática</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ aluno: a, calc }, i) => (
                    <tr key={a.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                      <td className="px-3 sm:px-4 py-2.5 text-xs text-on-surface-variant">{i + 1}</td>
                      <td className="px-3 sm:px-4 py-2.5">
                        <p className="font-medium text-on-surface">{a.nome}</p>
                        <p className="text-xs text-on-surface-variant">{a.numero_matricula}</p>
                      </td>
                      {TIPOS_AVALIACAO.map(({ tipo, sigla }) => {
                        const v = notas[a.id]?.[tipo] ?? ''
                        const errado = foraDaEscala(v)
                        const input = (
                          <input
                            type="number" inputMode="decimal" min={NOTA_MIN} max={NOTA_MAX} step="0.5"
                            value={v}
                            onChange={e => setNota(a.id, tipo, e.target.value)}
                            disabled={!estado?.disponivel}
                            aria-label={`${sigla} de ${a.nome}`}
                            className={`w-full min-w-[4rem] text-center rounded-lg border px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed ${
                              errado ? 'border-red-400 bg-red-50 focus:ring-red-200' : tipo === 'ap' ? 'border-amber-200 focus:border-amber-500 focus:ring-amber-100' : 'border-outline-variant focus:border-primary focus:ring-primary/20'
                            } ${errado ? 'text-red-700' : corNota(v)}`}
                            placeholder="—"
                          />
                        )
                        if (tipo === 'ap') {
                          return (
                            <Fragment key={tipo}>
                              <td className="px-2 py-2.5 text-center bg-surface-container-low/30"><MediaCalculada valor={calc.media_acs} /></td>
                              <td className="px-2 py-2.5 bg-amber-50/50 border-x border-amber-100">{input}</td>
                            </Fragment>
                          )
                        }
                        return <td key={tipo} className="px-2 py-2.5">{input}</td>
                      })}
                      <td className="px-2 py-2.5 text-center bg-primary/5"><MediaCalculada valor={calc.media_trimestral} destaque /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {invalidas.length > 0 && (
            <p className="text-xs text-red-700 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">error</span>
              {invalidas.length} nota(s) fora da escala {NOTA_MIN}–{NOTA_MAX} — corrija antes de guardar.
            </p>
          )}

          {estado?.disponivel && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
              <button onClick={handleSave} disabled={saving || submetendo || invalidas.length > 0}
                className="flex items-center justify-center gap-2 bg-white border border-outline-variant text-on-surface px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-surface-bright transition-all shadow-sm">
                {saving ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A guardar...</>
                  : <><span className="material-symbols-outlined text-[16px]">save</span>Guardar Notas{alterado ? ' *' : ''}</>}
              </button>
              <button onClick={handleSubmeter} disabled={saving || submetendo || invalidas.length > 0}
                className="flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all shadow-sm">
                {submetendo ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A submeter...</>
                  : <><span className="material-symbols-outlined text-[16px]">lock</span>Submeter Notas</>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
