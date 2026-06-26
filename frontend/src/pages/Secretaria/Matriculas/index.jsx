import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const STATUS_BADGE = {
  activo: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
  transferido: 'bg-yellow-100 text-yellow-700',
}
const TURNO_BADGE = { 'Manhã': 'bg-yellow-100 text-yellow-700', 'Tarde': 'bg-orange-100 text-orange-700', 'Noite': 'bg-indigo-100 text-indigo-700' }

export default function Matriculas() {
  const [matriculas, setMatriculas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTurma, setFilterTurma] = useState('')
  const [filterStatus, setFilterStatus] = useState('activo')
  const [filterAno, setFilterAno] = useState(new Date().getFullYear().toString())

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterTurma) params.set('class_group_id', filterTurma)
    if (filterStatus) params.set('status', filterStatus)
    if (filterAno) params.set('ano_lectivo', filterAno)
    api.get(`/secretaria/matriculas?${params}`)
      .then(r => setMatriculas(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterTurma, filterStatus, filterAno])

  useEffect(() => {
    api.get('/secretaria/turmas').then(r => setTurmas(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancelar = async (id) => {
    if (!window.confirm('Cancelar esta matrícula?')) return
    try { await api.delete(`/secretaria/matriculas/${id}`); load() }
    catch (err) { alert(err.message) }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Matrículas" subtitle="Matrículas por turma e ano lectivo"
        action={
          <Link to="/secretaria/matriculas/nova"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Matrícula
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os estados</option>
          <option value="activo">Activo</option>
          <option value="cancelado">Cancelado</option>
          <option value="transferido">Transferido</option>
        </select>
        <input value={filterAno} onChange={e => setFilterAno(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary w-28"
          placeholder="Ano lectivo" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : matriculas.length === 0 ? (
        <EmptyState icon="assignment" title="Nenhuma matrícula encontrada"
          description="Crie uma nova matrícula para associar alunos às turmas." />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant">
            <span className="text-sm font-medium text-on-surface">{matriculas.length} registo{matriculas.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {matriculas.map(m => (
                <tr key={m.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/secretaria/alunos/${m.aluno_id}`} className="hover:text-primary transition-colors">
                      <p className="font-semibold text-on-surface">{m.aluno_nome}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{m.numero_matricula}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{m.turma_nome}</p>
                    <p className="text-xs text-on-surface-variant">{m.classe_nome}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TURNO_BADGE[m.turno] || 'bg-gray-100 text-gray-600'}`}>{m.turno}</span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{m.ano_lectivo}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{new Date(m.data_matricula).toLocaleDateString('pt-MZ')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[m.status] || 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.status === 'activo' && (
                      <button onClick={() => handleCancelar(m.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    )}
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
