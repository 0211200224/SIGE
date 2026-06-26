import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const selCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

export default function ProfessorPresencas() {
  const [searchParams] = useSearchParams()
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('registo')
  const [estatisticas, setEstatisticas] = useState([])

  const [turmaId, setTurmaId] = useState(searchParams.get('turma_id') || '')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [disciplinas, setDisciplinas] = useState([])
  const [presencas, setPresencas] = useState({})

  useEffect(() => {
    api.get('/professor/minhas-turmas').then(r => {
      const por_turma = {}
      for (const a of (r.data || [])) {
        if (!por_turma[a.turma_id]) por_turma[a.turma_id] = { turma_id: a.turma_id, turma_nome: a.turma_nome, classe_nome: a.classe_nome, disciplinas: [] }
        por_turma[a.turma_id].disciplinas.push({ id: a.disciplina_id, nome: a.disciplina_nome })
      }
      setTurmas(Object.values(por_turma))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = turmas.find(t => t.turma_id == turmaId)
    setDisciplinas(t?.disciplinas || [])
    setDisciplinaId(t?.disciplinas[0]?.id || '')
  }, [turmaId, turmas])

  const carregar = useCallback(async () => {
    if (!turmaId || !disciplinaId || !data) return
    setLoadingAlunos(true)
    try {
      const [a, p] = await Promise.all([
        api.get(`/professor/turmas/${turmaId}/alunos`),
        api.get(`/professor/presencas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&data=${data}`),
      ])
      setAlunos(a.data || [])
      const ps = {}
      for (const p2 of (p.data || [])) {
        ps[p2.aluno_id] = { presente: !!p2.presente, justificada: !!p2.justificada, observacao: p2.observacao || '' }
      }
      for (const al of (a.data || [])) {
        if (!ps[al.id]) ps[al.id] = { presente: true, justificada: false, observacao: '' }
      }
      setPresencas(ps)
    } catch {} finally { setLoadingAlunos(false) }
  }, [turmaId, disciplinaId, data])

  useEffect(() => { carregar() }, [carregar])

  const carregarEstatisticas = useCallback(async () => {
    if (!turmaId || !disciplinaId) return
    api.get(`/professor/presencas/estatisticas?turma_id=${turmaId}&disciplina_id=${disciplinaId}`)
      .then(r => setEstatisticas(r.data || [])).catch(() => {})
  }, [turmaId, disciplinaId])

  useEffect(() => { if (tab === 'estatisticas') carregarEstatisticas() }, [tab, carregarEstatisticas])

  const toggle = (alunoId) => setPresencas(prev => ({
    ...prev, [alunoId]: { ...prev[alunoId], presente: !prev[alunoId]?.presente, justificada: false }
  }))
  const marcarTodos = (presente) => {
    const novo = {}
    for (const a of alunos) novo[a.id] = { presente, justificada: false, observacao: '' }
    setPresencas(novo)
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await api.post('/professor/presencas', {
        turma_id: parseInt(turmaId), disciplina_id: parseInt(disciplinaId), data,
        presencas: alunos.map(a => ({
          aluno_id: a.id,
          presente: presencas[a.id]?.presente ?? true,
          justificada: presencas[a.id]?.justificada ?? false,
          observacao: presencas[a.id]?.observacao || null,
        }))
      })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const totalPresentes = alunos.filter(a => presencas[a.id]?.presente).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Registar Presenças" subtitle="Marcar presenças e faltas dos alunos" />

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Turma *</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={selCls}>
              <option value="">Seleccionar turma</option>
              {turmas.map(t => <option key={t.turma_id} value={t.turma_id}>{t.turma_nome} · {t.classe_nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Disciplina *</label>
            <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} className={selCls}>
              <option value="">Seleccionar disciplina</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={selCls} max={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => setTab('registo')} className={`flex-1 text-xs py-2.5 rounded-lg border transition-colors ${tab === 'registo' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container-low'}`}>Registo</button>
            <button onClick={() => setTab('estatisticas')} className={`flex-1 text-xs py-2.5 rounded-lg border transition-colors ${tab === 'estatisticas' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-container-low'}`}>Estatísticas</button>
          </div>
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span><p className="text-sm text-green-700">Presenças guardadas!</p></div>}

      {tab === 'registo' && (
        !turmaId || !disciplinaId ? <EmptyState icon="fact_check" title="Seleccione turma e disciplina" description="Escolha a turma e disciplina para registar presenças." />
        : loadingAlunos ? <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
        : alunos.length === 0 ? <EmptyState icon="groups" title="Nenhum aluno matriculado" description="Não existem alunos activos nesta turma." />
        : (
          <>
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low border-b border-outline-variant">
                <div>
                  <span className="text-sm font-semibold text-green-600">{totalPresentes} presentes</span>
                  <span className="text-sm text-on-surface-variant"> · </span>
                  <span className="text-sm font-semibold text-red-600">{alunos.length - totalPresentes} faltas</span>
                  <span className="text-xs text-on-surface-variant ml-2">{data}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => marcarTodos(true)} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200">Todos Presentes</button>
                  <button onClick={() => marcarTodos(false)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200">Todos Faltosos</button>
                </div>
              </div>
              <div className="divide-y divide-outline-variant">
                {alunos.map((a, i) => {
                  const p = presencas[a.id] || { presente: true, justificada: false }
                  return (
                    <div key={a.id} className={`flex items-center gap-4 px-5 py-3 ${!p.presente ? 'bg-red-50/50' : ''}`}>
                      <span className="text-xs text-on-surface-variant w-6 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-on-surface">{a.nome}</p>
                        <p className="text-xs text-on-surface-variant">{a.numero_matricula}</p>
                      </div>
                      <button onClick={() => toggle(a.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${p.presente ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}>
                        <span className="material-symbols-outlined text-[14px]">{p.presente ? 'check_circle' : 'cancel'}</span>
                        {p.presente ? 'Presente' : 'Falta'}
                      </button>
                      {!p.presente && (
                        <button onClick={() => setPresencas(prev => ({ ...prev, [a.id]: { ...prev[a.id], justificada: !p.justificada } }))}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${p.justificada ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                          {p.justificada ? 'Justificada' : 'Justificar'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all shadow-sm">
                {saving ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A guardar...</>
                  : <><span className="material-symbols-outlined text-[16px]">save</span>Guardar Presenças</>}
              </button>
            </div>
          </>
        )
      )}

      {tab === 'estatisticas' && (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Frequência por Aluno</p>
          </div>
          {!turmaId || !disciplinaId ? <p className="text-sm text-on-surface-variant text-center py-8">Seleccione turma e disciplina.</p>
            : estatisticas.length === 0 ? <p className="text-sm text-on-surface-variant text-center py-8">Sem dados de presença registados.</p>
            : <div className="divide-y divide-outline-variant">
              {estatisticas.map((e, i) => {
                const pct = Number(e.pct_presenca || 0)
                return (
                  <div key={e.aluno_id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xs text-on-surface-variant w-6 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{e.aluno_nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-12 text-right ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 font-medium">{e.presentes ?? 0}P</span>
                      <span className="text-red-600 font-medium">{e.faltas ?? 0}F</span>
                      {e.faltas_justificadas > 0 && <span className="text-yellow-600">{e.faltas_justificadas}FJ</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}
    </div>
  )
}
