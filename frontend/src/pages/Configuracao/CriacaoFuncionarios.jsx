import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const ROLES = [
  { value: 'director',   label: 'Director',           icon: 'admin_panel_settings', desc: 'Acesso total ao sistema' },
  { value: 'pedagogico', label: 'Pedagógico',          icon: 'school',               desc: 'Turmas, disciplinas, horários' },
  { value: 'secretaria', label: 'Secretaria',          icon: 'desk',                 desc: 'Matrículas, alunos, declarações' },
  { value: 'financeiro', label: 'Financeiro',          icon: 'payments',             desc: 'Pagamentos, taxas, receitas' },
  { value: 'rh',         label: 'Recursos Humanos',   icon: 'badge',                desc: 'Funcionários, salários' },
  { value: 'professor',  label: 'Professor',           icon: 'person',               desc: 'Notas, presenças, turmas' },
]

const inputCls = 'w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-sm text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all'
const emptyForm = { nome: '', data_nascimento: '', role: '' }

export default function CriacaoFuncionarios() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [criados, setCriados] = useState([])
  const [ultimoCriado, setUltimoCriado] = useState(null)

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome || !form.role) { setError('Nome e perfil de acesso são obrigatórios.'); return }
    setSaving(true); setError('')
    try {
      const res = await api.post('/auth/register', {
        nome: form.nome,
        data_nascimento: form.data_nascimento || null,
        role: form.role,
        escola_id: user?.escola_id,
      })
      const novo = {
        nome: res.data.nome,
        role: res.data.role,
        codigo: res.data.codigo,
        senha_padrao: res.data.senha_padrao,
        data_nascimento: form.data_nascimento,
      }
      setCriados(prev => [novo, ...prev])
      setUltimoCriado(novo)
      setForm(emptyForm)
    } catch (err) {
      setError(err.message || 'Erro ao criar utilizador.')
    } finally {
      setSaving(false) }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col pb-[100px]">
      <header className="bg-surface border-b border-outline-variant shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-6xl mx-auto">
          <div className="font-bold text-xl text-primary">SIGE</div>
          <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow w-full max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-1">Criar Utilizadores</h1>
          <p className="text-on-surface-variant">O sistema gera automaticamente o código de acesso e a senha padrão.</p>
        </div>

        {/* Steps */}
        <div className="mb-8 flex items-center gap-4 max-w-2xl">
          <div className="flex-1 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary text-xs">
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
              <span className="text-on-surface-variant text-sm">Identidade da Escola</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full"></div>
          </div>
          <span className="material-symbols-outlined text-secondary">chevron_right</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary text-xs font-bold">2</span>
              <span className="font-medium text-secondary text-sm">Utilizadores</span>
            </div>
            <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${Math.min(criados.length * 20, 100)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <h2 className="font-semibold text-primary mb-5 pb-3 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">person_add</span>
                Novo Utilizador
              </h2>

              {error && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Perfil */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Perfil de Acesso *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROLES.map(r => (
                      <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                        className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left ${form.role === r.value ? 'border-secondary bg-secondary/5' : 'border-outline-variant hover:border-secondary/50'}`}>
                        <span className={`material-symbols-outlined text-[18px] mb-1 ${form.role === r.value ? 'text-secondary' : 'text-on-surface-variant'}`}>{r.icon}</span>
                        <span className={`text-xs font-semibold ${form.role === r.value ? 'text-secondary' : 'text-on-surface'}`}>{r.label}</span>
                        <span className="text-[10px] text-on-surface-variant leading-tight mt-0.5">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Nome Completo *</label>
                  <input name="nome" value={form.nome} onChange={handleChange} className={inputCls} placeholder="Nome completo do utilizador" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">
                    Data de Nascimento
                    <span className="text-on-surface-variant font-normal ml-1">(define a senha padrão)</span>
                  </label>
                  <input name="data_nascimento" value={form.data_nascimento} onChange={handleChange} type="date" className={inputCls} />
                  <p className="text-xs text-on-surface-variant mt-1">
                    A senha padrão será a data de nascimento no formato <strong>DDMMAAAA</strong>. O utilizador terá de a alterar no primeiro acesso.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-[16px] flex-shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-blue-700">
                    O sistema irá gerar automaticamente o <strong>código de acesso</strong> com base na sigla da escola e no perfil seleccionado.
                    As credenciais serão apresentadas após a criação.
                  </p>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full bg-secondary text-on-secondary font-semibold py-3 rounded-xl shadow-md hover:bg-secondary/90 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A criar...</>
                    : <><span className="material-symbols-outlined text-[18px]">person_add</span>Criar Utilizador</>}
                </button>
              </div>
            </form>
          </div>

          {/* Painel de credenciais */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              {/* Último criado — credenciais */}
              {ultimoCriado && (
                <div className="bg-white rounded-xl border-2 border-green-300 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <h3 className="font-semibold text-green-700 text-sm">Utilizador criado! Guarde estas credenciais.</h3>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Nome</p>
                      <p className="font-semibold text-on-surface">{ultimoCriado.nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Código de Acesso</p>
                      <p className="font-mono text-lg font-bold text-primary tracking-wider">{ultimoCriado.codigo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Senha Padrão</p>
                      <p className="font-mono text-base font-bold text-on-surface">{ultimoCriado.senha_padrao}</p>
                      <p className="text-[10px] text-green-600 mt-0.5">O utilizador irá alterar esta senha no primeiro acesso.</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Perfil</p>
                      <p className="text-sm text-on-surface">{ROLES.find(r => r.value === ultimoCriado.role)?.label || ultimoCriado.role}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de criados */}
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5">
                <h3 className="font-medium text-primary mb-4 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Utilizadores Criados ({criados.length})
                </h3>
                {criados.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 block">group_add</span>
                    <p className="text-sm">Nenhum utilizador criado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {criados.map((u, i) => {
                      const r = ROLES.find(r => r.value === u.role)
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-secondary text-[16px]">{r?.icon || 'person'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-on-surface truncate">{u.nome}</p>
                            <p className="text-xs font-mono text-on-surface-variant">{u.codigo}</p>
                          </div>
                          <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full flex-shrink-0">{r?.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="bg-surface-container-lowest fixed bottom-0 w-full z-50 border-t border-outline-variant shadow-[0_-4px_20px_rgba(26,43,75,0.04)]">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-6xl mx-auto">
          <Link to="/configuracao"
            className="flex items-center gap-2 text-primary border border-primary rounded-lg px-5 py-2.5 hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-sm font-medium">Escola</span>
          </Link>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-primary text-on-primary rounded-lg px-5 py-2.5 shadow-md hover:-translate-y-0.5 transition-all">
            <span className="text-sm font-medium">Ir para o Dashboard</span>
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
