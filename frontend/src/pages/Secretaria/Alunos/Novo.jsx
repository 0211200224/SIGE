import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const PARENTESCO = ['Pai/Mãe', 'Pai', 'Mãe', 'Avó/Avô', 'Tio/Tia', 'Irmão/Irmã', 'Tutor', 'Outro']
const inputCls = "w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
const emptyForm = {
  nome: '', foto: '', data_nascimento: '', genero: '', naturalidade: '', nacionalidade: 'Moçambicana', bi: '',
  nome_pai: '', nome_mae: '', escola_anterior: '',
  telefone: '', email: '', endereco: '',
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

  const [encarregados, setEncarregados] = useState([])
  const [encarregadoSelecionado, setEncarregadoSelecionado] = useState(null)
  const [showEncDropdown, setShowEncDropdown] = useState(false)

  useEffect(() => {
    api.get('/secretaria/turmas').then(r => setTurmas(r.data || [])).catch(() => {})
    api.get('/secretaria/encarregados').then(r => setEncarregados(r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const encarregadosFiltrados = form.nome_encarregado.length >= 1
    ? encarregados.filter(e => e.nome?.toLowerCase().includes(form.nome_encarregado.toLowerCase()))
    : []

  const selecionarEncarregado = (enc) => {
    setEncarregadoSelecionado(enc)
    setForm(f => ({ ...f, nome_encarregado: enc.nome, tel_encarregado: enc.telefone || '', parentesco: enc.parentesco || f.parentesco }))
    setShowEncDropdown(false)
  }

  const limparEncarregadoSelecionado = () => {
    setEncarregadoSelecionado(null)
    setForm(f => ({ ...f, nome_encarregado: '', tel_encarregado: '' }))
  }

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
      const novoAlunoId = r.data.id
      // Liga o encarregado ao aluno sem duplicar: se foi seleccionado um
      // encarregado ja existente na pesquisa, so associa; caso contrario, se um
      // nome foi escrito à mão, cria um encarregado novo já ligado a este aluno.
      try {
        if (encarregadoSelecionado) {
          await api.post(`/secretaria/alunos/${novoAlunoId}/encarregados`, { encarregado_id: encarregadoSelecionado.id, principal: true })
        } else if (form.nome_encarregado.trim()) {
          await api.post('/secretaria/encarregados', {
            nome: form.nome_encarregado.trim(), telefone: form.tel_encarregado || null,
            parentesco: form.parentesco, aluno_id: novoAlunoId, principal: true,
          })
        }
      } catch (_) { /* aluno já foi criado; a ligação do encarregado pode ser feita depois na ficha */ }
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
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border-2 border-green-300 shadow-lg p-5 sm:p-8 text-center">
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <PageHeader title="Registar Novo Aluno" subtitle="Dados pessoais, encarregado e matrícula" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 sm:p-6">
        <SectionTitle icon="photo_camera" title="Fotografia (tipo passe)" />
        <div className="flex items-center gap-5 mb-2 flex-wrap">
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
          <Field label="Naturalidade">
            <input value={form.naturalidade} onChange={e => set('naturalidade', e.target.value)}
              className={inputCls} placeholder="Local de nascimento" />
          </Field>
          <Field label="Nacionalidade">
            <input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)}
              className={inputCls} />
          </Field>
          <Field label="BI / Certidão de Nascimento">
            <input value={form.bi} onChange={e => set('bi', e.target.value)}
              className={inputCls} placeholder="Nº do documento" />
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

        <SectionTitle icon="diversity_1" title="Filiação" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome do Pai">
            <input value={form.nome_pai} onChange={e => set('nome_pai', e.target.value)}
              className={inputCls} placeholder="Nome completo do pai" />
          </Field>
          <Field label="Nome da Mãe">
            <input value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)}
              className={inputCls} placeholder="Nome completo da mãe" />
          </Field>
        </div>

        <SectionTitle icon="family_restroom" title="Encarregado de Educação" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nome do Encarregado">
              {encarregadoSelecionado ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-400 bg-green-50 px-3 py-2.5">
                  <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface">{encarregadoSelecionado.nome}</p>
                    <p className="text-xs text-on-surface-variant">Encarregado já cadastrado — vai ser ligado a este aluno, sem duplicar.</p>
                  </div>
                  <button type="button" onClick={limparEncarregadoSelecionado} className="text-xs text-primary hover:underline flex-shrink-0">Trocar</button>
                </div>
              ) : (
                <div className="relative">
                  <input value={form.nome_encarregado} autoComplete="off"
                    onChange={e => { set('nome_encarregado', e.target.value); setShowEncDropdown(true) }}
                    onFocus={() => setShowEncDropdown(true)}
                    onBlur={() => setTimeout(() => setShowEncDropdown(false), 150)}
                    className={inputCls} placeholder="Nome completo — escreva para procurar encarregados já cadastrados" />
                  {showEncDropdown && encarregadosFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full border border-outline-variant rounded-lg mt-1 shadow-lg bg-white max-h-48 overflow-y-auto">
                      {encarregadosFiltrados.slice(0, 8).map(enc => (
                        <button key={enc.id} type="button" onMouseDown={() => selecionarEncarregado(enc)}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 border-b border-outline-variant/30 last:border-0 flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">supervisor_account</span>
                          <div>
                            <span className="font-semibold text-on-surface">{enc.nome}</span>
                            {enc.telefone && <span className="text-xs text-on-surface-variant ml-2">{enc.telefone}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-on-surface-variant mt-1">Se aparecer na lista, clique para ligar o encarregado existente em vez de o recriar.</p>
                </div>
              )}
            </Field>
          </div>
          <Field label="Telefone do Encarregado">
            <input value={form.tel_encarregado} onChange={e => set('tel_encarregado', e.target.value)}
              disabled={!!encarregadoSelecionado}
              className={`${inputCls} ${encarregadoSelecionado ? 'opacity-60' : ''}`} placeholder="+258 84 000 0000" />
          </Field>
          <Field label="Parentesco">
            <select value={form.parentesco} onChange={e => set('parentesco', e.target.value)} className={inputCls}>
              {PARENTESCO.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <SectionTitle icon="class" title="Turma e Percurso Escolar" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Turma — pode fazer a matrícula formal depois">
              <select value={form.class_group_id} onChange={e => set('class_group_id', e.target.value)} className={inputCls}>
                <option value="">Sem turma por agora</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} · {t.classe_nome} · {t.turno} · {t.total_alunos ?? 0}/{t.capacidade}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Última Escola Frequentada">
              <input value={form.escola_anterior} onChange={e => set('escola_anterior', e.target.value)}
                className={inputCls} placeholder="Opcional — para alunos transferidos de outra escola" />
            </Field>
          </div>
        </div>

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
