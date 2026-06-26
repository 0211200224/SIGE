import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

export default function AlterarSenha() {
  const { user, roleHome, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nova: '', confirmar: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nova || !form.confirmar) { setError('Preencha os dois campos.'); return }
    if (form.nova.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (form.nova !== form.confirmar) { setError('As senhas não coincidem.'); return }
    if (/^\d{8}$/.test(form.nova)) { setError('A nova senha não pode ser igual à senha padrão (data de nascimento).'); return }

    setLoading(true)
    try {
      await api.post('/auth/change-password-first', { newPassword: form.nova })
      navigate(roleHome(user?.role) || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const inputCls = 'w-full pl-10 pr-12 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all'

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Painel esquerdo */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-between p-12">
        <div>
          <h1 className="font-bold text-3xl text-white tracking-tight">SIGE</h1>
          <p className="text-white/60 text-sm mt-1">Sistema Integrado de Gestão Escolar</p>
        </div>
        <div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-white text-4xl">lock_reset</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">Primeiro Acesso</h2>
          <p className="text-white/70 leading-relaxed">
            Por segurança, é necessário definir uma senha pessoal antes de continuar.
            A sua senha padrão (data de nascimento) não é segura — crie uma nova senha que só você conhece.
          </p>
        </div>
        <p className="text-white/30 text-xs">SIGE © {new Date().getFullYear()}</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            <span className="material-symbols-outlined text-primary text-5xl">lock_reset</span>
          </div>

          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-500 text-[20px] flex-shrink-0 mt-0.5">warning</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Primeiro acesso detectado</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Olá, <strong>{user?.nome?.split(' ')[0]}</strong>! Entraste com a senha padrão (data de nascimento no formato <strong>DDMMAAAA</strong>).
                Define agora uma senha pessoal para proteger a tua conta.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Definir Nova Senha</h2>
          <p className="text-on-surface-variant mb-8 text-sm">A nova senha deve ter pelo menos 6 caracteres.</p>

          {error && (
            <div className="mb-5 flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Nova Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
                <input type={show ? 'text' : 'password'} name="nova" value={form.nova} onChange={handleChange}
                  placeholder="Mínimo 6 caracteres" className={inputCls} />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Confirmar Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">lock_open</span>
                <input type={show ? 'text' : 'password'} name="confirmar" value={form.confirmar} onChange={handleChange}
                  placeholder="Repita a nova senha" className={inputCls} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>A guardar...</>
                : <><span className="material-symbols-outlined text-[20px]">check_circle</span>Definir Senha e Entrar</>}
            </button>
          </form>

          <button onClick={handleLogout} className="mt-6 w-full text-center text-sm text-on-surface-variant hover:text-primary transition-colors">
            Sair e voltar ao login
          </button>
        </div>
      </div>
    </div>
  )
}
