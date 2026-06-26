import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const TIPOS_NOTA = ['Teste 1', 'Teste 2', 'Trabalho', 'Oral', 'Exame']
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

const corNota = (v) => {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (n >= 14) return 'text-green-600 font-bold'
  if (n >= 10) return 'text-blue-600'
  return 'text-red-600 font-bold'
}

export default function ProfessorNotas() {
  const [searchParams] = useSearchParams()
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [notasExistentes, setNotasExistentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [turmaId, setTurmaId] = useState(searchParams.get('turma_id') || '')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [trimestre, setTrimestre] = useState('1')
  const [tiposAtivos, setTiposAtivos] = useState(['Teste 1', 'Teste 2'])
  // notas[aluno_id][tipo] = valor
  const [notas, setNotas] = useState({})

  const [disciplinas, setDisciplinas] = useState([])

  // Carregar turmas atribuídas
  useEffect(() => {
    api.get('/professor/minhas-turmas').then(r => {
      const por_turma = {}
      for (const a of (r.data || [])) {
        if (!por_turma[a.turma_id]) {
          por_turma[a.turma_id] = { turma_id: a.turma_id, turma_nome: a.turma_nome, classe_nome: a.classe_nome, disciplinas: [] }
        }
        por_turma[a.turma_id].disciplinas.push({ id: a.disciplina_id, nome: a.disciplina_nome })
      }
      setTurmas(Object.values(por_turma))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Quando muda turma, actualiza disciplinas disponíveis
  useEffect(() => {
    const t = turmas.find(t => t.turma_id == turmaId)
    setDisciplinas(t?.disciplinas || [])
    setDisciplinaId(t?.disciplinas[0]?.id || '')
  }, [turmaId, turmas])

  // Carregar alunos + notas existentes
  const carregarAlunos = useCallback(async () => {
    if (!turmaId || !disciplinaId) return
    setLoadingAlunos(true)
    try {
      const [a, n] = await Promise.all([
        api.get(`/professor/turmas/${turmaId}/alunos`),
        api.get(`/professor/notas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&trimestre=${trimestre}`),
      ])
      setAlunos(a.data || [])
      const ns = {}
      for (const nota of (n.data || [])) {
        if (!ns[nota.aluno_id]) ns[nota.aluno_id] = {}
        ns[nota.aluno_id][nota.tipo] = nota.valor
      }
      setNotas(ns)
      setNotasExistentes(n.data || [])
    } catch {}
    finally { setLoadingAlunos(false) }
  }, [turmaId, disciplinaId, trimestre])

  useEffect(() => { carregarAlunos() }, [carregarAlunos])

  const setNota = (alunoId, tipo, valor) => {
    setNotas(prev => ({ ...prev, [alunoId]: { ...(prev[alunoId] || {}), [tipo]: valor } }))
  }

  const media = (alunoId) => {
    const ns = notas[alunoId] || {}
    const vals = tiposAtivos.map(t => Number(ns[t])).filter(v => !isNaN(v) && ns[Object.keys(ns).find(k => k === Object.keys({}).find(() => {}) )])
    const allVals = tiposAtivos.map(t => ns[t]).filter(v => v !== undefined && v !== '' && v !== null).map(Number)
    if (!allVals.length) return null
    return Math.round(allVals.reduce((s, v) => s + v, 0) / allVals.length * 10) / 10
  }

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    const batch = []
    for (const aluno of alunos) {
      for (const tipo of tiposAtivos) {
        const v = notas[aluno.id]?.[tipo]
        batch.push({ aluno_id: aluno.id, tipo, valor: (v !== '' && v !== undefined) ? v : null, observacoes: null })
      }
    }
    try {
      await api.post('/professor/notas/lote', { turma_id: parseInt(turmaId), disciplina_id: parseInt(disciplinaId), trimestre: parseInt(trimestre), notas: batch })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const turmaSelecionada = turmas.find(t => t.turma_id == turmaId)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Lançar Notas" subtitle="Registar avaliações dos alunos por turma e disciplina" />

      {/* Selecção */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipos de Nota</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TIPOS_NOTA.map(t => (
                <button key={t} type="button"
                  onClick={() => setTiposAtivos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${tiposAtivos.includes(t) ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
          <p className="text-sm text-green-700">Notas guardadas com sucesso!</p>
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
            <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low border-b border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {alunos.length} alunos · {turmaSelecionada?.turma_nome}
              </p>
              <div className="flex items-center gap-3">
                {tiposAtivos.length > 0 && (
                  <p className="text-xs text-on-surface-variant">Escala: 0–20</p>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant">
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-on-surface-variant min-w-40">Aluno</th>
                    {tiposAtivos.map(t => (
                      <th key={t} className="px-3 py-3 text-xs font-medium text-on-surface-variant text-center min-w-24">{t}</th>
                    ))}
                    <th className="px-4 py-3 text-xs font-medium text-on-surface-variant text-center w-20">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((a, i) => {
                    const med = (() => {
                      const vals = tiposAtivos.map(t => notas[a.id]?.[t]).filter(v => v !== undefined && v !== '' && v !== null).map(Number)
                      if (!vals.length) return null
                      return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10
                    })()
                    return (
                      <tr key={a.id} className={`border-b border-outline-variant last:border-b-0 ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/40'}`}>
                        <td className="px-4 py-2.5 text-xs text-on-surface-variant">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-on-surface">{a.nome}</p>
                          <p className="text-xs text-on-surface-variant">{a.numero_matricula}</p>
                        </td>
                        {tiposAtivos.map(tipo => (
                          <td key={tipo} className="px-3 py-2.5">
                            <input
                              type="number" min="0" max="20" step="0.5"
                              value={notas[a.id]?.[tipo] ?? ''}
                              onChange={e => setNota(a.id, tipo, e.target.value)}
                              className={`w-full text-center rounded-lg border border-outline-variant px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${corNota(notas[a.id]?.[tipo])}`}
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-center">
                          {med !== null ? (
                            <span className={`text-sm font-bold ${corNota(med)}`}>{med}</span>
                          ) : <span className="text-xs text-on-surface-variant">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all shadow-sm">
              {saving ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A guardar...</>
                : <><span className="material-symbols-outlined text-[16px]">save</span>Guardar Notas</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
