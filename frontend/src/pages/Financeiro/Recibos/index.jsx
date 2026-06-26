import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

export default function Recibos() {
  const [recibos, setRecibos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pesquisa, setPesquisa] = useState('')
  const [mes, setMes] = useState('')
  const [detalhe, setDetalhe] = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (mes) p.set('mes_referencia', mes)
    api.get(`/financeiro/recibos?${p}`)
      .then(r => setRecibos(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [mes])

  const filtrados = recibos.filter(r =>
    !pesquisa || r.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) || (r.numero_recibo || '').includes(pesquisa)
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Recibos" subtitle="Consultar recibos de pagamentos confirmados" />

      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar por aluno ou nº recibo..."
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white flex-1 min-w-48" />
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
        {mes && <button onClick={() => setMes('')} className="px-3 py-1.5 text-sm border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container">Limpar</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="receipt" title="Nenhum recibo encontrado" description="Os recibos são gerados automaticamente após confirmação de pagamento." action={null} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Nº Recibo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Mês Ref.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Data</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtrados.map(r => (
                <tr key={r.id} className="hover:bg-surface-container-low/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{r.numero_recibo || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.aluno_nome}</p>
                    <p className="text-xs text-on-surface-variant">{r.numero_matricula}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{r.turma_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{r.mes_referencia || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(r.valor)}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtData(r.aprovado_em)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetalhe(r)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Ver recibo">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h2 className="text-lg font-bold">Recibo {detalhe.numero_recibo}</h2>
              <button onClick={() => setDetalhe(null)} className="p-1.5 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Aluno</span><span className="font-semibold">{detalhe.aluno_nome}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Matrícula</span><span className="font-mono">{detalhe.numero_matricula}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Turma</span><span>{detalhe.turma_nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Taxa</span><span>{detalhe.taxa_nome || 'Avulso'}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Mês Referência</span><span>{detalhe.mes_referencia || '—'}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Método</span><span>{detalhe.metodo}</span></div>
              {detalhe.referencia && <div className="flex justify-between"><span className="text-on-surface-variant">Comprovativo</span><span>{detalhe.referencia}</span></div>}
              <div className="flex justify-between"><span className="text-on-surface-variant">Confirmado por</span><span>{detalhe.aprovado_por_nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Data</span><span>{fmtData(detalhe.aprovado_em)}</span></div>
              <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
                <span className="font-bold text-on-surface">Valor Total</span>
                <span className="text-2xl font-bold text-green-600">{fmt(detalhe.valor)}</span>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button onClick={() => setDetalhe(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm hover:bg-surface-container">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
