import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, roleHome } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ codigo: location.state?.codigoSugerido || '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.codigo || !form.password) {
      setError('Preencha o código de acesso e a palavra-passe.')
      return
    }
    setLoading(true)
    try {
      const { user: u, primeiro_login } = await login(form.codigo, form.password)
      if (primeiro_login) { navigate('/alterar-senha', { replace: true }); return }
      const user = u
      navigate(roleHome(user.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left panel — branding */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-between p-12">
        <div>
          <h1 className="font-bold text-3xl text-white tracking-tight">SIGE</h1>
          <p className="text-white/60 text-sm mt-1">Sistema Integrado de Gestão Escolar</p>
        </div>
        <div>
          <blockquote className="text-white/90 text-xl font-light leading-relaxed">
            "A educação é a arma mais poderosa que podes usar para mudar o mundo."
          </blockquote>
          <p className="text-white/50 text-sm mt-4">— Nelson Mandela</p>
        </div>
        <div className="flex gap-3">
          {['dashboard', 'school', 'payments', 'groups', 'analytics'].map((icon) => (
            <div key={icon} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/70 text-[18px]">{icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 md:hidden text-center">
            <h1 className="font-bold text-2xl text-primary">SIGE</h1>
            <p className="text-on-surface-variant text-sm">Sistema Integrado de Gestão Escolar</p>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Bem-vindo de volta</h2>
          <p className="text-on-surface-variant mb-6">Introduza o seu código de acesso para entrar.</p>

          {location.state?.codigoSugerido && (
            <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-blue-500 text-[18px] flex-shrink-0 mt-0.5">info</span>
              <p className="text-xs text-blue-700">
                Código pré-preenchido. Introduza a senha padrão (data de nascimento em <strong>DDMMAAAA</strong> ou <strong>sige2024</strong>) para entrar pela primeira vez.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">
                Código de Acesso
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">
                  badge
                </span>
                <input
                  type="text"
                  name="codigo"
                  value={form.codigo}
                  onChange={handleChange}
                  placeholder="Ex: EPS.PRF.001"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase tracking-wider"
                  autoComplete="username"
                  autoCapitalize="characters"
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1.5">O código foi fornecido no momento do registo.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-on-surface">
                  Palavra-passe
                </label>
                <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  A entrar...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-on-surface-variant">
            SIGE © {new Date().getFullYear()} — Sistema Integrado de Gestão Escolar
          </p>
        </div>
      </div>
    </div>
  )
}
