import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

export default function Dividas() {
  const [dividas, setDividas] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')

  useEffect(() => {
    api.get('/financeiro/dividas')
      .then(r => setDividas(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtradas = dividas.filter(d =>
    !pesquisa || d.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) || (d.numero_matricula || '').includes(pesquisa)
  )

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

      <div className="mb-5">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar aluno..."
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white w-full max-w-sm" />
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Cobranças</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Dívida</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Multa</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Desde</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Atraso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtradas.map((d, i) => (
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
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">{d.num_cobrancas}</span>
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
                  <td className="px-4 py-3 text-right">
                    <Link to={`/financeiro/aluno/${d.aluno_id}`} className="text-primary hover:underline text-xs font-medium">Ver ficha</Link>
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
