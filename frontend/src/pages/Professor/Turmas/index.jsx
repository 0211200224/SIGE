import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

export default function ProfessorTurmas() {
  const [atribuicoes, setAtribuicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [alunos, setAlunos] = useState({})
  const [loadingAlunos, setLoadingAlunos] = useState(null)

  useEffect(() => {
    api.get('/professor/minhas-turmas')
      .then(r => {
        // agrupar por turma
        const por_turma = {}
        for (const a of (r.data || [])) {
          if (!por_turma[a.turma_id]) {
            por_turma[a.turma_id] = {
              turma_id: a.turma_id, turma_nome: a.turma_nome,
              classe_nome: a.classe_nome, turno: a.turno,
              total_alunos: a.total_alunos, ano_lectivo: a.ano_lectivo,
              disciplinas: []
            }
          }
          por_turma[a.turma_id].disciplinas.push({
            id: a.disciplina_id, nome: a.disciplina_nome, codigo: a.disciplina_codigo
          })
        }
        setAtribuicoes(Object.values(por_turma))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleTurma = async (turmaId) => {
    if (expandida === turmaId) { setExpandida(null); return }
    setExpandida(turmaId)
    if (!alunos[turmaId]) {
      setLoadingAlunos(turmaId)
      try {
        const r = await api.get(`/professor/turmas/${turmaId}/alunos`)
        setAlunos(prev => ({ ...prev, [turmaId]: r.data || [] }))
      } catch { setAlunos(prev => ({ ...prev, [turmaId]: [] })) }
      finally { setLoadingAlunos(null) }
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Turmas Atribuídas" subtitle="As turmas e disciplinas que lecciona este ano" />

      {atribuicoes.length === 0 ? (
        <EmptyState icon="class" title="Sem turmas atribuídas"
          description="O director pedagógico ainda não criou atribuições para si. Contacte a administração." />
      ) : (
        <div className="space-y-4">
          {atribuicoes.map(t => (
            <div key={t.turma_id} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <button onClick={() => toggleTurma(t.turma_id)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-container-lowest transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">class</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">{t.turma_nome}</h3>
                    <p className="text-sm text-on-surface-variant">{t.classe_nome} · {t.turno} · {t.ano_lectivo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xl font-bold text-on-surface">{t.total_alunos}</p>
                    <p className="text-xs text-on-surface-variant">alunos</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-w-48 justify-end">
                    {t.disciplinas.map(d => (
                      <span key={d.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.nome}</span>
                    ))}
                  </div>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${expandida === t.turma_id ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </button>

              {expandida === t.turma_id && (
                <div className="border-t border-outline-variant">
                  <div className="flex gap-3 px-5 py-3 bg-surface-container-lowest border-b border-outline-variant">
                    <Link to={`/professor/notas?turma_id=${t.turma_id}`}
                      className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">grade</span>Lançar Notas
                    </Link>
                    <Link to={`/professor/presencas?turma_id=${t.turma_id}`}
                      className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">fact_check</span>Registar Presenças
                    </Link>
                    <Link to={`/professor/pautas?turma_id=${t.turma_id}`}
                      className="flex items-center gap-1.5 text-xs border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[14px]">print</span>Pauta
                    </Link>
                  </div>

                  {loadingAlunos === t.turma_id ? (
                    <div className="flex justify-center py-6"><span className="material-symbols-outlined animate-spin text-primary">progress_activity</span></div>
                  ) : (alunos[t.turma_id] || []).length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-6">Nenhum aluno matriculado</p>
                  ) : (
                    <div className="divide-y divide-outline-variant">
                      {(alunos[t.turma_id] || []).map((a, i) => (
                        <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="text-xs font-mono text-on-surface-variant w-6 text-right flex-shrink-0">{i + 1}</span>
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {a.nome?.charAt(0)}
                          </div>
                          <span className="text-sm text-on-surface flex-1">{a.nome}</span>
                          <span className="text-xs text-on-surface-variant font-mono">{a.numero_matricula}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
