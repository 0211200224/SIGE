import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const STATUS_BADGE = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-500',
  transferido: 'bg-yellow-100 text-yellow-700',
  desistente: 'bg-red-100 text-red-600',
}

const GENERO_LABEL = { M: 'Masculino', F: 'Feminino' }

// Vista de impressão -- só visível via CSS de impressão (hidden print:block).
// Mesmo padrão já usado na lista de alunos da Secretaria e nos recibos do
// Financeiro: identidade da escola, filtros aplicados, estatísticas gerais e
// por género, tabela nome/matrícula/turma/género.
function ListaAlunosImpressao({ alunos, escola, filtrosTexto }) {
  const cor = escola?.cor_principal || '#1a2b4b'
  const totalM = alunos.filter(a => a.genero === 'M').length
  const totalF = alunos.filter(a => a.genero === 'F').length
  const semGenero = alunos.length - totalM - totalF

  return (
    <div className="hidden print:block">
      <div className="flex items-start justify-between border-b-[3px] pb-3 mb-4" style={{ borderColor: cor }}>
        <div className="flex items-center gap-3">
          {escola?.logo && <img src={escola.logo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />}
          <div>
            <h1 className="text-base font-bold" style={{ color: cor }}>{escola?.nome || 'Escola'}</h1>
            {escola?.localizacao && <p className="text-[10px] text-gray-500">{escola.localizacao}</p>}
            {escola?.contacto && <p className="text-[10px] text-gray-500">{escola.contacto}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cor }}>Lista de Alunos — Pedagógico</p>
          {filtrosTexto && <p className="text-[10px] text-gray-600 mt-0.5">{filtrosTexto}</p>}
          <p className="text-[9px] text-gray-400 mt-1">Emitido em {new Date().toLocaleString('pt-MZ')}</p>
        </div>
      </div>

      <div className={`grid ${semGenero > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-4`}>
        <div className="border border-gray-300 rounded p-2 text-center">
          <p className="text-lg font-bold" style={{ color: cor }}>{alunos.length}</p>
          <p className="text-[9px] uppercase tracking-wide text-gray-500">Total</p>
        </div>
        <div className="border border-gray-300 rounded p-2 text-center">
          <p className="text-lg font-bold text-gray-800">{totalM}</p>
          <p className="text-[9px] uppercase tracking-wide text-gray-500">Masculino</p>
        </div>
        <div className="border border-gray-300 rounded p-2 text-center">
          <p className="text-lg font-bold text-gray-800">{totalF}</p>
          <p className="text-[9px] uppercase tracking-wide text-gray-500">Feminino</p>
        </div>
        {semGenero > 0 && (
          <div className="border border-gray-300 rounded p-2 text-center">
            <p className="text-lg font-bold text-gray-800">{semGenero}</p>
            <p className="text-[9px] uppercase tracking-wide text-gray-500">Não indicado</p>
          </div>
        )}
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: cor }}>
            <th className="text-left px-2 py-1.5 text-white font-semibold">#</th>
            <th className="text-left px-2 py-1.5 text-white font-semibold">Nome</th>
            <th className="text-left px-2 py-1.5 text-white font-semibold">Nº Matrícula</th>
            <th className="text-left px-2 py-1.5 text-white font-semibold">Classe / Turma</th>
            <th className="text-left px-2 py-1.5 text-white font-semibold">Género</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((a, i) => (
            <tr key={a.id} className="border-b border-gray-200">
              <td className="px-2 py-1 text-gray-500">{i + 1}</td>
              <td className="px-2 py-1 font-medium">{a.nome}</td>
              <td className="px-2 py-1 font-mono text-gray-600">{a.numero_matricula || '—'}</td>
              <td className="px-2 py-1 text-gray-600">{[a.classe_nome, a.turma_nome].filter(Boolean).join(' — ') || '—'}</td>
              <td className="px-2 py-1 text-gray-600">{GENERO_LABEL[a.genero] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[8px] text-gray-400 mt-4">Documento gerado pelo SIGE — Sistema Integrado de Gestão Escolar</p>
    </div>
  )
}

export default function AlunosPedagogico() {
  const { escola } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [classes, setClasses] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClasse, setFilterClasse] = useState('')
  const [filterTurma, setFilterTurma] = useState('')
  const [filterAno, setFilterAno] = useState('')
  const [filterGenero, setFilterGenero] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterClasse) params.set('grade_level_id', filterClasse)
    if (filterTurma) params.set('class_group_id', filterTurma)
    if (filterAno) params.set('ano_lectivo', filterAno)
    if (filterGenero) params.set('genero', filterGenero)
    api.get(`/pedagogico/alunos?${params}`)
      .then(r => setAlunos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, filterClasse, filterTurma, filterAno, filterGenero])

  useEffect(() => {
    Promise.all([
      api.get('/pedagogico/classes'),
      api.get('/pedagogico/turmas'),
    ]).then(([c, t]) => { setClasses(c.data || []); setTurmas(t.data || []) }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const anosLectivos = useMemo(
    () => [...new Set(turmas.map(t => t.ano_lectivo).filter(Boolean))].sort().reverse(),
    [turmas]
  )
  const turmasDaClasse = useMemo(
    () => filterClasse ? turmas.filter(t => String(t.grade_level_id) === String(filterClasse)) : turmas,
    [turmas, filterClasse]
  )

  const hasFilters = search || filterClasse || filterTurma || filterAno || filterGenero

  const totalM = alunos.filter(a => a.genero === 'M').length
  const totalF = alunos.filter(a => a.genero === 'F').length

  const filtrosTexto = [
    filterClasse ? `Classe: ${classes.find(c => String(c.id) === String(filterClasse))?.nome || ''}` : null,
    filterTurma ? `Turma: ${turmas.find(t => String(t.id) === String(filterTurma))?.nome || ''}` : null,
    filterAno ? `Ano Lectivo: ${filterAno}` : null,
    filterGenero ? `Género: ${GENERO_LABEL[filterGenero]}` : null,
    search ? `Pesquisa: "${search}"` : null,
  ].filter(Boolean).join(' · ') || 'Todos os alunos'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="print:hidden">
        <PageHeader title="Lista de Alunos" subtitle={`${alunos.length} aluno${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''} — vista de controlo do Pedagógico`}
          action={
            <button onClick={() => window.print()} disabled={!alunos.length}
              className="flex items-center gap-2 bg-white border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-surface-bright transition-all disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir Lista
            </button>
          }
        />

        {!loading && alunos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5 max-w-md">
            <div className="bg-white rounded-xl border border-outline-variant p-3 text-center">
              <p className="text-xl font-bold text-on-surface">{alunos.length}</p>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Total</p>
            </div>
            <div className="bg-white rounded-xl border border-outline-variant p-3 text-center">
              <p className="text-xl font-bold text-on-surface">{totalM}</p>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Masculino</p>
            </div>
            <div className="bg-white rounded-xl border border-outline-variant p-3 text-center">
              <p className="text-xl font-bold text-on-surface">{totalF}</p>
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Feminino</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nome ou número de matrícula..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={filterClasse} onChange={e => { setFilterClasse(e.target.value); setFilterTurma('') }}
            className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todas as classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todas as turmas</option>
            {turmasDaClasse.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todos os anos</option>
            {anosLectivos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterGenero} onChange={e => setFilterGenero(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
            <option value="">Todos os géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterClasse(''); setFilterTurma(''); setFilterAno(''); setFilterGenero('') }}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface px-2 py-2 rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[16px]">close</span>Limpar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : alunos.length === 0 ? (
          <EmptyState icon="groups" title="Nenhum aluno encontrado"
            description={hasFilters ? 'Tente ajustar os filtros.' : 'Ainda não há alunos matriculados.'} />
        ) : (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nº Matrícula</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Classe / Turma</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ano Lectivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Género</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {alunos.map(a => (
                    <tr key={a.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-on-surface">{a.nome}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{a.numero_matricula || '—'}</td>
                      <td className="px-4 py-3">
                        {a.turma_nome
                          ? <div><p className="font-medium text-xs">{a.classe_nome}</p><p className="text-xs text-on-surface-variant">{a.turma_nome}</p></div>
                          : <span className="text-on-surface-variant text-xs italic">Sem turma</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{a.ano_lectivo || '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">{GENERO_LABEL[a.genero] || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-600'}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ListaAlunosImpressao alunos={alunos} escola={escola} filtrosTexto={filtrosTexto} />
    </div>
  )
}
