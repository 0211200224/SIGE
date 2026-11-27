import { useState, useEffect, useCallback, Fragment } from 'react'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import { COLUNAS_PAUTA } from '../../../utils/avaliacao'

const TIPO_POR_TRIMESTRE = { 1: '1_trimestre', 2: '2_trimestre', 3: '3_trimestre' }
const inp = 'rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white'
const inpModal = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'

function ModalCriarConselho({ turmaNome, classGroupId, periodoId, contexto, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    observacoes: contexto,
    alunos_risco: '',
    decisoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(''); setSaving(true)
    try {
      await api.post('/pedagogico/conselhos', {
        class_group_id: classGroupId, periodo_id: periodoId || null,
        data: form.data, observacoes: form.observacoes, alunos_risco: form.alunos_risco,
        decisoes: form.decisoes, status: 'rascunho', origem: 'validacao_notas',
      })
      toast.success('Conselho de classe criado — consulte-o em Conselhos de Classe.')
      onSaved()
    } catch (err) { setErro(err.message); toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Criar Conselho de Classe</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">Turma: <b>{turmaNome}</b></p>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data</label>
            <input type="date" value={form.data} onChange={e => set('data', e.target.value)} className={inpModal} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações Gerais</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} className={inpModal + ' resize-none'} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Alunos em Risco</label>
            <textarea value={form.alunos_risco} onChange={e => set('alunos_risco', e.target.value)} rows={2} className={inpModal + ' resize-none'} placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Decisões Pedagógicas</label>
            <textarea value={form.decisoes} onChange={e => set('decisoes', e.target.value)} rows={2} className={inpModal + ' resize-none'} placeholder="Opcional — pode ser preenchido depois da reunião" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A criar...' : 'Criar Conselho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const corNota = (v) => {
  if (v === null || v === undefined) return 'text-on-surface-variant'
  if (v >= 14) return 'text-green-600 font-semibold'
  if (v >= 10) return 'text-blue-600'
  return 'text-red-600 font-semibold'
}

// Pauta completa expandida por baixo de uma linha -- todos os alunos, ACS 1,
// ACS 2, Média ACS, AP e Média do trimestre (regra única de avaliação). É isto que
// permite ao Pedagógico avaliar o lançamento todo antes de validar/fechar,
// em vez de confiar apenas no agregado (média da turma) da linha principal.
function PautaExpandida({ turmaId, disciplinaId, trimestre, colSpan }) {
  const [pauta, setPauta] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/pedagogico/validacao-notas/pauta?class_group_id=${turmaId}&disciplina_id=${disciplinaId}&trimestre=${trimestre}`)
      .then(r => setPauta(r.data))
      .catch(err => setErro(err.message))
  }, [turmaId, disciplinaId, trimestre])

  return (
    <tr className="bg-surface-container-lowest/60">
      <td colSpan={colSpan} className="px-4 py-4">
        {erro ? (
          <p className="text-sm text-red-600">{erro}</p>
        ) : !pauta ? (
          <div className="flex justify-center py-6"><span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span></div>
        ) : pauta.alunos.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-2">Nenhum aluno matriculado nesta turma.</p>
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="text-left px-3 py-2 text-xs font-medium text-on-surface-variant w-8">#</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-on-surface-variant min-w-40">Aluno</th>
                    {COLUNAS_PAUTA.map(c => (
                      <th key={c.key} className={`px-3 py-2 text-xs font-medium text-center ${c.provincial ? 'bg-amber-50 text-amber-800' : c.final ? 'bg-primary/5 text-primary' : 'text-on-surface-variant'}`}>
                        {c.label}{c.sub && <span className="block text-[9px] font-normal">{c.sub}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pauta.alunos.map((a, i) => (
                    <tr key={a.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-on-surface">{a.nome}</p>
                        <p className="text-xs text-on-surface-variant">{a.numero_matricula}</p>
                      </td>
                      {COLUNAS_PAUTA.map(c => {
                        const v = c.valor(a)
                        return (
                          <td key={c.key} className={`px-3 py-2 text-center tabular-nums ${corNota(v)} ${c.provincial ? 'bg-amber-50/50' : c.final ? 'bg-primary/5 font-bold' : c.calculada ? 'bg-surface-container-low/40' : ''}`}>{v ?? '—'}</td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function ValidacaoNotas() {
  const toast = useToast()
  const confirmar = useConfirm()
  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [professores, setProfessores] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [anoLectivo, setAnoLectivo] = useState(String(new Date().getFullYear()))
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroDisc, setFiltroDisc] = useState('')
  const [filtroTrimestre, setFiltroTrimestre] = useState('')
  const [reabrindo, setReabrindo] = useState(null)
  const [reabrindoMassa, setReabrindoMassa] = useState(false)
  const [modalProfessor, setModalProfessor] = useState(false)
  const [profSelecionado, setProfSelecionado] = useState('')
  const [trimestreProf, setTrimestreProf] = useState('')
  const [reabrindoProf, setReabrindoProf] = useState(false)
  const [processandoPeriodo, setProcessandoPeriodo] = useState(null)
  const [modalConselho, setModalConselho] = useState(null) // { turmaNome, classGroupId, periodoId, contexto }
  const [expandido, setExpandido] = useState(null) // `${turma_id}_${disciplina_id}_${trimestre}`

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

  const carregarPeriodos = useCallback(() => {
    setLoadingPeriodos(true)
    api.get(`/pedagogico/periodos?ano_lectivo=${anoLectivo}`)
      .then(r => setPeriodos(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingPeriodos(false))
  }, [anoLectivo])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/turmas'),
      api.get('/pedagogico/disciplinas'),
      api.get('/pedagogico/professores'),
    ]).then(([t, d, p]) => { setTurmas(t.data || []); setDisciplinas(d.data || []); setProfessores(p.data || []) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { carregarPeriodos() }, [carregarPeriodos])

  const periodoDoTrimestre = (trimestre) => periodos.find(p => p.tipo === TIPO_POR_TRIMESTRE[trimestre]) || null

  const getMediaCls = (m) => {
    if (!m) return 'text-on-surface-variant'
    if (m >= 14) return 'text-green-600 font-bold'
    if (m >= 10) return 'text-blue-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  // Fecho de período -- mesma acção que antes vivia numa página separada
  // (Fecho de Período); agora é feita aqui, junto da validação, porque é
  // depois de validar as notas que o Pedagógico decide fechar o trimestre.
  // O fecho automático (pela data_fim) não retira este botão: fechar antes
  // do previsto, ou reabrir depois, continua a ser sempre possível.
  const handleFecharPeriodo = async (periodo) => {
    const ok = await confirmar({
      title: 'Fechar período?',
      body: `O período "${periodo.nome}" fica bloqueado para lançamento de notas e frequência.`,
      danger: true, confirmLabel: 'Fechar Período',
    })
    if (!ok) return
    setProcessandoPeriodo(periodo.id)
    try {
      await api.patch(`/pedagogico/periodos/${periodo.id}/fechar`)
      toast.success(`Período "${periodo.nome}" fechado com sucesso.`)
      carregarPeriodos()
    } catch (err) { toast.error(err.message) } finally { setProcessandoPeriodo(null) }
  }

  const handleReabrirPeriodo = async (periodo) => {
    const ok = await confirmar({
      title: 'Reabrir período?',
      body: `O período "${periodo.nome}" volta a ficar aberto para lançamento de notas.`,
      confirmLabel: 'Reabrir',
    })
    if (!ok) return
    setProcessandoPeriodo(periodo.id)
    try {
      await api.patch(`/pedagogico/periodos/${periodo.id}/reabrir`)
      toast.success(`Período "${periodo.nome}" reaberto com sucesso.`)
      carregarPeriodos()
    } catch (err) { toast.error(err.message) } finally { setProcessandoPeriodo(null) }
  }

  const abrirModalConselho = (d) => {
    const periodo = periodoDoTrimestre(d.trimestre)
    const contexto = `Conselho solicitado a partir da validação de notas — turma ${d.turma_nome || ''}, disciplina ${d.disciplina_nome || ''} (${d.trimestre}º trimestre)${d.professor_nome ? `, professor(a) ${d.professor_nome}` : ''}. Média da turma: ${d.media_turma ?? '—'}.`
    setModalConselho({ turmaNome: d.turma_nome, classGroupId: d.turma_id, periodoId: periodo?.id || null, contexto })
  }

  const toggleExpandir = (d) => {
    const chave = `${d.turma_id}_${d.disciplina_id}_${d.trimestre}`
    setExpandido(prev => prev === chave ? null : chave)
  }

  // Fiscalização: só o Pedagógico reabre um lançamento já submetido pelo
  // professor — nunca o próprio professor.
  const handleReabrir = async (lancamentoId) => {
    const motivo = window.prompt('Motivo da reabertura (fica registado para auditoria):')
    if (motivo === null) return
    setReabrindo(lancamentoId)
    try {
      await api.patch(`/pedagogico/lancamentos-notas/${lancamentoId}/reabrir`, { motivo })
      toast.success('Lançamento reaberto com sucesso.')
      load()
    } catch (err) { toast.error(err.message) }
    finally { setReabrindo(null) }
  }

  // Reabre de uma vez todos os lançamentos submetidos do trimestre em
  // filtro (para todos os professores/turmas/disciplinas).
  const handleReabrirMassa = async () => {
    if (!filtroTrimestre) { toast.warning('Seleccione primeiro um trimestre no filtro acima.'); return }
    const submetidos = dados.filter(d => d.lancamento_estado === 'submetido').length
    if (!submetidos) { toast.warning('Não há lançamentos submetidos para reabrir com estes filtros.'); return }
    const motivo = window.prompt(`Reabrir os ${submetidos} lançamento(s) submetido(s) do ${filtroTrimestre}º trimestre? Indique o motivo (fica registado para auditoria):`)
    if (motivo === null) return
    setReabrindoMassa(true)
    try {
      const r = await api.patch('/pedagogico/lancamentos-notas/reabrir-massa', { trimestre: Number(filtroTrimestre), motivo })
      toast.success(`${r.data.reabertos} lançamento(s) reaberto(s).`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setReabrindoMassa(false) }
  }

  // Reabre todas as turmas/disciplinas submetidas de UM professor específico
  // (num trimestre), sem ser preciso ir linha a linha na tabela.
  const handleReabrirProfessor = async () => {
    if (!profSelecionado) { toast.warning('Seleccione o professor.'); return }
    if (!trimestreProf) { toast.warning('Seleccione o trimestre.'); return }
    const motivo = window.prompt('Motivo da reabertura (fica registado para auditoria):')
    if (motivo === null) return
    setReabrindoProf(true)
    try {
      const r = await api.patch('/pedagogico/lancamentos-notas/reabrir-professor', {
        professor_id: Number(profSelecionado), trimestre: Number(trimestreProf), motivo,
      })
      toast.success(`${r.data.reabertos} lançamento(s) reaberto(s) para este professor.`)
      setModalProfessor(false); setProfSelecionado(''); setTrimestreProf('')
      load()
    } catch (err) { toast.error(err.message) }
    finally { setReabrindoProf(false) }
  }

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <PageHeader title="Validação de Notas" subtitle="Verificação, conselho de classe e fecho de período" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 flex-shrink-0">info</span>
        <p className="text-sm text-amber-700">As notas são lançadas exclusivamente pelo Portal do Professor. Expanda cada linha para ver a pauta completa antes de validar, convoque um conselho de classe quando não concordar com o resultado, e feche o período aqui mesmo. Dados após fecho de período são imutáveis.</p>
      </div>

      {modalConselho && (
        <ModalCriarConselho
          {...modalConselho}
          onClose={() => setModalConselho(null)}
          onSaved={() => setModalConselho(null)}
        />
      )}

      {/* Períodos Lectivos do ano -- sempre visível, independente dos filtros
          da tabela abaixo, para o fecho de período nunca ficar escondido. */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Períodos Lectivos</h2>
          <select value={anoLectivo} onChange={e => setAnoLectivo(e.target.value)} className={inp}>
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        {loadingPeriodos ? (
          <div className="flex justify-center py-6"><span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span></div>
        ) : periodos.length === 0 ? (
          <div className="bg-white rounded-xl border border-outline-variant p-4 text-sm text-on-surface-variant">
            Nenhum período lectivo criado para {anoLectivo}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {periodos.map(p => (
              <div key={p.id} className={`rounded-xl p-4 border flex items-center gap-3 ${p.status === 'fechado' ? 'bg-gray-50 border-gray-200' : 'bg-white border-outline-variant shadow-sm'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.status === 'aberto' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <span className={`material-symbols-outlined text-[18px] ${p.status === 'aberto' ? 'text-green-600' : 'text-gray-400'}`}>
                    {p.status === 'aberto' ? 'lock_open' : 'lock'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-on-surface-variant">{fmtData(p.data_inicio)} → {fmtData(p.data_fim)}</p>
                </div>
                <button onClick={() => p.status === 'aberto' ? handleFecharPeriodo(p) : handleReabrirPeriodo(p)} disabled={processandoPeriodo === p.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors flex-shrink-0 ${
                    p.status === 'aberto' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-bright'
                  }`}>
                  <span className="material-symbols-outlined text-[15px]">{processandoPeriodo === p.id ? 'progress_activity' : p.status === 'aberto' ? 'lock' : 'lock_open'}</span>
                  {p.status === 'aberto' ? 'Fechar' : 'Reabrir'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3">Lançamentos de Notas</h2>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className={inp}>
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filtroDisc} onChange={e => setFiltroDisc(e.target.value)} className={inp}>
          <option value="">Todas as disciplinas</option>
          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <select value={filtroTrimestre} onChange={e => setFiltroTrimestre(e.target.value)} className={inp}>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disciplina / Professor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trimestre</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Alunos c/ Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Notas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Média Turma</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Mín / Máx</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Qualidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Lançamento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Conselho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {dados.map((d, i) => {
                const chave = `${d.turma_id}_${d.disciplina_id}_${d.trimestre}`
                const aberto = expandido === chave
                return (
                <Fragment key={chave}>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleExpandir(d)} title="Ver pauta completa"
                        className="text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg p-1">
                        <span className="material-symbols-outlined text-[18px]">{aberto ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-xs">{d.turma_nome || `Turma #${d.turma_id}`}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{d.disciplina_nome || `Disciplina #${d.disciplina_id}`}</p>
                      {d.professor_nome && <p className="text-[11px] text-on-surface-variant">{d.professor_nome}</p>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{d.trimestre}º Trimestre</td>
                    <td className="px-4 py-3 text-right">{d.total_alunos_com_notas}</td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">{d.total_notas}</td>
                    <td className={`px-4 py-3 text-right text-base ${getMediaCls(d.media_turma)}`}>{d.media_turma ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-xs text-on-surface-variant">{d.nota_min ?? '—'} / {d.nota_max ?? '—'}</td>
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
                    <td className="px-4 py-3">
                      <button onClick={() => abrirModalConselho(d)}
                        className="flex items-center gap-1.5 text-xs font-medium text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 hover:bg-orange-100 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[14px]">groups</span>Criar Conselho
                      </button>
                    </td>
                  </tr>
                  {aberto && (
                    <PautaExpandida turmaId={d.turma_id} disciplinaId={d.disciplina_id} trimestre={d.trimestre} colSpan={11} />
                  )}
                </Fragment>
                )
              })}
            </tbody>
            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
              <tr>
                <td className="px-4 py-3 font-bold text-xs uppercase tracking-wide" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right font-bold">{dados.reduce((s, d) => s + Number(d.total_alunos_com_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-on-surface-variant">{dados.reduce((s, d) => s + Number(d.total_notas), 0)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  {dados.length ? (dados.reduce((s, d) => s + Number(d.media_turma || 0), 0) / dados.length).toFixed(1) : '—'}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
