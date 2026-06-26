import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const PROVINCIAS = [
  'Maputo Cidade', 'Maputo', 'Gaza', 'Inhambane',
  'Manica', 'Sofala', 'Tete', 'Zambézia',
  'Nampula', 'Cabo Delgado', 'Niassa',
]

export default function EscolaInicial() {
  const { user, escola, refreshEscola } = useAuth()
  const navigate = useNavigate()
  const logoInputRef = useRef()

  const [form, setForm] = useState({
    nome: '', sigla: '', localizacao: '', provincia: '',
    cidade: '', contacto: '', email: '', ano_lectivo: '2025',
    nivel_ensino: 'Ensino Secundário', cor_principal: '#1a2b4b', cor_secundaria: '#fdbc13',
    logo: '',
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [step1Done, setStep1Done] = useState(false)

  useEffect(() => {
    if (escola) {
      setForm((f) => ({
        ...f,
        nome: escola.nome || '',
        sigla: escola.sigla || '',
        localizacao: escola.localizacao || '',
        provincia: escola.provincia || '',
        cidade: escola.cidade || '',
        contacto: escola.contacto || '',
        email: escola.email || '',
        ano_lectivo: escola.ano_lectivo || '2025',
        nivel_ensino: escola.nivel_ensino || 'Ensino Secundário',
        cor_principal: escola.cor_principal || '#1a2b4b',
        cor_secundaria: escola.cor_secundaria || '#fdbc13',
        logo: escola.logo || '',
      }))
      if (escola.logo) setLogoPreview(escola.logo)
      setStep1Done(true)
    }
  }, [escola])

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess(false)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logótipo deve ter menos de 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      setLogoPreview(b64)
      setForm((f) => ({ ...f, logo: b64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome || !form.provincia) {
      setError('Nome da escola e Província são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const escolaId = user?.escola_id || 1
      await api.put(`/escolas/${escolaId}`, form)
      await refreshEscola()
      setSuccess(true)
      setStep1Done(true)
    } catch (err) {
      setError(err.message || 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col pb-[100px]">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-primary mb-1">Configuração da Escola</h1>
          <p className="text-on-surface-variant">Defina a identidade da instituição e personalize o sistema.</p>
        </div>

        {/* Steps */}
        <div className="mb-8 flex items-center gap-4 max-w-2xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-on-secondary text-xs font-bold">1</span>
              <span className="font-medium text-secondary text-sm">Identidade da Escola</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full"></div>
          </div>
          <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          <div className="flex-1 opacity-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant text-xs font-bold">2</span>
              <span className="text-on-surface-variant text-sm">Utilizadores</span>
            </div>
            <div className="h-1.5 bg-surface-container-highest rounded-full"></div>
          </div>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Dados guardados com sucesso!
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Identidade */}
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                <h2 className="font-semibold text-primary mb-6 pb-3 border-b border-surface-container-highest flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">apartment</span>
                  Identidade da Escola
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Nome da escola *</label>
                    <input name="nome" value={form.nome} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="Ex: Escola Secundária Josina Machel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Sigla</label>
                    <input name="sigla" value={form.sigla} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="Ex: ESJM" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Localização</label>
                    <input name="localizacao" value={form.localizacao} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="Endereço completo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Província *</label>
                    <select name="provincia" value={form.provincia} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all">
                      <option value="">Selecione a província</option>
                      {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Cidade/Distrito</label>
                    <input name="cidade" value={form.cidade} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="Ex: Maputo Cidade" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Contacto</label>
                    <input name="contacto" value={form.contacto} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="+258 8X XXX XXXX" type="tel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                    <input name="email" value={form.email} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all"
                      placeholder="escola@dominio.co.mz" type="email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Ano Lectivo</label>
                    <select name="ano_lectivo" value={form.ano_lectivo} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all">
                      {['2023','2024','2025','2026'].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Nível de Ensino</label>
                    <select name="nivel_ensino" value={form.nivel_ensino} onChange={handleChange}
                      className="w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all">
                      <option value="Ensino Primário">Ensino Primário</option>
                      <option value="Ensino Secundário">Ensino Secundário</option>
                      <option value="Ambos">Primário e Secundário</option>
                      <option value="Técnico Profissional">Técnico Profissional</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Branding */}
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                <h2 className="font-semibold text-primary mb-6 pb-3 border-b border-surface-container-highest flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">palette</span>
                  Branding e Identidade Visual
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Logótipo</label>
                    <div
                      className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center bg-surface hover:bg-surface-container-low transition-colors cursor-pointer relative"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="max-h-20 object-contain" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-outline text-4xl mb-2">cloud_upload</span>
                          <p className="text-sm text-on-surface-variant text-center">Clique para carregar</p>
                          <p className="text-xs text-outline mt-1">PNG, JPG — máx. 2MB</p>
                        </>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </div>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoPreview(''); setForm((f) => ({ ...f, logo: '' })) }}
                        className="mt-2 text-xs text-error hover:underline"
                      >
                        Remover logótipo
                      </button>
                    )}
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Cores da Instituição</label>
                    <p className="text-xs text-on-surface-variant mb-4">A interface irá adaptar-se a estas cores.</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-outline-variant overflow-hidden flex-shrink-0 cursor-pointer"
                          style={{ backgroundColor: form.cor_principal }}>
                          <input type="color" name="cor_principal" value={form.cor_principal} onChange={handleChange}
                            className="opacity-0 w-full h-full cursor-pointer" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-on-surface">Cor Principal</p>
                          <p className="text-xs text-on-surface-variant">{form.cor_principal}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-outline-variant overflow-hidden flex-shrink-0 cursor-pointer"
                          style={{ backgroundColor: form.cor_secundaria }}>
                          <input type="color" name="cor_secundaria" value={form.cor_secundaria} onChange={handleChange}
                            className="opacity-0 w-full h-full cursor-pointer" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-on-surface">Cor Secundária</p>
                          <p className="text-xs text-on-surface-variant">{form.cor_secundaria}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Preview */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-24 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                <h3 className="font-medium text-primary mb-4 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  Pré-visualização
                </h3>
                <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface flex h-52">
                  <div className="w-1/3 flex flex-col gap-3 p-3" style={{ backgroundColor: form.cor_principal }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" className="w-8 h-8 rounded object-contain self-center" />
                      : <div className="w-8 h-8 rounded bg-white/20 self-center" />}
                    <div className="w-full h-1.5 bg-white/20 rounded-full"></div>
                    <div className="w-3/4 h-1.5 bg-white/20 rounded-full"></div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full mt-2"></div>
                    <div className="w-3/4 h-1.5 bg-white/20 rounded-full"></div>
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-2">
                    <div className="text-[8px] font-bold truncate" style={{ color: form.cor_principal }}>
                      {form.nome || 'Nome da Escola'}
                    </div>
                    <div className="flex-1 rounded border flex items-center justify-center"
                      style={{ borderColor: form.cor_secundaria, backgroundColor: form.cor_secundaria + '15' }}>
                      <div className="w-full h-full p-2 flex flex-col gap-1">
                        <div className="h-1.5 bg-surface-container-highest rounded-full w-3/4"></div>
                        <div className="h-1.5 bg-surface-container-highest rounded-full w-1/2"></div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 h-5 rounded text-[7px] flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: form.cor_principal }}>Entrar</div>
                      <div className="flex-1 h-5 rounded text-[7px] flex items-center justify-center font-bold"
                        style={{ backgroundColor: form.cor_secundaria }}>Guardar</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Escola:</span>
                    <span className="font-medium text-on-surface truncate max-w-[140px]">{form.nome || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Sigla:</span>
                    <span className="font-medium text-on-surface">{form.sigla || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Província:</span>
                    <span className="font-medium text-on-surface">{form.provincia || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>Ano Lectivo:</span>
                    <span className="font-medium text-on-surface">{form.ano_lectivo}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Bottom nav */}
      <nav className="bg-surface-container-lowest fixed bottom-0 w-full z-50 border-t border-outline-variant shadow-[0_-4px_20px_rgba(26,43,75,0.04)]">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-6xl mx-auto">
          <Link to="/dashboard"
            className="flex items-center gap-2 text-primary border border-primary rounded-lg px-5 py-2.5 hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-secondary text-on-secondary rounded-lg px-5 py-2.5 shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              <span className="text-sm font-medium">Guardar</span>
            </button>
            {step1Done && (
              <Link
                to="/configuracao/funcionarios"
                className="flex items-center gap-2 bg-primary text-on-primary rounded-lg px-5 py-2.5 shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="text-sm font-medium">Utilizadores</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
