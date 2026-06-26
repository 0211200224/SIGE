import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const RELATORIOS = [
  { tipo: 'alunos_por_turma', label: 'Alunos por Turma', icon: 'class', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { tipo: 'alunos_por_status', label: 'Alunos por Situação', icon: 'pie_chart', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { tipo: 'matriculas_por_ano', label: 'Matrículas por Ano', icon: 'assignment', color: 'bg-green-50 text-green-700 border-green-200' },
  { tipo: 'transferencias', label: 'Transferências', icon: 'swap_horiz', color: 'bg-amber-50 text-amber-700 border-amber-200' },
]

const STATUS_LABEL = {
  activo: 'Activo', inactivo: 'Inactivo', suspenso: 'Suspenso',
  transferido: 'Transferido', concluido: 'Concluído', desistente: 'Desistente',
}
const TIPO_TRANSF = {
  interna: 'Interna', externa_saida: 'Saída Externa',
  externa_entrada: 'Entrada Externa', mudanca_turma: 'Mudança de Turma', mudanca_curso: 'Mudança de Curso',
}

export default function RelatoriosSecretaria() {
  const [activo, setActivo] = useState('alunos_por_turma')
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (anoFiltro) p.set('ano_lectivo', anoFiltro)
    api.get(`/secretaria/relatorios/${activo}?${p}`)
      .then(r => setDados(r.data || []))
      .catch(() => setDados([]))
      .finally(() => setLoading(false))
  }, [activo, anoFiltro])

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

  const renderTabela = () => {
    if (loading) return (
      <div className="flex justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    )
    if (dados.length === 0) return (
      <div className="text-center py-12 text-on-surface-variant text-sm">Sem dados para apresentar.</div>
    )

    if (activo === 'alunos_por_turma') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turma</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Classe</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Turno</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.turma}</td>
              <td className="px-4 py-3 text-on-surface-variant">{r.classe}</td>
              <td className="px-4 py-3 text-on-surface-variant">{r.turno}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.total}</td>
            </tr>
          ))}
          <tr className="bg-surface-container-low font-bold border-t-2 border-outline-variant">
            <td className="px-4 py-3 text-xs uppercase tracking-wide" colSpan={3}>Total Geral</td>
            <td className="px-4 py-3 text-right text-primary">{dados.reduce((s, r) => s + Number(r.total), 0)}</td>
          </tr>
        </tbody>
      </table>
    )

    if (activo === 'alunos_por_status') return (
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {dados.map((r, i) => (
          <div key={i} className="bg-surface-bright rounded-xl border border-outline-variant p-4 text-center">
            <p className="text-3xl font-bold text-primary">{r.total}</p>
            <p className="text-sm text-on-surface-variant mt-1">{STATUS_LABEL[r.status] || r.status}</p>
          </div>
        ))}
      </div>
    )

    if (activo === 'matriculas_por_ano') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ano Lectivo</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Matriculados</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Cancelados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-semibold">{r.ano_lectivo}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.total}</td>
              <td className="px-4 py-3 text-right text-green-600">{r.matriculados}</td>
              <td className="px-4 py-3 text-right text-red-500">{r.cancelados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (activo === 'transferencias') return (
      <table className="w-full text-sm">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {dados.map((r, i) => (
            <tr key={i} className="hover:bg-surface-container-low/40">
              <td className="px-4 py-3 font-medium">{TIPO_TRANSF[r.tipo] || r.tipo}</td>
              <td className="px-4 py-3 text-on-surface-variant capitalize">{r.status}</td>
              <td className="px-4 py-3 text-right font-bold text-primary">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    return null
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Relatórios" subtitle="Estatísticas e relatórios da Secretaria" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {RELATORIOS.map(r => (
          <button key={r.tipo} onClick={() => setActivo(r.tipo)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
              activo === r.tipo ? r.color + ' border-current' : 'bg-white border-outline-variant hover:bg-surface-bright text-on-surface-variant'
            }`}>
            <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      {['alunos_por_turma', 'matriculas_por_ano', 'transferencias'].includes(activo) && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ano:</label>
          <select value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="font-semibold text-on-surface">{RELATORIOS.find(r => r.tipo === activo)?.label}</h2>
        </div>
        {renderTabela()}
      </div>
    </div>
  )
}
