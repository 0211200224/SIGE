import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { api } from '../../services/api'

const corNota = (v) => {
  if (v === null || v === undefined) return 'text-on-surface-variant'
  const n = Number(v)
  if (n >= 14) return 'text-green-600'
  if (n >= 10) return 'text-blue-600'
  return 'text-red-600'
}

export default function EstudantePortal() {
  const { user } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [notas, setNotas] = useState([])
  const [presencas, setPresencas] = useState([])
  const [financeiro, setFinanceiro] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/estudante/perfil'),
      api.get('/estudante/notas'),
      api.get('/estudante/presencas'),
      api.get('/estudante/financeiro'),
    ]).then(([p, n, pr, f]) => {
      setPerfil(p.data)
      setNotas(n.data || [])
      setPresencas(pr.data || [])
      setFinanceiro(f.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Calcular médias por disciplina (todas as notas)
  const mediaGeral = (() => {
    if (!notas.length) return null
    const medias = {}
    for (const n of notas) {
      if (!medias[n.disciplina_id]) medias[n.disciplina_id] = []
      if (n.valor !== null && n.valor !== undefined) medias[n.disciplina_id].push(Number(n.valor))
    }
    const vals = Object.values(medias).map(arr => arr.reduce((s, v) => s + v, 0) / arr.length).filter(v => !isNaN(v))
    if (!vals.length) return null
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10
  })()

  const totalAulas = presencas.length
  const totalFaltas = presencas.filter(p => !p.presente).length
  const taxaPresenca = totalAulas ? Math.round(((totalAulas - totalFaltas) / totalAulas) * 100) : null

  const notasBaixas = (() => {
    const medias = {}
    for (const n of notas) {
      if (!medias[n.disciplina_id]) medias[n.disciplina_id] = { nome: n.disciplina_nome, vals: [] }
      if (n.valor !== null && n.valor !== undefined) medias[n.disciplina_id].vals.push(Number(n.valor))
    }
    return Object.values(medias)
      .map(d => ({ nome: d.nome, media: d.vals.length ? Math.round(d.vals.reduce((s, v) => s + v, 0) / d.vals.length * 10) / 10 : null }))
      .filter(d => d.media !== null && d.media < 10)
  })()

  const alertas = [
    ...notasBaixas.map(d => ({ tipo: 'nota', msg: `Nota baixa em ${d.nome}: ${d.media} valores`, cor: 'bg-red-50 border-red-200 text-red-700', icon: 'warning' })),
    ...(taxaPresenca !== null && taxaPresenca < 75 ? [{ tipo: 'presenca', msg: `Taxa de presença baixa: ${taxaPresenca}% (mínimo 75%)`, cor: 'bg-orange-50 border-orange-200 text-orange-700', icon: 'event_busy' }] : []),
    ...(financeiro?.cobrancasPendentes?.length ? [{ tipo: 'financeiro', msg: `${financeiro.cobrancasPendentes.length} pagamento(s) pendente(s)`, cor: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: 'payments' }] : []),
  ]

  const modulos = [
    { path: '/estudante/perfil', icon: 'person', label: 'Dados Pessoais', desc: 'Ver informações da sua matrícula', color: 'bg-teal-500' },
    { path: '/estudante/notas', icon: 'grade', label: 'Notas e Médias', desc: 'Consultar avaliações por disciplina', color: 'bg-blue-500' },
    { path: '/estudante/presencas', icon: 'fact_check', label: 'Presenças', desc: 'Ver registo de presenças e faltas', color: 'bg-purple-500' },
    { path: '/estudante/financeiro', icon: 'payments', label: 'Financeiro', desc: 'Pagamentos, recibos e dívidas', color: 'bg-green-500' },
    { path: '/estudante/boletim', icon: 'print', label: 'Boletim', desc: 'Imprimir ou baixar boletim', color: 'bg-orange-500' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Portal do Estudante"
        subtitle={`Bem-vindo, ${user?.nome?.split(' ')[0] || 'Estudante'}. Aqui podes acompanhar o teu percurso académico.`}
      />

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 border rounded-xl p-3.5 ${a.cor}`}>
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">{a.icon}</span>
              <p className="text-sm font-medium">{a.msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
          <span className="material-symbols-outlined text-teal-500 text-2xl mb-2">class</span>
          <p className="text-lg font-bold text-teal-700 truncate">{perfil?.turma_nome || '—'}</p>
          <p className="text-xs text-teal-600">Turma · {perfil?.classe || '—'}</p>
        </div>
        <div className={`border rounded-xl p-4 ${mediaGeral === null ? 'bg-gray-50 border-gray-100' : mediaGeral >= 10 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${mediaGeral === null ? 'text-gray-400' : mediaGeral >= 10 ? 'text-blue-500' : 'text-red-500'}`}>grade</span>
          <p className={`text-2xl font-bold ${mediaGeral === null ? 'text-gray-500' : corNota(mediaGeral)}`}>{mediaGeral ?? '—'}</p>
          <p className={`text-xs ${mediaGeral === null ? 'text-gray-500' : mediaGeral >= 10 ? 'text-blue-600' : 'text-red-600'}`}>Média Geral</p>
        </div>
        <div className={`border rounded-xl p-4 ${taxaPresenca === null ? 'bg-gray-50 border-gray-100' : taxaPresenca >= 75 ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${taxaPresenca === null ? 'text-gray-400' : taxaPresenca >= 75 ? 'text-purple-500' : 'text-orange-500'}`}>fact_check</span>
          <p className={`text-2xl font-bold ${taxaPresenca === null ? 'text-gray-500' : taxaPresenca >= 75 ? 'text-purple-700' : 'text-orange-700'}`}>{taxaPresenca !== null ? `${taxaPresenca}%` : '—'}</p>
          <p className={`text-xs ${taxaPresenca === null ? 'text-gray-500' : taxaPresenca >= 75 ? 'text-purple-600' : 'text-orange-600'}`}>Presenças</p>
        </div>
        <div className={`border rounded-xl p-4 ${!financeiro?.cobrancasPendentes?.length ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <span className={`material-symbols-outlined text-2xl mb-2 ${!financeiro?.cobrancasPendentes?.length ? 'text-green-500' : 'text-yellow-500'}`}>payments</span>
          <p className={`text-2xl font-bold ${!financeiro?.cobrancasPendentes?.length ? 'text-green-700' : 'text-yellow-700'}`}>
            {financeiro?.cobrancasPendentes?.length ?? 0}
          </p>
          <p className={`text-xs ${!financeiro?.cobrancasPendentes?.length ? 'text-green-600' : 'text-yellow-600'}`}>Pendentes</p>
        </div>
      </div>

      {/* Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modulos.map((m) => (
          <Link key={m.path} to={m.path}
            className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="material-symbols-outlined text-white">{m.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{m.label}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{m.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[20px]">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
