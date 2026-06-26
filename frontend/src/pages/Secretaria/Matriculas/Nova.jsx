import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"

export default function MatriculaNova() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [form, setForm] = useState({
    aluno_id: searchParams.get('aluno_id') || '',
    class_group_id: '',
    ano_lectivo: new Date().getFullYear().toString(),
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/secretaria/alunos'),
      api.get('/secretaria/turmas'),
    ]).then(([a, t]) => {
      setAlunos(a.data || [])
      setTurmas(t.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const alunosFiltrados = alunos.filter(a =>
    !alunoSearch || a.nome.toLowerCase().includes(alunoSearch.toLowerCase()) || a.numero_matricula?.includes(alunoSearch)
  )

  const alunoSelecionado = alunos.find(a => a.id == form.aluno_id)
  const turmaSelecionada = turmas.find(t => t.id == form.class_group_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.aluno_id || !form.class_group_id) { setError('Aluno e turma são obrigatórios'); return }
    setSaving(true)
    try {
      await api.post('/secretaria/matriculas', {
        aluno_id: parseInt(form.aluno_id),
        class_group_id: parseInt(form.class_group_id),
        ano_lectivo: form.ano_lectivo,
        observacoes: form.observacoes || null,
      })
      navigate('/secretaria/matriculas')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Nova Matrícula" subtitle="Associar um aluno a uma turma" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-6">

        {/* Selecção do aluno */}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
            1. Seleccionar Aluno *
          </label>
          {alunoSelecionado ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {alunoSelecionado.nome?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{alunoSelecionado.nome}</p>
                  <p className="text-xs text-on-surface-variant">{alunoSelecionado.numero_matricula}</p>
                </div>
              </div>
              <button type="button" onClick={() => set('aluno_id', '')}
                className="text-xs text-primary hover:underline">Alterar</button>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input value={alunoSearch} onChange={e => setAlunoSearch(e.target.value)}
                  placeholder="Pesquisar aluno por nome ou nº matrícula..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-outline-variant text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="border border-outline-variant rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {alunosFiltrados.slice(0, 20).map(a => (
                  <button key={a.id} type="button" onClick={() => set('aluno_id', a.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low text-left border-b border-outline-variant last:border-b-0 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {a.nome?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{a.nome}</p>
                      <p className="text-xs text-on-surface-variant">{a.numero_matricula} {a.turma_nome ? `· ${a.turma_nome}` : ''}</p>
                    </div>
                  </button>
                ))}
                {alunosFiltrados.length === 0 && (
                  <p className="text-center text-sm text-on-surface-variant py-4">Nenhum aluno encontrado</p>
                )}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                Não encontra o aluno? <Link to="/secretaria/alunos/novo" className="text-primary hover:underline">Registar novo aluno</Link>
              </p>
            </div>
          )}
        </div>

        {/* Selecção da turma */}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
            2. Seleccionar Turma *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {turmas.map(t => {
              const pct = Math.round(((t.total_alunos || 0) / t.capacidade) * 100)
              const cheio = (t.total_alunos || 0) >= t.capacidade
              return (
                <button key={t.id} type="button"
                  onClick={() => !cheio && set('class_group_id', t.id)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    form.class_group_id == t.id ? 'border-primary bg-primary/5'
                    : cheio ? 'border-outline-variant opacity-50 cursor-not-allowed'
                    : 'border-outline-variant hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm text-on-surface">{t.nome}</p>
                    {cheio && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">Lotado</span>}
                  </div>
                  <p className="text-xs text-on-surface-variant">{t.classe_nome} · {t.turno}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                      <span>{t.total_alunos || 0} alunos</span>
                      <span>{t.capacidade} lugares</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {turmas.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              Não há turmas criadas. <Link to="/pedagogico/turmas" className="text-primary hover:underline">Criar turmas</Link>
            </p>
          )}
        </div>

        {/* Ano e observações */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Ano Lectivo</label>
            <input value={form.ano_lectivo} onChange={e => set('ano_lectivo', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Observações</label>
            <input value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              className={inputCls} placeholder="Opcional" />
          </div>
        </div>

        {/* Resumo */}
        {alunoSelecionado && turmaSelecionada && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-1">Confirmar Matrícula</p>
            <p className="text-sm text-green-700">
              <strong>{alunoSelecionado.nome}</strong> será matriculado na turma <strong>{turmaSelecionada.nome}</strong> ({turmaSelecionada.classe_nome}) para o ano lectivo <strong>{form.ano_lectivo}</strong>.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
          <button type="button" onClick={() => navigate('/secretaria/matriculas')}
            className="px-5 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low border border-outline-variant transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !form.aluno_id || !form.class_group_id}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
            {saving
              ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A matricular...</>
              : <><span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>Confirmar Matrícula</>}
          </button>
        </div>
      </form>
    </div>
  )
}
