import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import { useOrdenacao } from '../../../hooks/useOrdenacao'
import { ThOrdenavel } from '../../../components/ui/Ordenacao'

const fmt = (v) => Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT'
const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

// Situação clara por aluno, por ordem de prioridade: uma só cobrança em
// atraso já torna o aluno "Em Atraso", mesmo que as outras estejam em dia --
// é a pior situação que deve saltar à vista primeiro. Nunca inferida só do
// saldo devedor (esse não distingue "em atraso" de "só ainda não venceu").
const classificarSituacao = (c) => {
  if (Number(c.num_atrasadas) > 0) return 'atrasado'
  if (Number(c.num_parciais) > 0) return 'parcial'
  if (Number(c.num_pendentes) > 0) return 'pendente'
  return 'em_dia'
}
const SIT_CLS = {
  atrasado: 'bg-red-100 text-red-700',
  parcial: 'bg-blue-100 text-blue-700',
  pendente: 'bg-amber-100 text-amber-700',
  em_dia: 'bg-green-100 text-green-700',
}
const SIT_LABEL = { atrasado: 'Em Atraso', parcial: 'Parcial', pendente: 'Pendente', em_dia: 'Em Dia' }
const SIT_ICON = { atrasado: 'warning', parcial: 'pie_chart', pendente: 'schedule', em_dia: 'check_circle' }
const COBR_SIT_CLS = { pago: 'bg-green-100 text-green-700', parcial: 'bg-blue-100 text-blue-700', pendente: 'bg-amber-100 text-amber-700', vencido: 'bg-red-100 text-red-700', cancelado: 'bg-gray-100 text-gray-500', isento: 'bg-blue-100 text-blue-700' }

