import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-MZ') : '—'

export default function ImprimirRecibo() {
  const { id } = useParams()
  const { escola } = useAuth()
  const [recibo, setRecibo] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/financeiro/recibos/${id}`).then(r => setRecibo(r)).catch(err => setErro(err.message))
  }, [id])

  if (erro) return (
    <div className="p-10 text-center text-on-surface-variant">
      <p className="font-medium">{erro}</p>
      <p className="text-sm mt-1">Só é possível imprimir recibos de pagamentos já confirmados.</p>
    </div>
  )
  if (!recibo) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )

  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white">
      {/* Barra de acções — não imprime */}
      <div className="print:hidden sticky top-0 bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between z-10">
        <Link to="/financeiro/recibos" className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>Voltar aos recibos
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">print</span>Imprimir Recibo
        </button>
      </div>

      {/* Recibo */}
      <div className="max-w-2xl mx-auto bg-white my-8 p-10 shadow-sm print:shadow-none print:my-0 print:max-w-full rounded-2xl print:rounded-none border border-outline-variant print:border-0">
        <div className="flex items-center justify-between border-b-2 border-on-surface pb-4 mb-6">
          <div className="flex items-center gap-3">
            {escola?.logo && <img src={escola.logo} alt="" className="w-12 h-12 object-contain" />}
            <div>
              <h1 className="text-lg font-bold text-on-surface">{escola?.nome || 'Escola'}</h1>
              {escola?.endereco && <p className="text-xs text-on-surface-variant">{escola.endereco}</p>}
              {escola?.contacto && <p className="text-xs text-on-surface-variant">{escola.contacto}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">Recibo de Pagamento</p>
            <p className="text-lg font-bold font-mono text-primary">{recibo.numero_recibo}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-6">
          <div><span className="text-on-surface-variant">Aluno:</span> <strong>{recibo.aluno_nome}</strong></div>
          <div><span className="text-on-surface-variant">Nº Matrícula:</span> <span className="font-mono">{recibo.numero_matricula}</span></div>
          <div><span className="text-on-surface-variant">Turma:</span> {recibo.turma_nome || '—'}{recibo.classe_nome ? ` (${recibo.classe_nome})` : ''}</div>
          <div><span className="text-on-surface-variant">Mês de Referência:</span> {recibo.mes_referencia || '—'}</div>
        </div>

        <table className="w-full text-sm mb-6 border border-outline-variant rounded-lg overflow-hidden">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Descrição</th>
              <th className="text-left px-3 py-2 font-semibold">Método</th>
              <th className="text-right px-3 py-2 font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-outline-variant">
              <td className="px-3 py-3">{recibo.taxa_nome || 'Pagamento avulso'}</td>
              <td className="px-3 py-3">{recibo.metodo}</td>
              <td className="px-3 py-3 text-right font-semibold">{fmt(recibo.valor)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="text-right">
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">Valor Total Pago</p>
            <p className="text-2xl font-bold text-green-600">{fmt(recibo.valor)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-on-surface-variant border-t border-outline-variant pt-4">
          {recibo.numero_comprovativo && <div>Nº Comprovativo: {recibo.numero_comprovativo}</div>}
          {recibo.referencia && <div>Referência: {recibo.referencia}</div>}
          <div>Confirmado por: {recibo.aprovado_por_nome || '—'}</div>
          <div>Data de emissão: {fmtDataHora(recibo.aprovado_em)}</div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-8">
          Este documento comprova o pagamento acima descrito. Guarde-o para referência futura.
        </p>
      </div>
    </div>
  )
}
