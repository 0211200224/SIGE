import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const PARENTESCO = ['Pai/Mãe', 'Pai', 'Mãe', 'Avó/Avô', 'Tio/Tia', 'Irmão/Irmã', 'Tutor', 'Outro']
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
const emptyForm = {
  nome: '', foto: '', data_nascimento: '', genero: '', telefone: '', email: '', endereco: '',
  nome_encarregado: '', tel_encarregado: '', parentesco: 'Pai/Mãe', class_group_id: '',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
      <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      <h3 className="font-semibold text-on-surface text-sm">{title}</h3>
      <div className="flex-1 h-px bg-outline-variant ml-2" />
    </div>
  )
}

export default function AlunoNovo() {
  const navigate = useNavigate()
  const fotoRef = useRef()
  const [form, setForm] = useState(emptyForm)
  const [turmas, setTurmas] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [credenciais, setCredenciais] = useState(null)

  useEffect(() => {
    api.get('/secretaria/turmas').then(r => setTurmas(r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('A foto não pode exceder 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => set('foto', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome.trim()) { setError('O nome do aluno é obrigatório'); return }
    setSaving(true)
    try {
      const r = await api.post('/secretaria/alunos', { ...form, class_group_id: form.class_group_id || null })
      if (r.data.codigo_acesso) {
        setCredenciais({ id: r.data.id, nome: r.data.nome, codigo: r.data.codigo_acesso, senha: r.data.senha_padrao })
      } else {
        navigate(`/secretaria/alunos/${r.data.id}`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (credenciais) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border-2 border-green-300 shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-1">Aluno Registado com Sucesso!</h2>
          <p className="text-sm text-on-surface-variant mb-6">{credenciais.nome} foi adicionado ao sistema.</p>

          <div className="bg-primary/5 rounded-xl border border-primary/15 p-5 text-left space-y-4 mb-6">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Credenciais de Acesso ao Portal do Estudante</p>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-outline-variant">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Código de Acesso</p>
                <p className="font-mono font-bold text-primary text-xl tracking-widest">{credenciais.codigo}</p>
              </div>
              <span className="material-symbols-outlined text-primary/40 text-4xl">badge</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-outline-variant">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Senha Padrão (data de nascimento)</p>
                <p className="font-mono font-bold text-on-surface text-xl tracking-widest">{credenciais.senha}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">key</span>
            </div>
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              O aluno deverá alterar a senha no primeiro acesso.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setCredenciais(null); setForm(emptyForm); setSaving(false) }}
              className="flex-1 border border-outline-variant text-on-surface rounded-lg py-2.5 text-sm hover:bg-surface-container-low transition-colors">
              Registar Outro
            </button>
            <button onClick={() => navigate(`/secretaria/alunos/${credenciais.id}`)}
              className="flex-1 bg-primary text-on-primary rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Ver Ficha do Aluno
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Registar Novo Aluno" subtitle="Dados pessoais, encarregado e matrícula" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
        <SectionTitle icon="photo_camera" title="Fotografia (tipo passe)" />
        <div className="flex items-center gap-5 mb-2">
          <div onClick={() => fotoRef.current?.click()}
            className="w-24 h-28 rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-surface-container-low flex-shrink-0">
            {form.foto
              ? <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
              : <div className="text-center p-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-2xl">add_photo_alternate</span>
                  <p className="text-[10px] text-on-surface-variant mt-1">Adicionar</p>
                </div>
            }
          </div>
          <div>
            <button type="button" onClick={() => fotoRef.current?.click()}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[16px]">upload</span>
              {form.foto ? 'Alterar foto' : 'Carregar foto'}
            </button>
            {form.foto && (
              <button type="button" onClick={() => set('foto', '')} className="mt-2 flex items-center gap-1 text-xs text-error hover:underline">
                <span className="material-symbols-outlined text-[13px]">delete</span>Remover
              </button>
            )}
            <p className="text-xs text-on-surface-variant mt-2">JPG ou PNG, máx. 2MB. Formato 3×4.</p>
          </div>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
        </div>

        <SectionTitle icon="person" title="Dados Pessoais" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nome Completo" required>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                className={inputCls} placeholder="Nome completo do aluno" />
            </Field>
          </div>
          <Field label="Data de Nascimento">
            <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)}
              className={inputCls} />
          </Field>
          <Field label="Género">
            <select value={form.genero} onChange={e => set('genero', e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
          <Field label="Telefone">
            <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
              className={inputCls} placeholder="+258 84 000 0000" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className={inputCls} placeholder="aluno@email.com" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <textarea value={form.endereco} onChange={e => set('endereco', e.target.value)}
                className={`${inputCls} resize-none`} rows={2} placeholder="Rua, bairro, cidade..." />
            </Field>
          </div>
        </div>

        <SectionTitle icon="family_restroom" title="Encarregado de Educação" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nome do Encarregado">
              <input value={form.nome_encarregado} onChange={e => set('nome_encarregado', e.target.value)}
                className={inputCls} placeholder="Nome completo" />
            </Field>
          </div>
          <Field label="Telefone do Encarregado">
            <input value={form.tel_encarregado} onChange={e => set('tel_encarregado', e.target.value)}
              className={inputCls} placeholder="+258 84 000 0000" />
          </Field>
          <Field label="Parentesco">
            <select value={form.parentesco} onChange={e => set('parentesco', e.target.value)} className={inputCls}>
              {PARENTESCO.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <SectionTitle icon="class" title="Turma (opcional)" />
        <Field label="Seleccionar Turma — pode fazer a matrícula formal depois">
          <select value={form.class_group_id} onChange={e => set('class_group_id', e.target.value)} className={inputCls}>
            <option value="">Sem turma por agora</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome} · {t.classe_nome} · {t.turno} · {t.total_alunos ?? 0}/{t.capacidade}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-outline-variant">
          <button type="button" onClick={() => navigate('/secretaria/alunos')}
            className="px-5 py-2 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low border border-outline-variant transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-all">
            {saving
              ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>A guardar...</>
              : <><span className="material-symbols-outlined text-[16px]">save</span>Registar Aluno</>}
          </button>
        </div>
      </form>
    </div>
  )
}
