import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import { useOrdenacao } from '../../../hooks/useOrdenacao'
import { ThOrdenavel } from '../../../components/ui/Ordenacao'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

export default function Dividas() {
  const [dividas, setDividas] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')

  useEffect(() => {
    api.get('/financeiro/dividas')
      .then(r => setDividas(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Opções de turma a partir dos próprios dados -- nunca uma lista à parte
  // que podia ficar desalinhada com quem realmente tem dívida.
  const turmasComDivida = [...new Set(dividas.map(d => d.turma_nome).filter(Boolean))].sort()

  const classificarSituacao = (d) => {
    if (Number(d.num_vencidas) > 0) return 'atrasado'
    if (Number(d.num_parciais) > 0) return 'parcial'
    return 'pendente'
  }

  const filtradas = dividas.filter(d =>
    (!pesquisa || d.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) || (d.numero_matricula || '').includes(pesquisa)) &&
    (!filtroTurma || d.turma_nome === filtroTurma) &&
    (!filtroSituacao || classificarSituacao(d) === filtroSituacao)
  )

  // Por omissão como vem do servidor (maior dívida primeiro); qualquer coluna ordena
  const ord = useOrdenacao(filtradas, {
    aluno: { valor: d => d.aluno_nome }, turma: { valor: d => d.turma_nome },
    meses: { valor: d => (d.meses_em_divida || []).length, tipo: 'numero' },
    divida: { valor: d => d.total_divida, tipo: 'numero' }, multa: { valor: d => d.total_multas, tipo: 'numero' },
    total: { valor: d => d.total_geral ?? d.total_divida, tipo: 'numero' },
    desde: { valor: d => d.vencimento_mais_antigo, tipo: 'data' }, atraso: { valor: d => d.dias_atraso, tipo: 'numero' },
    situacao: { valor: d => classificarSituacao(d) },
  }, { chave: 'total', direcao: 'desc' })
  const totalDivida = filtradas.reduce((s, d) => s + Number(d.total_geral ?? d.total_divida ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader title="Dívidas" subtitle="Alunos com cobranças em atraso ou por pagar" />

      {!loading && dividas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600 text-2xl">money_off</span>
          <div>
            <p className="font-bold text-red-800">{dividas.length} aluno(s) com dívida activa</p>
            <p className="text-sm text-red-700">Total em dívida: <strong>{fmt(totalDivida)}</strong></p>
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar aluno..."
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white flex-1 max-w-sm" />
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmasComDivida.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as situações</option>
          <option value="atrasado">Em Atraso</option>
          <option value="parcial">Inclui Parcial</option>
          <option value="pendente">Pendente (dentro do prazo)</option>
        </select>
        {(filtroTurma || filtroSituacao) && (
          <button onClick={() => { setFiltroTurma(''); setFiltroSituacao('') }}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="check_circle" title={pesquisa ? 'Nenhum resultado' : 'Sem dívidas activas'} description={pesquisa ? 'Nenhum aluno encontrado com essa pesquisa.' : 'Todos os alunos estão em dia com os seus pagamentos.'} action={null} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <ThOrdenavel ord={ord} chave="aluno" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Aluno</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="turma" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Turma</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="meses" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Meses em Dívida</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="divida" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Dívida</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="multa" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Multa</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="total" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Total</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="desde" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Desde</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="atraso" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Atraso</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="situacao" align="center" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Situação</ThOrdenavel>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {ord.ordenados.map((d, i) => (
                <tr key={i} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{d.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant font-mono">{d.numero_matricula}</p>
                    {d.aluno_status !== 'activo' && <span className="text-xs text-amber-600 font-medium capitalize">{d.aluno_status}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    <p>{d.turma_nome || '—'}</p>
                    <p>{d.classe_nome || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(d.meses_em_divida || []).map(m => (
                        <span key={m} className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[11px] font-mono border border-red-100">{m}</span>
                      ))}
                      {!d.meses_em_divida?.length && <span className="text-xs text-on-surface-variant">{d.num_cobrancas} cobr.</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{fmt(d.total_divida)}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(d.total_multas) > 0 ? <span className="text-red-600 font-medium">{fmt(d.total_multas)}</span> : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-red-600 text-base">{fmt(d.total_geral ?? d.total_divida)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(d.vencimento_mais_antigo)}</td>
                  <td className="px-4 py-3 text-xs">
                    {Number(d.dias_atraso) > 0
                      ? <span className="text-red-600 font-semibold">{d.dias_atraso} dia{d.dias_atraso !== 1 ? 's' : ''}</span>
                      : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const sit = classificarSituacao(d)
                      const SIT_CLS = { atrasado: 'bg-red-100 text-red-700', parcial: 'bg-blue-100 text-blue-700', pendente: 'bg-amber-100 text-amber-700' }
                      const SIT_LABEL = { atrasado: 'Em Atraso', parcial: 'Inclui Parcial', pendente: 'Pendente' }
                      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SIT_CLS[sit]}`}>{SIT_LABEL[sit]}</span>
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {d.taxa_id_mais_antiga && (
                        <Link to={`/financeiro/pagamentos?aluno_id=${d.aluno_id}&taxa_id=${d.taxa_id_mais_antiga}&mes_referencia=${d.mes_mais_antigo || ''}&valor=${d.valor_restante_mais_antiga}`}
                          className="flex items-center gap-1 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:-translate-y-0.5 transition-all">
                          <span className="material-symbols-outlined text-[14px]">payments</span>Pagar
                        </Link>
                      )}
                      <Link to={`/financeiro/aluno/${d.aluno_id}`} className="text-primary hover:underline text-xs font-medium">Ver ficha</Link>
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
  )
}
