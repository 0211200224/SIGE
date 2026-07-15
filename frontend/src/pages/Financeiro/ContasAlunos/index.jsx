import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'

export default function ContasAlunos() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [pesquisa, setPesquisa] = useState('')

  const load = () => {
    setLoading(true)
    const p = ano ? `?ano_lectivo=${ano}` : ''
    api.get(`/financeiro/contas${p}`)
      .then(r => setContas(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ano])

  const filtradas = contas.filter(c =>
    !pesquisa || c.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) || (c.numero_matricula || '').includes(pesquisa)
  )

  const totais = filtradas.reduce((acc, c) => ({
    cobrado: acc.cobrado + Number(c.total_cobrado || 0),
    pago: acc.pago + Number(c.total_pago || 0),
    divida: acc.divida + Number(c.saldo_devedor || 0),
  }), { cobrado: 0, pago: 0, divida: 0 })

  const anos = []
  for (let y = new Date().getFullYear() + 1; y >= 2020; y--) anos.push(String(y))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Contas de Alunos" subtitle="Saldo cobrado, pago e em dívida por aluno" />

      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar aluno..."
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white flex-1 min-w-48" />
        <select value={ano} onChange={e => setAno(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os anos</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {!loading && filtradas.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Cobrado', value: fmt(totais.cobrado), cls: 'text-blue-700 bg-blue-50' },
            { label: 'Total Pago', value: fmt(totais.pago), cls: 'text-green-700 bg-green-50' },
            { label: 'Total em Dívida', value: fmt(totais.divida), cls: 'text-red-600 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-outline-variant p-4 text-center ${s.cls}`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="account_balance_wallet" title="Nenhuma conta encontrada" description="Gere cobranças para que as contas sejam registadas automaticamente." action={null} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Cobrado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Pago</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Dívida</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtradas.map(c => {
                const divida = Number(c.saldo_devedor || 0)
                const pago = Number(c.total_pago || 0)
                const cobrado = Number(c.total_cobrado || 0)
                const pct = cobrado > 0 ? Math.min(100, Math.round((pago / cobrado) * 100)) : 0
                return (
                  <tr key={c.id} className={`hover:bg-surface-container-low/40 ${divida > 0 ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.aluno_nome}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{c.numero_matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{c.turma_nome || '—'}</td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">{fmt(cobrado)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(pago)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${divida > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(divida)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-on-surface-variant w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
