import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../../services/api'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

const STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
  isento: 'bg-blue-100 text-blue-700',
}
const PAG_STATUS_CLS = {
  pendente: 'bg-yellow-100 text-yellow-700',
  em_analise: 'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-600',
}

export default function FichaAluno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [financeiro, setFinanceiro] = useState(null)
  const [bolsas, setBolsas] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/secretaria/alunos/${id}`),
      api.get(`/financeiro/contas/aluno/${id}`),
      api.get(`/financeiro/bolsas?aluno_id=${id}`),
    ]).then(([a, f, b]) => {
      setAluno(a.data)
      setFinanceiro(f)
      setBolsas(Array.isArray(b) ? b : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )
  if (!aluno) return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto text-center py-16 text-on-surface-variant">
      <p>Aluno não encontrado.</p>
      <Link to="/financeiro/pesquisar" className="text-primary hover:underline text-sm mt-2 inline-block">Voltar à pesquisa</Link>
    </div>
  )

  const conta = financeiro?.conta
  const cobrancas = financeiro?.cobrancas || []
  const pagamentos = financeiro?.pagamentos || []
  const cobrado = Number(conta?.total_cobrado || 0)
  const pago = Number(conta?.total_pago || 0)
  const dividaBase = cobrancas.filter(c => ['pendente', 'vencido'].includes(c.status)).reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalMultas = cobrancas.reduce((s, c) => s + Number(c.multa_valor || 0), 0)
  const divida = dividaBase + totalMultas
  const pct = cobrado > 0 ? Math.min(100, Math.round((pago / cobrado) * 100)) : 0

  const bolsaAtiva = bolsas.find(b => b.status === 'aprovada')
  const bolsaPendente = bolsas.find(b => b.status === 'pendente')

  const cobrancasAbertas = cobrancas.filter(c => ['pendente', 'vencido'].includes(c.status))
    .sort((a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/financeiro/pesquisar')}
        className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary mb-4 transition-colors">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>Pesquisar outro aluno
      </button>

      {/* Cabeçalho — quem é o aluno */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5 mb-5 flex items-start gap-5 flex-wrap">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden">
          {aluno.foto
            ? <img src={aluno.foto} alt={aluno.nome} className="w-full h-full object-cover" />
            : aluno.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-on-surface">{aluno.nome}</h1>
            {bolsaAtiva && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px]">school</span>Bolseiro
              </span>
            )}
            {bolsaPendente && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Bolsa pendente de decisão
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {aluno.numero_matricula} · {aluno.turma_nome || 'Sem turma'}{aluno.classe_nome ? ` · ${aluno.classe_nome}` : ''}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-on-surface-variant">
            {aluno.nome_encarregado && (
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>Encarregado: {aluno.nome_encarregado}</span>
            )}
            {aluno.tel_encarregado && (
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>{aluno.tel_encarregado}</span>
            )}
            {aluno.data_nascimento && (
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cake</span>{fmtData(aluno.data_nascimento)}</span>
            )}
          </div>
        </div>
        <button onClick={() => navigate(`/financeiro/pagamentos?aluno_id=${aluno.id}`)}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">add_circle</span>Registar Pagamento
        </button>
      </div>

      {bolsaAtiva && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5 text-sm text-purple-800">
          <strong>Bolsa/desconto activo:</strong> {bolsaAtiva.tipo === 'total' ? 'Isenção total' : bolsaAtiva.desconto_pct ? `${bolsaAtiva.desconto_pct}% de desconto` : bolsaAtiva.valor_fixo ? `${fmt(bolsaAtiva.valor_fixo)} fixo` : 'Desconto aplicado'}
          {bolsaAtiva.motivo && <span> — {bolsaAtiva.motivo}</span>}
        </div>
      )}

      {/* Situação financeira */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
          Situação Financeira {conta?.ano_lectivo ? `— ${conta.ano_lectivo}` : ''}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-700">{fmt(cobrado)}</p>
            <p className="text-xs text-blue-600 mt-0.5">Total Cobrado</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-700">{fmt(pago)}</p>
            <p className="text-xs text-green-600 mt-0.5">Total Pago</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${divida > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-lg font-bold ${divida > 0 ? 'text-red-600' : 'text-gray-500'}`}>{fmt(divida)}</p>
            <p className={`text-xs mt-0.5 ${divida > 0 ? 'text-red-500' : 'text-gray-400'}`}>Em Dívida{totalMultas > 0 ? ` (inclui ${fmt(totalMultas)} de multa)` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-on-surface-variant w-10 text-right">{pct}%</span>
        </div>

        {cobrancasAbertas.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Cobranças em aberto</h3>
            <div className="space-y-1.5">
              {cobrancasAbertas.map(c => {
                const atrasado = c.data_vencimento && new Date(c.data_vencimento) < new Date() && c.status !== 'pago'
                const diasAtraso = atrasado ? Math.max(0, Math.floor((new Date() - new Date(c.data_vencimento)) / 86400000)) : 0
                return (
                  <div key={c.id} className="flex items-center justify-between flex-wrap gap-2 bg-surface-bright rounded-lg px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface truncate">{c.taxa_nome || 'Cobrança avulsa'} {c.mes_referencia ? `· ${c.mes_referencia}` : ''}</p>
                      <p className="text-xs text-on-surface-variant">
                        Vencimento: {fmtData(c.data_vencimento)}
                        {diasAtraso > 0 && <span className="text-red-600 font-medium"> · {diasAtraso} dia(s) de atraso</span>}
                        {Number(c.multa_valor) > 0 && <span className="text-red-600 font-medium"> · multa {fmt(c.multa_valor)}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-on-surface">{fmt(Number(c.valor) + Number(c.multa_valor || 0))}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Histórico de pagamentos */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm p-5">
        <h2 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">history</span>
          Histórico de Pagamentos
        </h2>
        {pagamentos.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-6">Nenhum pagamento registado ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {pagamentos.map(p => (
              <div key={p.id} className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg hover:bg-surface-bright transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{p.taxa_nome || 'Avulso'} {p.mes_referencia ? `· ${p.mes_referencia}` : ''}</p>
                  <p className="text-xs text-on-surface-variant">{fmtData(p.data_pagamento || p.criado_em)} · {p.metodo}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-semibold text-on-surface">{fmt(p.valor)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAG_STATUS_CLS[p.estado] || 'bg-gray-100'}`}>{p.estado}</span>
                  {p.numero_recibo && (
                    <Link to={`/financeiro/recibos/${p.id}/imprimir`} title="Imprimir recibo"
                      className="text-primary hover:bg-primary/10 p-1 rounded">
                      <span className="material-symbols-outlined text-[16px]">print</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
