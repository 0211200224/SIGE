import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const STATUS_BADGE = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-500',
  transferido: 'bg-yellow-100 text-yellow-700',
  desistente: 'bg-red-100 text-red-600',
}

const getInitials = (nome) => nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
const GENERO_LABEL = { M: 'Masculino', F: 'Feminino' }

// Vista de impressão -- só visível via CSS de impressão (hidden print:block),
// nunca no ecrã. Mostra exactamente a lista já filtrada no ecrã (nome,
// género, turma), com estatísticas gerais e por género, e a identidade da
// escola (logotipo/cor), mesmo padrão já usado nos recibos e na folha de
// pagamento.
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
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cor }}>Lista de Alunos</p>
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
            <th className="text-left px-2 py-1.5 text-white font-semibold">Turma</th>
            <th className="text-left px-2 py-1.5 text-white font-semibold">Género</th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((a, i) => (
            <tr key={a.id} className="border-b border-gray-200">
              <td className="px-2 py-1 text-gray-500">{i + 1}</td>
              <td className="px-2 py-1 font-medium">{a.nome}</td>
              <td className="px-2 py-1 font-mono text-gray-600">{a.numero_matricula || '—'}</td>
              <td className="px-2 py-1 text-gray-600">{a.turma_nome || '—'}</td>
              <td className="px-2 py-1 text-gray-600">{GENERO_LABEL[a.genero] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[8px] text-gray-400 mt-4">Documento gerado pelo SIGE — Sistema Integrado de Gestão Escolar</p>
    </div>
  )
}

export default function AlunosList() {
  const navigate = useNavigate()
  const { escola } = useAuth()
  const toast = useToast()
  const confirmar = useConfirm()
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTurma, setFilterTurma] = useState('')
  const [filterGenero, setFilterGenero] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    if (filterTurma) params.set('class_group_id', filterTurma)
    if (filterGenero) params.set('genero', filterGenero)
    api.get(`/secretaria/alunos?${params}`)
      .then(r => setAlunos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, filterStatus, filterTurma, filterGenero])

  useEffect(() => {
    api.get('/secretaria/turmas').then(r => setTurmas(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleInactivar = async (e, id, nome) => {
    e.stopPropagation()
    const ok = await confirmar({
      title: 'Inactivar aluno?',
      body: `"${nome}" deixa de aparecer como activo. Pode voltar a activar mais tarde, se necessário.`,
      danger: true, confirmLabel: 'Inactivar',
    })
    if (!ok) return
    try {
      await api.delete(`/secretaria/alunos/${id}`)
      toast.success(`"${nome}" foi inactivado com sucesso.`)
      load()
    } catch (err) { toast.error(err.message) }
  }

  const hasFilters = search || filterStatus || filterTurma || filterGenero

  const filtrosTexto = [
    filterTurma ? `Turma: ${turmas.find(t => String(t.id) === String(filterTurma))?.nome || ''}` : null,
    filterStatus ? `Estado: ${filterStatus}` : null,
    filterGenero ? `Género: ${GENERO_LABEL[filterGenero]}` : null,
    search ? `Pesquisa: "${search}"` : null,
  ].filter(Boolean).join(' · ') || 'Todos os alunos'

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="print:hidden">
      <PageHeader title="Lista de Alunos" subtitle={`${alunos.length} aluno${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => window.print()} disabled={!alunos.length}
              className="flex items-center gap-2 bg-white border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-surface-bright transition-all disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir Lista
            </button>
            <Link to="/secretaria/alunos/novo"
              className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Novo Aluno
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nome ou número de matrícula..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="transferido">Transferido</option>
          <option value="desistente">Desistente</option>
        </select>
        <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.classe_nome}</option>)}
        </select>
        <select value={filterGenero} onChange={e => setFilterGenero(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os géneros</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterTurma(''); setFilterGenero('') }}
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
          description={hasFilters ? 'Tente ajustar os filtros.' : 'Comece por registar o primeiro aluno.'} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Aluno</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Código de Acesso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nº Matrícula</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Género</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {alunos.map(a => (
                  <tr key={a.id} onClick={() => navigate(`/secretaria/alunos/${a.id}`)}
                    className="hover:bg-surface-container-low/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {getInitials(a.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{a.nome}</p>
                          {a.telefone && <p className="text-xs text-on-surface-variant">{a.telefone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.codigo_acesso
                        ? <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold bg-primary/8 text-primary px-2.5 py-1 rounded-lg border border-primary/15">
                            <span className="material-symbols-outlined text-[13px]">badge</span>
                            {a.codigo_acesso}
                          </span>
                        : <span className="text-xs text-on-surface-variant italic">Sem conta</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{a.numero_matricula || '—'}</td>
                    <td className="px-4 py-3">
                      {a.turma_nome
                        ? <div><p className="font-medium text-xs">{a.turma_nome}</p><p className="text-xs text-on-surface-variant">{a.classe_nome}</p></div>
                        : <span className="text-on-surface-variant text-xs italic">Sem turma</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{a.genero === 'M' ? 'Masculino' : a.genero === 'F' ? 'Feminino' : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/secretaria/alunos/${a.id}`}
                          className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                        {a.status === 'activo' && (
                          <button onClick={(e) => handleInactivar(e, a.id, a.nome)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[18px]">person_off</span>
                          </button>
                        )}
                      </div>
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
