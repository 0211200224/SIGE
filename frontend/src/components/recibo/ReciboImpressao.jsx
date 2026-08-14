import { Link } from 'react-router-dom'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-MZ') : '—'

// Uma "via" do recibo — impresso duas vezes na mesma página (ver componente
// principal) para poder ser rasgado ao meio: uma via fica na escola, a outra
// vai com quem pagou.
function ReciboVia({ recibo, escola, via }) {
  return (
    <div className="border border-outline-variant print:border print:border-black rounded-2xl print:rounded-none p-6 print:p-4" style={{ breakInside: 'avoid' }}>
      <div className="flex items-center justify-between border-b-2 border-on-surface print:border-black pb-3 mb-4">
        <div className="flex items-center gap-3">
          {escola?.logo && <img src={escola.logo} alt="" className="w-10 h-10 object-contain" />}
          <div>
            <h1 className="text-base font-bold text-on-surface">{escola?.nome || 'Escola'}</h1>
            {escola?.endereco && <p className="text-[11px] text-on-surface-variant">{escola.endereco}</p>}
            {escola?.contacto && <p className="text-[11px] text-on-surface-variant">{escola.contacto}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Recibo de Pagamento</p>
          <p className="text-base font-bold font-mono text-primary print:text-black">{recibo.numero_recibo}</p>
          <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mt-0.5">{via}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-4">
        <div><span className="text-on-surface-variant">Aluno:</span> <strong>{recibo.aluno_nome}</strong></div>
        <div><span className="text-on-surface-variant">Nº Matrícula:</span> <span className="font-mono">{recibo.numero_matricula}</span></div>
        <div><span className="text-on-surface-variant">Turma:</span> {recibo.turma_nome || '—'}{recibo.classe_nome ? ` (${recibo.classe_nome})` : ''}</div>
        <div><span className="text-on-surface-variant">Mês de Referência:</span> {recibo.mes_referencia || '—'}</div>
      </div>

      <table className="w-full text-xs mb-4 border border-outline-variant print:border-black rounded-lg print:rounded-none overflow-hidden">
        <thead className="bg-surface-container-low print:bg-white">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Descrição</th>
            <th className="text-left px-3 py-2 font-semibold">Método</th>
            <th className="text-right px-3 py-2 font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-outline-variant print:border-black">
            <td className="px-3 py-2">{recibo.taxa_nome || 'Pagamento avulso'}</td>
            <td className="px-3 py-2">{recibo.metodo}</td>
            <td className="px-3 py-2 text-right font-semibold">{fmt(recibo.valor)}</td>
          </tr>
        </tbody>
      </table>

      {!!recibo.iva_aplicado && (
        <div className="flex justify-end mb-3">
          <div className="text-right text-[11px] text-on-surface-variant space-y-0.5">
            <p>Base Tributável: <span className="font-mono text-on-surface">{fmt(recibo.valor_base_tributavel)}</span></p>
            <p>IVA ({Number(recibo.taxa_iva_aplicada || 0).toFixed(2)}%): <span className="font-mono text-on-surface">{fmt(recibo.valor_iva)}</span></p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <div className="text-right">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Valor Total Pago{!!recibo.iva_aplicado && ' (IVA incluído)'}</p>
          <p className="text-xl font-bold text-green-600 print:text-black">{fmt(recibo.valor)}</p>
        </div>
      </div>

      {recibo.observacoes && (
        <div className="mb-4 text-xs border border-outline-variant print:border-black rounded-lg print:rounded-none p-2.5">
          <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Observações</p>
          <p className="text-on-surface">{recibo.observacoes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-on-surface-variant border-t border-outline-variant print:border-black pt-3">
        {recibo.numero_comprovativo && <div>Nº Comprovativo: {recibo.numero_comprovativo}</div>}
        {recibo.referencia && <div>Referência: {recibo.referencia}</div>}
        <div>Data de Pagamento: <strong className="text-on-surface">{fmtData(recibo.data_pagamento)}</strong></div>
        <div>Data de Emissão: {fmtDataHora(recibo.aprovado_em)}</div>
        <div>Confirmado por: {recibo.aprovado_por_nome || '—'}</div>
      </div>
    </div>
  )
}

// Página de impressão completa, partilhada entre o portal Financeiro
// (director/financeiro, qualquer aluno) e o portal do Estudante (só o
// próprio recibo) — cada um só muda a fonte dos dados e o link de "voltar".
export default function ReciboImpressao({ recibo, escola, backTo, backLabel }) {
  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white">
      {/* Barra de acções — não imprime */}
      <div className="print:hidden sticky top-0 bg-white border-b border-outline-variant px-4 sm:px-6 py-3 flex items-center flex-wrap gap-2 justify-between z-10">
        <Link to={backTo} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>{backLabel}
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">print</span>Imprimir Recibo
        </button>
      </div>

      {/* Recibo — impresso em duplicado (via da escola / via do cliente) para
          poder ser rasgado ao meio pela linha tracejada. */}
      <div className="max-w-2xl mx-auto bg-white my-8 p-4 sm:p-6 shadow-sm print:shadow-none print:my-0 print:p-4 print:max-w-full rounded-2xl print:rounded-none border border-outline-variant print:border-0 space-y-0">
        <ReciboVia recibo={recibo} escola={escola} via="Via da Escola" />

        <div className="flex items-center gap-3 py-4 print:py-3 text-on-surface-variant">
          <div className="flex-1 border-t border-dashed border-outline-variant print:border-black" />
          <span className="material-symbols-outlined text-[16px] rotate-90">content_cut</span>
          <div className="flex-1 border-t border-dashed border-outline-variant print:border-black" />
        </div>

        <ReciboVia recibo={recibo} escola={escola} via="Via do Cliente" />
      </div>
    </div>
  )
}
