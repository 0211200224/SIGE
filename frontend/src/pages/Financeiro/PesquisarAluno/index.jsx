import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

export default function PesquisarAluno() {
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')

  useEffect(() => {
    api.get('/secretaria/alunos').then(r => setAlunos(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtrados = pesquisa.trim().length >= 1
    ? alunos.filter(a =>
        a.nome?.toLowerCase().includes(pesquisa.toLowerCase()) ||
        (a.numero_matricula || '').toLowerCase().includes(pesquisa.toLowerCase())
      ).slice(0, 30)
    : []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Pesquisar Aluno" subtitle="Encontre o aluno para ver a situação financeira e registar pagamentos" />

      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[22px]">search</span>
        <input
          autoFocus
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
          placeholder="Escreva o nome ou número de matrícula do aluno..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-outline-variant bg-white text-base shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : pesquisa.trim().length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">person_search</span>
          <p className="font-medium">Comece a escrever para encontrar um aluno</p>
          <p className="text-sm mt-1">Clique no aluno para abrir a ficha financeira</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
          <p className="font-medium">Nenhum aluno encontrado para "{pesquisa}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtrados.map(a => (
            <button key={a.id} onClick={() => navigate(`/financeiro/aluno/${a.id}`)}
              className="flex items-center gap-3 bg-white rounded-xl border border-outline-variant shadow-sm p-4 text-left hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                {a.foto
                  ? <img src={a.foto} alt={a.nome} className="w-full h-full object-cover" />
                  : a.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-on-surface truncate">{a.nome}</p>
                <p className="text-xs text-on-surface-variant font-mono">{a.numero_matricula}</p>
                <p className="text-xs text-on-surface-variant">{a.turma_nome || 'Sem turma'}{a.classe_nome ? ` · ${a.classe_nome}` : ''}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0">chevron_right</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
