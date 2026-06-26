import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { api } from '../../services/api'

export default function ProfessorPortal() {
  const { user } = useAuth()
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/professor/minhas-turmas').then(r => {
      const por_turma = {}
      for (const a of (r.data || [])) {
        if (!por_turma[a.turma_id]) {
          por_turma[a.turma_id] = { turma_id: a.turma_id, turma_nome: a.turma_nome, classe_nome: a.classe_nome, total_alunos: a.total_alunos, disciplinas: [] }
        }
        por_turma[a.turma_id].disciplinas.push(a.disciplina_nome)
      }
      setTurmas(Object.values(por_turma))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalAlunos = turmas.reduce((s, t) => s + Number(t.total_alunos || 0), 0)

  const modulos = [
    { path: '/professor/turmas', icon: 'class', label: 'Minhas Turmas', desc: 'Ver turmas e alunos atribuídos', color: 'bg-blue-500' },
    { path: '/professor/notas', icon: 'grade', label: 'Lançar Notas', desc: 'Registar avaliações dos alunos', color: 'bg-green-500' },
    { path: '/professor/presencas', icon: 'fact_check', label: 'Registar Presenças', desc: 'Marcar presença e faltas diárias', color: 'bg-purple-500' },
    { path: '/professor/pautas', icon: 'print', label: 'Pautas', desc: 'Gerar e imprimir pautas de avaliação', color: 'bg-orange-500' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Portal do Professor"
        subtitle={`Bem-vindo, ${user?.nome?.split(' ')[0] || 'Professor'}. Gerencie as suas turmas, notas e presenças.`}
        action={
          <Link to="/professor/notas"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">grade</span>
            Lançar Notas
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-blue-500 text-2xl mb-2">class</span>
          <p className="text-2xl font-bold text-blue-700">{loading ? '—' : turmas.length}</p>
          <p className="text-xs text-blue-600">Turmas</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-green-500 text-2xl mb-2">groups</span>
          <p className="text-2xl font-bold text-green-700">{loading ? '—' : totalAlunos}</p>
          <p className="text-xs text-green-600">Alunos</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-purple-500 text-2xl mb-2">subject</span>
          <p className="text-2xl font-bold text-purple-700">{loading ? '—' : turmas.reduce((s, t) => s + t.disciplinas.length, 0)}</p>
          <p className="text-xs text-purple-600">Disciplinas</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-orange-500 text-2xl mb-2">today</span>
          <p className="text-2xl font-bold text-orange-700">{new Date().toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' })}</p>
          <p className="text-xs text-orange-600">Hoje</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modulos.map((m) => (
          <Link key={m.path} to={m.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="material-symbols-outlined text-white">{m.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[20px]">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
