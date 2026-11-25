import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'

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

export default function ValidacaoNotas() {
  const toast = useToast()
  const confirmar = useConfirm()
  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [professores, setProfessores] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
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
  const [fechandoPeriodo, setFechandoPeriodo] = useState(false)
  const [modalConselho, setModalConselho] = useState(null) // { turmaNome, classGroupId, periodoId, contexto }

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
    api.get(`/pedagogico/periodos?ano_lectivo=${anoLectivo}`).then(r => setPeriodos(r.data || [])).catch(() => {})
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
  const periodoRibbon = filtroTrimestre ? periodoDoTrimestre(Number(filtroTrimestre)) : null

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
  const handleFecharPeriodo = async () => {
    if (!periodoRibbon) return
    const ok = await confirmar({
      title: 'Fechar período?',
      body: `O período "${periodoRibbon.nome}" fica bloqueado para lançamento de notas e frequência.`,
      danger: true, confirmLabel: 'Fechar Período',
    })
    if (!ok) return
    setFechandoPeriodo(true)
    try {
      await api.patch(`/pedagogico/periodos/${periodoRibbon.id}/fechar`)
      toast.success(`Período "${periodoRibbon.nome}" fechado com sucesso.`)
      carregarPeriodos()
    } catch (err) { toast.error(err.message) } finally { setFechandoPeriodo(false) }
  }

  const handleReabrirPeriodo = async () => {
    if (!periodoRibbon) return
    const ok = await confirmar({
      title: 'Reabrir período?',
      body: `O período "${periodoRibbon.nome}" volta a ficar aberto para lançamento de notas.`,
      confirmLabel: 'Reabrir',
    })
    if (!ok) return
    setFechandoPeriodo(true)
    try {
      await api.patch(`/pedagogico/periodos/${periodoRibbon.id}/reabrir`)
      toast.success(`Período "${periodoRibbon.nome}" reaberto com sucesso.`)
      carregarPeriodos()
    } catch (err) { toast.error(err.message) } finally { setFechandoPeriodo(false) }
  }

  const abrirModalConselho = (d) => {
    const periodo = periodoDoTrimestre(d.trimestre)
    const contexto = `Conselho solicitado a partir da validação de notas — turma ${d.turma_nome || ''}, disciplina ${d.disciplina_nome || ''} (${d.trimestre}º trimestre)${d.professor_nome ? `, professor(a) ${d.professor_nome}` : ''}. Média da turma: ${d.media_turma ?? '—'}.`
    setModalConselho({ turmaNome: d.turma_nome, classGroupId: d.turma_id, periodoId: periodo?.id || null, contexto })
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
        <p className="text-sm text-amber-700">As notas são lançadas exclusivamente pelo Portal do Professor. O Pedagógico valida, pode convocar um conselho de classe quando não concorda com o resultado, e fecha o período aqui mesmo. Dados após fecho de período são imutáveis.</p>
      </div>

      {modalConselho && (
        <ModalCriarConselho
          {...modalConselho}
          onClose={() => setModalConselho(null)}
          onSaved={() => setModalConselho(null)}
        />
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ano:</label>
        <select value={anoLectivo} onChange={e => setAnoLectivo(e.target.value)} className={inp}>
          {anos.map(a => <option key={a}>{a}</option>)}
        </select>
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
      </div>

      {/* Fecho do período lectivo correspondente ao trimestre em filtro */}
      {filtroTrimestre && (
        <div className={`rounded-xl p-4 mb-5 border flex items-center gap-4 flex-wrap ${periodoRibbon?.status === 'fechado' ? 'bg-gray-50 border-gray-200' : 'bg-white border-outline-variant shadow-sm'}`}>
          {periodoRibbon ? (
            <>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${periodoRibbon.status === 'aberto' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className={`material-symbols-outlined text-[20px] ${periodoRibbon.status === 'aberto' ? 'text-green-600' : 'text-gray-400'}`}>
                  {periodoRibbon.status === 'aberto' ? 'lock_open' : 'lock'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface text-sm">{periodoRibbon.nome}</p>
                <p className="text-xs text-on-surface-variant">
                  {fmtData(periodoRibbon.data_inicio)} → {fmtData(periodoRibbon.data_fim)} · {periodoRibbon.status === 'aberto' ? 'Aberto para lançamento' : 'Fechado'}
                </p>
              </div>
              <button onClick={periodoRibbon.status === 'aberto' ? handleFecharPeriodo : handleReabrirPeriodo} disabled={fechandoPeriodo}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors ${
                  periodoRibbon.status === 'aberto' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-bright'
                }`}>
                <span className="material-symbols-outlined text-[18px]">{fechandoPeriodo ? 'progress_activity' : periodoRibbon.status === 'aberto' ? 'lock' : 'lock_open'}</span>
                {periodoRibbon.status === 'aberto' ? 'Fechar Período' : 'Reabrir Período'}
              </button>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Nenhum período criado para o {filtroTrimestre}º trimestre de {anoLectivo}. <Link to="/pedagogico/periodos" className="text-primary font-medium hover:underline">Criar período</Link>
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-5 flex-wrap justify-end">
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
              {dados.map((d, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-medium text-xs">{d.turma_nome || `Turma #${d.turma_id}`}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.disciplina_nome || `Disciplina #${d.disciplina_id}`}</p>
                    {d.professor_nome && <p className="text-[11px] text-on-surface-variant">{d.professor_nome}</p>}
                  </td>
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
                  <td className="px-4 py-3">
                    <button onClick={() => abrirModalConselho(d)}
                      className="flex items-center gap-1.5 text-xs font-medium text-orange-700 border border-orange-200 bg-orange-50 rounded-lg px-2.5 py-1.5 hover:bg-orange-100 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[14px]">groups</span>Criar Conselho
                    </button>
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
