import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export default function EsqueciSenha() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [escola, setEscola] = useState(null)
  const [naoEncontrada, setNaoEncontrada] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!codigo.trim()) { setError('Introduza o seu código de acesso.'); return }
    const sigla = codigo.trim().split('.')[0]
    if (!sigla) { setError('Código inválido.'); return }

    setLoading(true)
    setError('')
    setEscola(null)
    setNaoEncontrada(false)
    try {
      const res = await api.get(`/escolas/contacto/${encodeURIComponent(sigla)}`)
      setEscola(res.data)
    } catch (err) {
      setNaoEncontrada(true)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase tracking-wider'

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
            <span className="material-symbols-outlined text-white text-4xl">support_agent</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">Recuperação de Senha</h2>
          <p className="text-white/70 leading-relaxed">
            Por segurança, a reposição de senha não é automática. É a direcção da tua escola que
            confirma a tua identidade e repõe o acesso.
          </p>
        </div>
        <p className="text-white/30 text-xs">SIGE © {new Date().getFullYear()}</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            <span className="material-symbols-outlined text-primary text-5xl">support_agent</span>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Esqueci a Senha</h2>
          <p className="text-on-surface-variant mb-8 text-sm">
            Introduza o seu código de acesso (ex: EPS.DIR.001) para encontrarmos o contacto da sua escola.
          </p>

          {!escola && !naoEncontrada && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span className="text-sm">{error}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Código de Acesso</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">badge</span>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => { setCodigo(e.target.value); setError('') }}
                    placeholder="Ex: EPS.PRF.001"
                    className={inputCls}
                    autoCapitalize="characters"
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1.5">
                  Não sabe o código completo? Basta a sigla da escola (ex: EPS).
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>A procurar...</>
                  : <><span className="material-symbols-outlined text-[20px]">search</span>Encontrar Contacto</>}
              </button>
            </form>
          )}

          {escola && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">check_circle</span>
                <div className="text-sm">
                  <p className="font-semibold">{escola.nome}</p>
                  <p className="text-green-700 mt-0.5">Entre em contacto com a Secretaria / Registo Académico desta escola para repor a sua senha.</p>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                  <div>
                    <p className="text-xs text-on-surface-variant">Telefone / WhatsApp</p>
                    <p className="font-medium text-on-surface">{escola.contacto || 'Não disponível — dirija-se presencialmente à escola'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                  <div>
                    <p className="text-xs text-on-surface-variant">Email</p>
                    <p className="font-medium text-on-surface">{escola.email || 'Não disponível'}</p>
                  </div>
                </div>
              </div>

              <button onClick={() => { setEscola(null); setCodigo('') }}
                className="w-full text-center text-sm text-on-surface-variant hover:text-primary transition-colors py-2">
                Consultar outro código
              </button>
            </div>
          )}

          {naoEncontrada && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">info</span>
                <p className="text-sm">
                  Não encontrámos nenhuma escola com esse código. Dirija-se pessoalmente à Secretaria / Registo Académico da sua escola para repor a sua senha.
                </p>
              </div>
              <button onClick={() => { setNaoEncontrada(false); setCodigo('') }}
                className="w-full text-center text-sm text-on-surface-variant hover:text-primary transition-colors py-2">
                Tentar outro código
              </button>
            </div>
          )}

          <Link to="/login" className="mt-8 flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
