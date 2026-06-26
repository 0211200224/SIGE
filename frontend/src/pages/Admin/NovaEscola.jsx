import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

const PROVINCIAS = [
  'Maputo Cidade', 'Maputo', 'Gaza', 'Inhambane',
  'Manica', 'Sofala', 'Tete', 'Zambézia',
  'Nampula', 'Cabo Delgado', 'Niassa',
]

const inputCls = 'w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2.5 text-sm text-on-surface focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all'

export default function NovaEscola() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const logoRef = useRef()

  // Step 1 — Identidade da escola
  const [form1, setForm1] = useState({
    nome: '', sigla: '', localizacao: '', provincia: '',
    cidade: '', contacto: '', email: '',
    ano_lectivo: '2026', nivel_ensino: 'Ensino Secundário',
    cor_principal: '#1a2b4b', cor_secundaria: '#fdbc13', logo: '',
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [saving1, setSaving1] = useState(false)
  const [step1Done, setStep1Done] = useState(false)
  const [escolaId, setEscolaId] = useState(null)
  const [error1, setError1] = useState('')

  // Step 2 — Primeiro utilizador (Director)
  const [form2, setForm2] = useState({ nome: '', data_nascimento: '' })
  const [saving2, setSaving2] = useState(false)
  const [error2, setError2] = useState('')
  const [directorCriado, setDirectorCriado] = useState(null) // { codigo, senha_padrao, nome }

  const handleChange1 = (e) => { setForm1(f => ({ ...f, [e.target.name]: e.target.value })); setError1('') }
  const handleChange2 = (e) => { setForm2(f => ({ ...f, [e.target.name]: e.target.value })); setError2('') }

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError1('Logótipo deve ter menos de 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setLogoPreview(ev.target.result); setForm1(f => ({ ...f, logo: ev.target.result })) }
    reader.readAsDataURL(file)
  }

  const handleSaveStep1 = async (e) => {
    e.preventDefault()
    if (!form1.nome || !form1.provincia) { setError1('Nome da escola e Província são obrigatórios.'); return }
    setSaving1(true); setError1('')
    try {
      const res = await api.post('/escolas', form1)
      setEscolaId(res.data.id)
      setStep1Done(true)
      setTimeout(() => document.getElementById('step2')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setError1(err.message || 'Erro ao criar escola.')
    } finally { setSaving1(false) }
  }

  const handleSaveStep2 = async (e) => {
    e.preventDefault()
    if (!form2.nome.trim()) { setError2('O nome do director é obrigatório.'); return }
    setSaving2(true); setError2('')
    try {
      const res = await api.post('/auth/register', {
        nome: form2.nome,
        data_nascimento: form2.data_nascimento || null,
        role: 'director',
        escola_id: escolaId,
      })
      setDirectorCriado({
        nome: res.data.nome,
        codigo: res.data.codigo,
        senha_padrao: res.data.senha_padrao,
      })
    } catch (err) {
      setError2(err.message || 'Erro ao criar director.')
    } finally { setSaving2(false) }
  }

  return (
    <div className="bg-background min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-30">
        <div className="flex justify-between items-center w-full px-10 py-4 max-w-7xl mx-auto">
          <div className="font-bold text-xl text-primary">SIGE</div>
          <button onClick={() => navigate('/admin')} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-10 py-8">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Configuração Inicial da Escola</h1>
          <p className="text-on-surface-variant text-lg">Defina a identidade da escola e crie o perfil do Director para começar.</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-4 max-w-2xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step1Done ? 'bg-green-500 text-white' : 'bg-secondary text-on-secondary'}`}>
                {step1Done ? '✓' : '1'}
              </span>
              <span className={`font-semibold text-sm ${step1Done ? 'text-green-600' : 'text-secondary'}`}>Identidade da Escola</span>
            </div>
            <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${step1Done ? 'bg-green-500 w-full' : 'bg-secondary w-full'}`}></div>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          <div className={`flex-1 transition-opacity duration-300 ${step1Done ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step1Done ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>2</span>
              <span className={`font-semibold text-sm ${step1Done ? 'text-secondary' : 'text-on-surface-variant'}`}>Primeiro Utilizador</span>
            </div>
            <div className="h-2 bg-surface-container-highest rounded-full"></div>
          </div>
        </div>

        {/* Layout 8+4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna esquerda */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* ─── STEP 1: Identidade da Escola ─── */}
            <section className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <h2 className="text-base font-semibold text-primary mb-5 pb-3 border-b border-outline-variant flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step1Done ? 'bg-green-500 text-white' : 'bg-secondary text-on-secondary'}`}>
                  {step1Done ? '✓' : '1'}
                </span>
                Identidade da Escola
              </h2>

              {error1 && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error1}
                </div>
              )}

              {step1Done && (
                <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Escola criada com sucesso! Prossiga para criar o Director.
                </div>
              )}

              <form onSubmit={handleSaveStep1}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Nome da escola *</label>
                    <input name="nome" value={form1.nome} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="Ex: Escola Secundária Josina Machel" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Sigla</label>
                    <input name="sigla" value={form1.sigla} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="Ex: ESJM" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Localização</label>
                    <input name="localizacao" value={form1.localizacao} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="Endereço completo" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Província *</label>
                    <select name="provincia" value={form1.provincia} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
                      <option value="">Selecione a província</option>
                      {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Cidade/Distrito</label>
                    <input name="cidade" value={form1.cidade} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="Ex: Maputo Cidade" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Contacto</label>
                    <input name="contacto" value={form1.contacto} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="+258 8X XXX XXXX" type="tel" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Email</label>
                    <input name="email" value={form1.email} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="escola@dominio.co.mz" type="email" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Ano Lectivo</label>
                    <select name="ano_lectivo" value={form1.ano_lectivo} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
                      {['2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1.5">Nível de Ensino</label>
                    <select name="nivel_ensino" value={form1.nivel_ensino} onChange={handleChange1} disabled={step1Done}
                      className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
                      <option value="Ensino Primário">Ensino Primário</option>
                      <option value="Ensino Secundário">Ensino Secundário</option>
                      <option value="Ambos">Primário e Secundário</option>
                      <option value="Técnico Profissional">Técnico Profissional</option>
                    </select>
                  </div>
                </div>

                {/* Branding */}
                <div className="border-t border-outline-variant pt-5">
                  <h3 className="text-sm font-semibold text-primary mb-4">Branding e Imagens</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-2">Logótipo da Escola</label>
                      <div onClick={() => !step1Done && logoRef.current?.click()}
                        className={`border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center bg-surface transition-colors ${!step1Done ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                        {logoPreview
                          ? <img src={logoPreview} alt="Logo" className="max-h-16 object-contain" />
                          : <>
                            <span className="material-symbols-outlined text-outline text-4xl mb-2">cloud_upload</span>
                            <p className="text-sm text-on-surface-variant text-center">Clique para carregar</p>
                            <p className="text-xs text-outline mt-1">PNG, JPG — máx. 2MB</p>
                          </>}
                        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-2">Cores da Instituição</label>
                      <p className="text-xs text-on-surface-variant mb-4">A UI do sistema adaptará estas cores.</p>
                      <div className="flex gap-6">
                        {[
                          { name: 'cor_principal', label: 'Cor Principal' },
                          { name: 'cor_secundaria', label: 'Cor Secundária' },
                        ].map(c => (
                          <div key={c.name} className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full border-2 border-outline-variant overflow-hidden cursor-pointer shadow-sm"
                              style={{ backgroundColor: form1[c.name] }}>
                              <input type="color" name={c.name} value={form1[c.name]} onChange={handleChange1}
                                disabled={step1Done} className="opacity-0 w-full h-full cursor-pointer" />
                            </div>
                            <span className="text-xs text-on-surface">{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {!step1Done && (
                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={saving1}
                      className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
                      {saving1
                        ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A guardar...</>
                        : <><span className="text-sm font-medium">Guardar e Continuar</span><span className="material-symbols-outlined text-[16px]">arrow_forward</span></>}
                    </button>
                  </div>
                )}
              </form>
            </section>

            {/* ─── STEP 2: Primeiro Utilizador (Director) ─── */}
            <section id="step2"
              className={`bg-white rounded-xl border border-outline-variant shadow-sm p-6 transition-all duration-300 ${!step1Done ? 'opacity-50 pointer-events-none select-none' : ''}`}>
              <h2 className="text-base font-semibold text-primary mb-5 pb-3 border-b border-outline-variant flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step1Done ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {step1Done ? '2' : <span className="material-symbols-outlined text-[14px]">lock</span>}
                </span>
                Primeiro Utilizador (Director)
              </h2>

              {!step1Done ? (
                <p className="text-sm text-on-surface-variant">Preencha a identidade da escola primeiro para desbloquear esta secção.</p>
              ) : directorCriado ? (
                /* ── Credenciais geradas ── */
                <div>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                    <div>
                      <p className="font-semibold text-green-800">Director criado com sucesso!</p>
                      <p className="text-xs text-green-700 mt-0.5">O sistema gerou automaticamente as credenciais de acesso.</p>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 mb-6">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
                      Credenciais de Acesso — {directorCriado.nome}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg border border-outline-variant p-4">
                        <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          Código de Acesso
                        </p>
                        <p className="font-mono font-bold text-primary text-2xl tracking-widest">{directorCriado.codigo}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Formato: <strong>{form1.sigla?.toUpperCase() || '???'}.DIR.NNN</strong>
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border border-outline-variant p-4">
                        <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">key</span>
                          Senha Padrão
                        </p>
                        <p className="font-mono font-bold text-on-surface text-2xl tracking-widest">{directorCriado.senha_padrao}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          {form2.data_nascimento ? 'Data de nascimento (DDMMAAAA)' : 'Senha padrão do sistema'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="material-symbols-outlined text-amber-500 text-[16px] flex-shrink-0 mt-0.5">warning</span>
                      <p className="text-xs text-amber-700">
                        Guarde estas credenciais antes de continuar. O director deverá alterar a senha no primeiro acesso.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => navigate('/admin/escolas')}
                      className="flex-1 border border-outline-variant text-on-surface rounded-lg py-3 text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      Voltar ao Painel Admin
                    </button>
                    <button onClick={() => navigate('/login', { state: { codigoSugerido: directorCriado.codigo } })}
                      className="flex-1 bg-primary text-on-primary rounded-lg py-3 text-sm font-semibold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      Fazer Login como Director
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Formulário ── */
                <form onSubmit={handleSaveStep2}>
                  {error2 && (
                    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {error2}
                    </div>
                  )}

                  <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-500 text-[18px] flex-shrink-0 mt-0.5">info</span>
                    <div className="text-xs text-blue-700">
                      <p className="font-semibold mb-1">Código gerado automaticamente</p>
                      <p>O sistema irá gerar o código de acesso no formato <strong>{form1.sigla?.toUpperCase() || 'SIGLA'}.DIR.001</strong> e a senha padrão será a data de nascimento (<strong>DDMMAAAA</strong>). Se não definir data de nascimento, a senha padrão será <strong>sige2024</strong>.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-on-surface mb-1.5">Nome completo *</label>
                      <input name="nome" value={form2.nome} onChange={handleChange2}
                        className={inputCls} placeholder="Nome do director" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-on-surface mb-1.5">
                        Data de Nascimento
                        <span className="text-on-surface-variant font-normal ml-1">(define a senha padrão)</span>
                      </label>
                      <input name="data_nascimento" value={form2.data_nascimento} onChange={handleChange2}
                        type="date" className={inputCls} />
                      <p className="text-xs text-on-surface-variant mt-1">Opcional — se não preencher, a senha padrão será <strong>sige2024</strong>.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={saving2}
                      className="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
                      {saving2
                        ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A criar...</>
                        : <><span className="material-symbols-outlined text-[16px]">person_add</span>Criar Director</>}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>

          {/* ─── Coluna direita: Preview ─── */}
          <div className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                Pré-visualização em Tempo Real
              </h3>
              <p className="text-xs text-on-surface-variant mb-5">Como o sistema aparecerá para os utilizadores.</p>

              {/* Mini mockup */}
              <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface flex h-56 mb-5">
                <div className="w-1/3 p-3 flex flex-col gap-3" style={{ backgroundColor: form1.cor_principal }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="w-8 h-8 rounded object-contain self-center" />
                    : <div className="w-8 h-8 rounded-full bg-white/20 self-center" />}
                  <div className="w-full h-1.5 bg-white/20 rounded-full"></div>
                  <div className="w-3/4 h-1.5 bg-white/20 rounded-full"></div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full mt-2"></div>
                  <div className="w-3/4 h-1.5 bg-white/20 rounded-full"></div>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <div className="text-[8px] font-bold truncate" style={{ color: form1.cor_principal }}>
                    {form1.nome || 'Nome da Escola'}
                  </div>
                  <div className="flex-1 rounded border flex items-center justify-center"
                    style={{ borderColor: form1.cor_secundaria, backgroundColor: form1.cor_secundaria + '18' }}>
                    <div className="w-full h-full p-2 flex flex-col gap-1">
                      <div className="h-1.5 bg-surface-container-highest rounded-full w-3/4"></div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full w-1/2"></div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1 h-5 rounded text-[7px] flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: form1.cor_principal }}>Entrar</div>
                    <div className="flex-1 h-5 rounded text-[7px] flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: form1.cor_secundaria }}>Guardar</div>
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="space-y-2">
                {[
                  { label: 'Escola', value: form1.nome || '—' },
                  { label: 'Sigla', value: form1.sigla || '—' },
                  { label: 'Província', value: form1.provincia || '—' },
                  { label: 'Ano Lectivo', value: form1.ano_lectivo },
                  { label: 'Nível', value: form1.nivel_ensino },
                  { label: 'Director', value: form2.nome || '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">{row.label}:</span>
                    <span className="font-medium text-on-surface truncate max-w-[150px] text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