// Detalhe mês a mês / tipo a tipo de um aluno -- aberto ao clicar numa
// linha, para responder a "o que pagou, quando, de quê" sem ter de somar
// tudo de cabeça a partir só do total anual.
function DetalheAluno({ alunoId, anoLectivo }) {
  const [cobrancas, setCobrancas] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/financeiro/contas/aluno/${alunoId}?ano_lectivo=${anoLectivo}`)
      .then(r => setCobrancas(r?.cobrancas || []))
      .catch(() => setErro('Não foi possível carregar o detalhe.'))
  }, [alunoId, anoLectivo])

  if (erro) return <p className="text-xs text-red-600 px-4 py-3">{erro}</p>
  if (cobrancas === null) return (
    <div className="flex justify-center py-4"><span className="material-symbols-outlined animate-spin text-primary text-xl">progress_activity</span></div>
  )
  if (cobrancas.length === 0) return <p className="text-xs text-on-surface-variant px-4 py-3">Sem cobranças registadas neste ano.</p>

  // Já vem do backend ordenado do mais recente para o mais antigo
  // (criado_em DESC) -- nunca reordenado aqui por mês, que ficaria a
  // mostrar o mais antigo primeiro.
  const ordenadas = cobrancas

  return (
    <div className="px-4 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-on-surface-variant">
            <th className="text-left py-1.5 font-semibold uppercase">Vencimento</th>
            <th className="text-left py-1.5 font-semibold uppercase">Mês</th>
            <th className="text-left py-1.5 font-semibold uppercase">Tipo</th>
            <th className="text-right py-1.5 font-semibold uppercase">Cobrado</th>
            <th className="text-right py-1.5 font-semibold uppercase">Pago</th>
            <th className="text-right py-1.5 font-semibold uppercase">Em Falta</th>
            <th className="text-center py-1.5 font-semibold uppercase">Estado</th>
            <th className="py-1.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {ordenadas.map(c => {
            const falta = Number(c.valor) - Number(c.valor_pago || 0)
            const podeCompletar = ['pendente', 'vencido', 'parcial'].includes(c.status) && falta > 0
            return (
              <tr key={c.id}>
                <td className="py-1.5 font-mono">{fmtData(c.data_vencimento)}</td>
                <td className="py-1.5 font-mono">{c.mes_referencia || '—'}</td>
                <td className="py-1.5">{c.taxa_nome || '—'}</td>
                <td className="py-1.5 text-right">{fmt(c.valor)}</td>
                <td className="py-1.5 text-right text-green-600">{fmt(c.valor_pago)}</td>
                <td className="py-1.5 text-right font-semibold">{fmt(falta)}</td>
                <td className="py-1.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${COBR_SIT_CLS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                </td>
                <td className="py-1.5 text-right">
                  {podeCompletar && (
                    <Link to={`/financeiro/pagamentos?aluno_id=${alunoId}&taxa_id=${c.taxa_id}&mes_referencia=${c.mes_referencia || ''}&valor=${falta}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 bg-primary text-on-primary px-2 py-1 rounded-lg text-[11px] font-semibold hover:-translate-y-0.5 transition-all w-fit ml-auto">
                      <span className="material-symbols-outlined text-[12px]">payments</span>
                      {c.status === 'parcial' ? 'Completar' : 'Pagar'}
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ContasAlunos() {
  const [contas, setContas] = useState([])
  const [taxas, setTaxas] = useState([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [pesquisa, setPesquisa] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroTaxa, setFiltroTaxa] = useState('')
  const [expandido, setExpandido] = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (ano) p.set('ano_lectivo', ano)
    if (filtroMes) p.set('mes_referencia', filtroMes)
    if (filtroTaxa) p.set('taxa_id', filtroTaxa)
    Promise.all([
      api.get(`/financeiro/contas?${p}`).catch(() => []),
      api.get('/financeiro/taxas').catch(() => []),
    ]).then(([c, t]) => {
      setContas(Array.isArray(c) ? c : [])
      setTaxas(Array.isArray(t) ? t : [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ano, filtroMes, filtroTaxa])

  // Opções de turma a partir dos próprios dados -- nunca uma lista à parte
  // que podia ficar desalinhada com quem realmente tem conta neste ano.
  const turmasComConta = [...new Set(contas.map(c => c.turma_nome).filter(Boolean))].sort()

  const filtradas = contas.filter(c =>
    (!pesquisa || c.aluno_nome?.toLowerCase().includes(pesquisa.toLowerCase()) || (c.numero_matricula || '').includes(pesquisa)) &&
    (!filtroTurma || c.turma_nome === filtroTurma) &&
    (!filtroSituacao || classificarSituacao(c) === filtroSituacao)
  )

  // Com filtro de mês activo, os totais e as colunas Cobrado/Pago mostram o
  // valor desse mês específico (mes_cobrado/mes_pago, vindos do backend) --
  // sem isso, "filtrar por mês" só escondia alunos sem alterar os números,
  // que continuavam a ser do ano inteiro.
  const campoCobrado = filtroMes ? 'mes_cobrado' : 'total_cobrado'
  const campoPago = filtroMes ? 'mes_pago' : 'total_pago'
  // Por omissão como vem do servidor (maior dívida primeiro); qualquer coluna ordena
  const num = (c, k) => Number(c[k] || 0)
  const ord = useOrdenacao(filtradas, {
    aluno: { valor: c => c.aluno_nome }, turma: { valor: c => c.turma_nome },
    cobrado: { valor: c => num(c, campoCobrado), tipo: 'numero' }, pago: { valor: c => num(c, campoPago), tipo: 'numero' },
    divida: { valor: c => num(c, campoCobrado) - num(c, campoPago), tipo: 'numero' },
    pct: { valor: c => (num(c, campoCobrado) > 0 ? num(c, campoPago) / num(c, campoCobrado) : null), tipo: 'numero' },
    situacao: { valor: c => classificarSituacao(c) },
  }, { chave: 'divida', direcao: 'desc' })

  const totais = filtradas.reduce((acc, c) => {
    const cobrado = Number(c[campoCobrado] || 0)
    const pago = Number(c[campoPago] || 0)
    return { cobrado: acc.cobrado + cobrado, pago: acc.pago + pago, divida: acc.divida + (cobrado - pago) }
  }, { cobrado: 0, pago: 0, divida: 0 })

  const contagens = contas.reduce((acc, c) => {
    const s = classificarSituacao(c)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const anos = []
  for (let y = new Date().getFullYear() + 1; y >= 2020; y--) anos.push(String(y))

  const hasFilters = pesquisa || filtroTurma || filtroSituacao || filtroMes || filtroTaxa

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <PageHeader title="Contas de Alunos" subtitle="Quem pagou, quem está parcial, quem está pendente e quem está em atraso — com detalhe mês a mês e tipo a tipo" />

      {/* Totais de dinheiro (do grupo filtrado -- do mês seleccionado, se houver filtro de mês) */}
      {!loading && contas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          {[
            { label: filtroMes ? `Cobrado em ${filtroMes}` : 'Total Cobrado (ano)', value: fmt(totais.cobrado), cls: 'text-blue-700 bg-blue-50' },
            { label: filtroMes ? `Pago em ${filtroMes}` : 'Total Pago (ano)', value: fmt(totais.pago), cls: 'text-green-700 bg-green-50' },
            { label: filtroMes ? `Em Dívida em ${filtroMes}` : 'Total em Dívida (ano)', value: fmt(totais.divida), cls: 'text-red-600 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-outline-variant p-4 text-center ${s.cls}`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Situação de cada aluno -- clicar filtra a tabela abaixo. Contagens
          sempre do total da escola (não do filtro), para servir de atalho. */}
      {!loading && contas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {['em_dia', 'pendente', 'parcial', 'atrasado'].map(s => (
            <button key={s} onClick={() => setFiltroSituacao(f => f === s ? '' : s)}
              className={`rounded-xl p-3 text-center border transition-all flex items-center justify-center gap-2 ${
                filtroSituacao === s ? 'border-current ' + SIT_CLS[s] : 'border-outline-variant bg-surface-bright hover:bg-surface-container'
              }`}>
              <span className="material-symbols-outlined text-[18px]">{SIT_ICON[s]}</span>
              <span>
                <span className="text-lg font-bold block leading-tight">{contagens[s] || 0}</span>
                <span className="text-[11px] font-medium">{SIT_LABEL[s]}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar aluno..."
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white flex-1 min-w-48" />
        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todas as turmas</option>
          {turmasComConta.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroTaxa} onChange={e => setFiltroTaxa(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os tipos de cobrança</option>
          {taxas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white" />
        <select value={ano} onChange={e => setAno(e.target.value)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos os anos</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setPesquisa(''); setFiltroTurma(''); setFiltroSituacao(''); setFiltroMes(''); setFiltroTaxa('') }}
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface px-2 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>Limpar filtros
          </button>
        )}
      </div>
      {filtroMes && (
        <p className="text-xs text-on-surface-variant -mt-3 mb-4">
          A mostrar apenas alunos com cobrança em {filtroMes}{filtroTaxa ? ` do tipo seleccionado` : ''}. Os valores de Cobrado/Pago/Dívida acima e na tabela referem-se só a esse mês.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="account_balance_wallet" title={contas.length === 0 ? 'Nenhuma conta encontrada' : 'Nenhum resultado com estes filtros'}
          description={contas.length === 0 ? 'Gere cobranças para que as contas sejam registadas automaticamente.' : 'Tente ajustar a pesquisa, turma, mês, tipo ou situação.'} action={null} />
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <ThOrdenavel ord={ord} chave="aluno" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Aluno</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="turma" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Turma</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="cobrado" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{filtroMes ? 'Cobrado no mês' : 'Cobrado (ano)'}</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="pago" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">{filtroMes ? 'Pago no mês' : 'Pago (ano)'}</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="divida" align="right" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Em Dívida</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="pct" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">% Pago</ThOrdenavel>
                <ThOrdenavel ord={ord} chave="situacao" align="center" className="px-4 py-3 text-xs font-semibold text-on-surface-variant">Situação</ThOrdenavel>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {ord.ordenados.map(c => {
                const cobrado = Number(c[campoCobrado] || 0)
                const pago = Number(c[campoPago] || 0)
                const divida = cobrado - pago
                const pct = cobrado > 0 ? Math.min(100, Math.round((pago / cobrado) * 100)) : 0
                const sit = classificarSituacao(c)
                const aberto = expandido === c.aluno_id
                return (
                  <Fragment key={c.id}>
                  <tr onClick={() => setExpandido(aberto ? null : c.aluno_id)}
                    className="hover:bg-surface-container-low/40 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform ${aberto ? 'rotate-90' : ''}`}>chevron_right</span>
                        <div>
                          <p className="font-semibold">{c.aluno_nome}</p>
                          <p className="text-xs text-on-surface-variant font-mono">{c.numero_matricula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      <p>{c.turma_nome || '—'}</p>
                      <p>{c.classe_nome || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">{fmt(cobrado)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(pago)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${divida > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(divida)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-on-surface-variant w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${SIT_CLS[sit]}`}>
                        <span className="material-symbols-outlined text-[13px]">{SIT_ICON[sit]}</span>{SIT_LABEL[sit]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <Link to={`/financeiro/aluno/${c.aluno_id}`} className="text-primary hover:underline text-xs font-medium">Ver ficha</Link>
                    </td>
                  </tr>
                  {aberto && (
                    <tr>
                      <td colSpan={8} className="bg-surface-container-lowest border-t border-outline-variant">
                        <DetalheAluno alunoId={c.aluno_id} anoLectivo={c.ano_lectivo} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
