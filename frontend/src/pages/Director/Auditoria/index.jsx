import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const MODULOS = ['utilizadores', 'politicas', 'aprovacoes', 'financeiro', 'pedagogico', 'rh', 'secretaria', 'notas', 'pagamentos', 'salarios']

export default function Auditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ modulo: '', data_inicio: '', data_fim: '', limit: 100 })

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const carregar = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/diretor/auditoria?${params}`).then(r => setLogs(r || [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filters])

  const fmtData = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return `${dt.toLocaleDateString('pt-MZ')} ${dt.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`
  }

  const MODULO_COLORS = {
    utilizadores: 'bg-cyan-100 text-cyan-700',
    politicas: 'bg-purple-100 text-purple-700',
    aprovacoes: 'bg-orange-100 text-orange-700',
    financeiro: 'bg-yellow-100 text-yellow-700',
    pedagogico: 'bg-indigo-100 text-indigo-700',
    rh: 'bg-green-100 text-green-700',
    secretaria: 'bg-blue-100 text-blue-700',
    notas: 'bg-pink-100 text-pink-700',
    pagamentos: 'bg-emerald-100 text-emerald-700',
    salarios: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Auditoria do Sistema" subtitle="Histórico de todas as acções realizadas no sistema" />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <select value={filters.modulo} onChange={e => setF('modulo', e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos os módulos</option>
          {MODULOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input type="date" value={filters.data_inicio} onChange={e => setF('data_inicio', e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <input type="date" value={filters.data_fim} onChange={e => setF('data_fim', e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <select value={filters.limit} onChange={e => setF('limit', e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="50">50 registos</option>
          <option value="100">100 registos</option>
          <option value="200">200 registos</option>
          <option value="500">500 registos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">A carregar...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">Nenhum registo de auditoria encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-variant text-on-surface-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium">Utilizador</th>
                  <th className="text-left px-4 py-3 font-medium">Módulo</th>
                  <th className="text-left px-4 py-3 font-medium">Acção</th>
                  <th className="text-left px-4 py-3 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-variant/30">
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">{fmtData(log.criado_em)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-on-surface">{log.utilizador_nome || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${MODULO_COLORS[log.modulo] || 'bg-gray-100 text-gray-600'}`}>
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface">{log.acao}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant max-w-xs truncate">{log.detalhes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-on-surface-variant mt-2 text-right">{logs.length} registo(s)</p>
    </div>
  )
}
