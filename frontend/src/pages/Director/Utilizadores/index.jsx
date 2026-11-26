import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { useConfirm } from '../../../contexts/ConfirmContext'
import PageHeader from '../../../components/ui/PageHeader'
import { PORTAIS_EQUIPA } from '../../../services/rhConstantes'

const ROLES = ['director', 'secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']
const ROLE_LABELS = { director: 'Director', secretaria: 'Secretaria', professor: 'Professor', financeiro: 'Financeiro', rh: 'RH', pedagogico: 'Pedagógico', aluno: 'Estudante' }
const ROLE_COLORS = { director: 'bg-indigo-100 text-indigo-700', secretaria: 'bg-blue-100 text-blue-700', professor: 'bg-green-100 text-green-700', financeiro: 'bg-yellow-100 text-yellow-700', rh: 'bg-orange-100 text-orange-700', pedagogico: 'bg-purple-100 text-purple-700', aluno: 'bg-gray-100 text-gray-700' }
const fmtData = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-MZ') : ''

// Dar acesso a mais um portal sem recriar a conta nem tirar o que já tem.
function ModalConcederPortal({ utilizador, onClose, onSaved }) {
  const jaTem = [utilizador.role, ...(utilizador.portais_extra || []).filter(p => !p.expirado).map(p => p.portal)]
  const disponiveis = PORTAIS_EQUIPA.filter(p => !jaTem.includes(p.v))
  const [portal, setPortal] = useState(disponiveis[0]?.v || '')
  const [temporario, setTemporario] = useState(false)
  const [validoAte, setValidoAte] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [concedido, setConcedido] = useState(null) // { portal, codigo }
  const hoje = new Date().toISOString().slice(0, 10)

  const guardar = async () => {
    if (!portal) return setErro('Seleccione o portal.')
    if (temporario && !validoAte) return setErro('Indique até quando o acesso temporário é válido.')
    setSaving(true); setErro('')
    try {
      const r = await api.post(`/diretor/utilizadores/${utilizador.id}/portais`, { portal, valido_ate: temporario ? validoAte : null })
      setConcedido({ portal: r.portal, codigo: r.codigo })
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  if (concedido) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600">check_circle</span>
          </div>
          <h3 className="font-semibold text-on-surface">Acesso concedido</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-4">
          Informe <b>{utilizador.nome}</b> do código do portal <b>{ROLE_LABELS[concedido.portal] || concedido.portal}</b>. A senha é a mesma que já usa.
        </p>
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5 text-center">
          <p className="text-xs text-on-surface-variant mb-1">Código de entrada</p>
          <p className="font-mono font-bold text-primary text-2xl tracking-wider">{concedido.codigo}</p>
        </div>
        <button onClick={onSaved} className="w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold">Fechar</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-on-surface">Dar acesso a outro portal</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          <b>{utilizador.nome}</b> continua com os acessos que já tem e com o mesmo código de entrada.
        </p>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        {disponiveis.length === 0 ? (
          <p className="text-sm text-on-surface-variant bg-surface-bright rounded-lg p-3">Este utilizador já tem acesso a todos os portais.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {disponiveis.map(p => (
                <button key={p.v} type="button" onClick={() => setPortal(p.v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all ${portal === p.v ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-outline-variant hover:bg-surface-bright'}`}>
                  <span className="material-symbols-outlined text-[18px]">{p.icon}</span>{p.l}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!temporario} onChange={() => setTemporario(false)} />
                Definitivo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={temporario} onChange={() => setTemporario(true)} />
                Temporário, até
                <input type="date" min={hoje} value={validoAte} disabled={!temporario}
                  onChange={e => { setValidoAte(e.target.value); setTemporario(true) }}
                  className="border border-outline-variant rounded-lg px-2 py-1 text-sm disabled:opacity-50" />
              </label>
              <p className="text-[11px] text-on-surface-variant pl-6">O acesso temporário termina sozinho depois dessa data.</p>
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
          {disponiveis.length > 0 && (
            <button onClick={guardar} disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : 'Dar acesso'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Utilizadores() {
  const confirmar = useConfirm()
  const [modalPortal, setModalPortal] = useState(null)
  const [utilizadores, setUtilizadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [ativoFilter, setAtivoFilter] = useState('')
  const [actionId, setActionId] = useState(null)
  const [editRole, setEditRole] = useState({ id: null, role: '' })
  const [msg, setMsg] = useState(null)
  const [senhaReposta, setSenhaReposta] = useState(null) // { nome, senha_padrao }

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

  const reporSenha = async (u) => {
    if (!confirm(`Repor a senha de ${u.nome}? A conta volta a exigir troca de senha no próximo login.`)) return
    setActionId(u.id)
    try {
      const r = await api.patch(`/diretor/utilizadores/${u.id}/resetar-senha`)
      setSenhaReposta({ nome: r.nome, senha_padrao: r.senha_padrao })
    } catch (err) { showMsg(err.message || 'Erro ao repor senha', 'error') }
    setActionId(null)
  }

  const retirarPortal = async (u, portal) => {
    const ok = await confirmar({
      title: 'Retirar acesso ao portal?',
      body: `${u.nome} deixa de ter acesso ao portal ${ROLE_LABELS[portal] || portal}. Os restantes acessos mantêm-se.`,
      danger: true, confirmLabel: 'Retirar',
    })
    if (!ok) return
    try {
      await api.delete(`/diretor/utilizadores/${u.id}/portais/${portal}`)
      showMsg('Acesso ao portal retirado')
      carregar()
    } catch (err) { showMsg(err.message || 'Erro ao retirar acesso', 'error') }
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <PageHeader title="Utilizadores e Permissões" subtitle="Gerir acessos ao sistema — cada conta pode ter vários portais" />

      {modalPortal && (
        <ModalConcederPortal utilizador={modalPortal} onClose={() => setModalPortal(null)}
          onSaved={() => { setModalPortal(null); carregar() }} />
      )}

      {senhaReposta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
              <h3 className="font-semibold text-on-surface">Senha reposta</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Informe <strong>{senhaReposta.nome}</strong> da nova senha padrão. Vai ter de definir uma senha pessoal no próximo login.
            </p>
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-6 text-center">
              <p className="text-xs text-on-surface-variant mb-1">Senha Padrão</p>
              <p className="font-mono font-bold text-primary text-2xl tracking-widest">{senhaReposta.senha_padrao}</p>
            </div>
            <button onClick={() => { setSenhaReposta(null); carregar() }}
              className="w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      )}

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
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-variant text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Portal principal</th>
                <th className="text-left px-4 py-3 font-medium">Outros portais</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Departamento</th>
                <th className="px-4 py-3 font-medium text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {utilizadores.map((u) => (
                <tr key={u.id} className="hover:bg-surface-variant/30">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {u.nome}
                    {u.codigo && <p className="text-[11px] font-mono font-normal text-on-surface-variant">{u.codigo}</p>}
                  </td>
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(u.portais_extra || []).map(p => (
                        <span key={p.portal}
                          title={p.valido_ate ? `${p.expirado ? 'Expirou' : 'Válido até'} ${fmtData(p.valido_ate)}` : 'Definitivo'}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.expirado ? 'bg-gray-100 text-gray-400 line-through' : (ROLE_COLORS[p.portal] || 'bg-gray-100 text-gray-600')}`}>
                          {ROLE_LABELS[p.portal] || p.portal}
                          {p.codigo && <span className="font-mono font-normal">{p.codigo}</span>}
                          {p.valido_ate && <span className="font-normal no-underline">· até {fmtData(p.valido_ate)}</span>}
                          <button onClick={() => retirarPortal(u, p.portal)} title="Retirar este acesso" className="hover:opacity-60">
                            <span className="material-symbols-outlined text-[13px] leading-none">close</span>
                          </button>
                        </span>
                      ))}
                      {!['aluno'].includes(u.role) && (
                        <button onClick={() => setModalPortal(u)}
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full border border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary">
                          <span className="material-symbols-outlined text-[13px]">add</span>Portal
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{u.departamento || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => reporSenha(u)}
                      disabled={actionId === u.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 mr-2"
                    >
                      {actionId === u.id ? '...' : 'Repor Senha'}
                    </button>
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
          </div>
        )}
      </div>
      <p className="text-xs text-on-surface-variant mt-2 text-right">{utilizadores.length} utilizador(es)</p>
    </div>
  )
}
