import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const ROLES = ['director', 'secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']
const ROLE_LABELS = { director: 'Director', secretaria: 'Secretaria', professor: 'Professor', financeiro: 'Financeiro', rh: 'RH', pedagogico: 'Pedagógico', aluno: 'Estudante' }
const ROLE_COLORS = { director: 'bg-indigo-100 text-indigo-700', secretaria: 'bg-blue-100 text-blue-700', professor: 'bg-green-100 text-green-700', financeiro: 'bg-yellow-100 text-yellow-700', rh: 'bg-orange-100 text-orange-700', pedagogico: 'bg-purple-100 text-purple-700', aluno: 'bg-gray-100 text-gray-700' }

export default function Utilizadores() {
  const [utilizadores, setUtilizadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [ativoFilter, setAtivoFilter] = useState('')
  const [actionId, setActionId] = useState(null)
  const [editRole, setEditRole] = useState({ id: null, role: '' })
  const [msg, setMsg] = useState(null)

  const carregar = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    if (ativoFilter !== '') params.set('activo', ativoFilter)
    api.get(`/diretor/utilizadores?${params}`).then(r => setUtilizadores(r || [])).catch(() => setUtilizadores([])).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [search, roleFilter, ativoFilter])

  const showMsg = (txt, tipo = 'success') => {
    setMsg({ txt, tipo })
    setTimeout(() => setMsg(null), 3000)
  }

  const toggleAtivo = async (u) => {
    setActionId(u.id)
    try {
      await api.patch(`/diretor/utilizadores/${u.id}/${u.activo ? 'desativar' : 'ativar'}`)
      showMsg(`Utilizador ${u.activo ? 'desativado' : 'ativado'} com sucesso`)
      carregar()
    } catch { showMsg('Erro ao actualizar', 'error') }
    setActionId(null)
  }

  const salvarRole = async () => {
    try {
      await api.patch(`/diretor/utilizadores/${editRole.id}/role`, { role: editRole.role })
      showMsg('Permissão actualizada')
      setEditRole({ id: null, role: '' })
      carregar()
    } catch { showMsg('Erro ao actualizar permissão', 'error') }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Utilizadores e Permissões" subtitle="Gerir acessos ao sistema" />

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {msg.txt}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar nome ou email..."
          className="flex-1 min-w-48 border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos os perfis</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={ativoFilter} onChange={e => setAtivoFilter(e.target.value)}
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos os estados</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">A carregar...</div>
        ) : utilizadores.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">Nenhum utilizador encontrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-variant text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Perfil</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {utilizadores.map((u) => (
                <tr key={u.id} className="hover:bg-surface-variant/30">
                  <td className="px-4 py-3 font-medium text-on-surface">{u.nome}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                  <td className="px-4 py-3">
                    {editRole.id === u.id ? (
                      <div className="flex items-center gap-2">
                        <select value={editRole.role} onChange={e => setEditRole(p => ({ ...p, role: e.target.value }))}
                          className="border border-outline-variant rounded px-2 py-1 text-xs">
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                        <button onClick={salvarRole} className="text-green-600 hover:text-green-700">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button onClick={() => setEditRole({ id: null, role: '' })} className="text-red-600 hover:text-red-700">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditRole({ id: u.id, role: u.role })}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{u.departamento || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleAtivo(u)}
                      disabled={actionId === u.id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${u.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {actionId === u.id ? '...' : u.activo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-on-surface-variant mt-2 text-right">{utilizadores.length} utilizador(es)</p>
    </div>
  )
}
