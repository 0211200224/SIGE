import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../../services/api'

const PROVINCIAS = [
  'Maputo Cidade', 'Maputo', 'Gaza', 'Inhambane',
  'Manica', 'Sofala', 'Tete', 'Zambézia',
  'Nampula', 'Cabo Delgado', 'Niassa',
]
const NIVEIS = ['Ensino Primário', 'Ensino Secundário', 'Técnico Profissional', 'Superior', 'Pré-Escolar']
const ROLE_LABEL = {
  director: 'Director', secretaria: 'Secretaria', professor: 'Professor',
  financeiro: 'Financeiro', rh: 'RH', pedagogico: 'Pedagógico',
  aluno: 'Aluno', super_admin: 'Super Admin',
}
const ROLE_COLOR = {
  director: 'bg-purple-100 text-purple-700', professor: 'bg-blue-100 text-blue-700',
  secretaria: 'bg-green-100 text-green-700', financeiro: 'bg-amber-100 text-amber-700',
  rh: 'bg-pink-100 text-pink-700', pedagogico: 'bg-teal-100 text-teal-700',
  aluno: 'bg-gray-100 text-gray-600', super_admin: 'bg-red-100 text-red-700',
}

const inputCls = 'w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all'
const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide'

function ConfirmDialog({ title, body, danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <span className={`material-symbols-outlined ${danger ? 'text-red-600' : 'text-amber-600'}`}>
              {danger ? 'delete_forever' : 'warning'}
            </span>
          </div>
          <h3 className="font-semibold text-on-surface">{title}</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{body}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-xl font-semibold text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
            {danger ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GerirEscola() {
  const { id } = useParams()
  const navigate = useNavigate()
  const logoRef = useRef()

  const [escola, setEscola] = useState(null)
  const [utilizadores, setUtilizadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [tab, setTab] = useState('info')
  const [confirm, setConfirm] = useState(null) // null | 'desativar' | 'ativar' | 'eliminar'
  const [actionId, setActionId] = useState(null)
  const [senhaReposta, setSenhaReposta] = useState(null) // { nome, senha_padrao }

  const carregar = async () => {
    setLoading(true)
    try {
      const [e, u] = await Promise.all([
        api.get(`/escolas/${id}`),
        api.get(`/escolas/${id}/utilizadores`),
      ])
      const esc = e.data
      setEscola(esc)
      setUtilizadores(u.data || [])
      setForm({
        nome: esc.nome || '',
        sigla: esc.sigla || '',
        localizacao: esc.localizacao || '',
        provincia: esc.provincia || '',
        cidade: esc.cidade || '',
        contacto: esc.contacto || '',
        email: esc.email || '',
        ano_lectivo: esc.ano_lectivo || '',
        nivel_ensino: esc.nivel_ensino || '',
        cor_principal: esc.cor_principal || '#1a2b4b',
        cor_secundaria: esc.cor_secundaria || '#fdbc13',
        logo: esc.logo || '',
      })
    } catch {
      setError('Não foi possível carregar os dados da escola.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo não pode exceder 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setForm(f => ({ ...f, logo: ev.target.result })); setSaved(false) }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nome) { setError('Nome obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const updated = await api.put(`/escolas/${id}`, form)
      setEscola(updated.data)
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDesativar = async () => {
    try {
      await api.patch(`/escolas/${id}/desativar`)
      setConfirm(null)
      carregar()
    } catch (err) { setError(err.message) }
  }

  const handleAtivar = async () => {
    try {
      await api.patch(`/escolas/${id}/ativar`)
      setConfirm(null)
      carregar()
    } catch (err) { setError(err.message) }
  }

  const reporSenha = async (u) => {
    if (!confirm(`Repor a senha de ${u.nome}? A conta volta a exigir troca de senha no próximo login.`)) return
    setActionId(u.id)
    try {
      const r = await api.patch(`/escolas/${id}/utilizadores/${u.id}/resetar-senha`)
      setSenhaReposta({ nome: r.data.nome, senha_padrao: r.data.senha_padrao })
    } catch (err) { setError(err.message || 'Erro ao repor senha') }
    setActionId(null)
  }

  const handleEliminar = async () => {
    try {
      await api.delete(`/escolas/${id}`)
      navigate('/admin')
    } catch (err) { setError(err.message); setConfirm(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }

  if (!escola || !form) {
    return (
      <div className="p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">school_off</span>
        <p className="text-on-surface-variant">Escola não encontrada.</p>
        <Link to="/admin" className="mt-4 inline-block text-primary hover:underline text-sm">← Voltar ao painel</Link>
      </div>
    )
  }

  const isActiva = escola.activo === 1 || escola.activo === true || escola.activo === undefined

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Confirm dialogs */}
      {confirm === 'desativar' && (
        <ConfirmDialog
          title="Desactivar escola?"
          body={`A escola "${escola.nome}" ficará invisível para os utilizadores mas os dados são preservados. Pode reactivar quando quiser.`}
          onConfirm={handleDesativar}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'ativar' && (
        <ConfirmDialog
          title="Reactivar escola?"
          body={`A escola "${escola.nome}" voltará a estar disponível no sistema.`}
          onConfirm={handleAtivar}
          onCancel={() => setConfirm(null)}
        />
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
      {confirm === 'eliminar' && (
        <ConfirmDialog
          danger
          title="Eliminar escola permanentemente?"
          body={`Esta acção é irreversível. Todos os dados da escola "${escola.nome}" serão eliminados, incluindo utilizadores, alunos e registos.`}
          onConfirm={handleEliminar}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: form.cor_principal }}>
              {form.logo
                ? <img src={form.logo} alt="logo" className="w-10 h-10 object-contain" />
                : <span className="material-symbols-outlined text-white text-[22px]">school</span>
              }
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface">{escola.nome}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">{escola.sigla}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isActiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <span className="material-symbols-outlined text-[10px]">circle</span>
                  {isActiva ? 'Activa' : 'Desactivada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Acções rápidas */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActiva ? (
            <button onClick={() => setConfirm('desativar')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-medium transition-colors">
              <span className="material-symbols-outlined text-[16px]">block</span>
              Desactivar
            </button>
          ) : (
            <button onClick={() => setConfirm('ativar')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium transition-colors">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Reactivar
            </button>
          )}
          <button onClick={() => setConfirm('eliminar')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors">
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Eliminar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant mb-6">
        {[
          { key: 'info', icon: 'info', label: 'Informações' },
          { key: 'aparencia', icon: 'palette', label: 'Aparência' },
          { key: 'utilizadores', icon: 'people', label: `Utilizadores (${utilizadores.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
          <button onClick={() => setError('')} className="ml-auto"><span className="material-symbols-outlined text-[16px]">close</span></button>
        </div>
      )}
      {saved && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>Alterações guardadas com sucesso.
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Tab: Informações */}
        {tab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                Identidade da Escola
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nome Completo *</label>
                  <input name="nome" value={form.nome} onChange={handleChange} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sigla</label>
                  <input name="sigla" value={form.sigla} onChange={handleChange} className={inputCls} placeholder="Ex: EPFBL" />
                </div>
                <div>
                  <label className={labelCls}>Nível de Ensino</label>
                  <select name="nivel_ensino" value={form.nivel_ensino} onChange={handleChange} className={inputCls}>
                    <option value="">Seleccionar</option>
                    {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Ano Lectivo</label>
                  <input name="ano_lectivo" value={form.ano_lectivo} onChange={handleChange} className={inputCls} placeholder="2026" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                Localização & Contactos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Província</label>
                  <select name="provincia" value={form.provincia} onChange={handleChange} className={inputCls}>
                    <option value="">Seleccionar</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cidade / Distrito</label>
                  <input name="cidade" value={form.cidade} onChange={handleChange} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Endereço / Localização</label>
                  <input name="localizacao" value={form.localizacao} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contacto / Telefone</label>
                  <input name="contacto" value={form.contacto} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email Institucional</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Aparência */}
        {tab === 'aparencia' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">add_photo_alternate</span>
                Logótipo
              </h3>
              <div className="flex items-center gap-6">
                <div onClick={() => logoRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  style={{ backgroundColor: form.cor_principal + '22' }}>
                  {form.logo
                    ? <img src={form.logo} alt="logo" className="w-full h-full object-contain p-2" />
                    : <span className="material-symbols-outlined text-on-surface-variant text-3xl">add_photo_alternate</span>
                  }
                </div>
                <div>
                  <button type="button" onClick={() => logoRef.current?.click()}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-bright transition-colors">
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    {form.logo ? 'Alterar logótipo' : 'Carregar logótipo'}
                  </button>
                  {form.logo && (
                    <button type="button" onClick={() => { setForm(f => ({ ...f, logo: '' })); setSaved(false) }}
                      className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline">
                      <span className="material-symbols-outlined text-[14px]">delete</span>Remover
                    </button>
                  )}
                  <p className="text-xs text-on-surface-variant mt-2">PNG ou SVG recomendado, máx. 2MB</p>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </div>

            <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
              <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                Cores da Escola
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Cor Principal (Sidebar)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" name="cor_principal" value={form.cor_principal} onChange={handleChange}
                      className="h-10 w-16 rounded-lg border border-outline-variant cursor-pointer p-0.5" />
                    <input name="cor_principal" value={form.cor_principal} onChange={handleChange}
                      className={inputCls + ' font-mono'} placeholder="#1a2b4b" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Cor Secundária (Acentos)</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" name="cor_secundaria" value={form.cor_secundaria} onChange={handleChange}
                      className="h-10 w-16 rounded-lg border border-outline-variant cursor-pointer p-0.5" />
                    <input name="cor_secundaria" value={form.cor_secundaria} onChange={handleChange}
                      className={inputCls + ' font-mono'} placeholder="#fdbc13" />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="mt-5 rounded-xl overflow-hidden border border-outline-variant">
                <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: form.cor_principal }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: form.cor_secundaria + '33' }}>
                    {form.logo
                      ? <img src={form.logo} alt="logo" className="w-6 h-6 object-contain" />
                      : <span className="material-symbols-outlined text-white text-[14px]">school</span>
                    }
                  </div>
                  <span className="text-white font-semibold text-sm">{form.nome || 'Nome da Escola'}</span>
                  <div className="ml-auto w-6 h-6 rounded-full" style={{ backgroundColor: form.cor_secundaria }}></div>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-xs text-on-surface-variant">Pré-visualização da barra de navegação</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Utilizadores */}
        {tab === 'utilizadores' && (
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm">
            {utilizadores.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 block">people</span>
                <p className="text-sm">Nenhum utilizador registado nesta escola.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-bright">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Utilizador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Função</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Desde</th>
                    <th className="px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide text-right">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizadores.map((u, i) => (
                    <tr key={u.id} className={`border-b border-outline-variant last:border-0 ${i % 2 === 0 ? '' : 'bg-surface-bright/40'}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-on-surface">{u.nome}</p>
                          <p className="text-xs text-on-surface-variant">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className="material-symbols-outlined text-[10px]">circle</span>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-PT') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => reporSenha(u)}
                          disabled={actionId === u.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          {actionId === u.id ? '...' : 'Repor Senha'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Save button (hidden on utilizadores tab) */}
        {tab !== 'utilizadores' && (
          <div className="flex justify-end gap-3 mt-6">
            <Link to="/admin"
              className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-medium hover:bg-surface-bright transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
              {saving
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A guardar...</>
                : <><span className="material-symbols-outlined text-[18px]">save</span>Guardar Alterações</>
              }
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
