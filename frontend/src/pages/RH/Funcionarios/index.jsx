import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const ESTADO_BADGE = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-red-100 text-red-700',
}

export default function Funcionarios() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const carregar = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filtroEstado) q.set('estado', filtroEstado)
    api.get(`/rh/funcionarios?${q}`).then(r => setLista(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [filtroEstado])

  const filtrados = lista.filter(f =>
    !search || f.nome?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo_nome?.toLowerCase().includes(search.toLowerCase()) ||
    f.departamento_nome?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Funcionários"
        subtitle={`${lista.length} funcionário(s) registado(s)`}
        action={
          <Link to="/rh/funcionarios/novo"
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Novo Funcionário
          </Link>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome, cargo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary outline-none">
          <option value="">Todos os estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">badge</span>
          <p className="font-medium">Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-bright border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Funcionário</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Cargo / Dept.</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Tipo Contrato</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Salário Base</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filtrados.map(f => (
                <tr key={f.id} className="hover:bg-surface-bright/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {f.foto
                          ? <img src={f.foto} alt={f.nome} className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                        }
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{f.nome}</p>
                        <p className="text-xs text-on-surface-variant">{f.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-on-surface">{f.cargo_nome || f.role || '—'}</p>
                    <p className="text-xs text-on-surface-variant">{f.departamento_nome || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{f.tipo_contrato || '—'}</td>
                  <td className="px-4 py-3 font-mono text-on-surface">
                    {f.salario_base ? `${parseFloat(f.salario_base).toLocaleString('pt-MZ')} MT` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[f.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/rh/funcionarios/${f.id}`}
                      className="flex items-center gap-1 text-primary text-xs font-medium hover:underline">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
