import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import PageHeader from '../../../components/ui/PageHeader'

const TIPOS_CONTRATO = ['efectivo', 'termo_certo', 'termo_incerto', 'prestacao_servicos', 'estagio']
const ROLES = ['professor', 'secretaria', 'financeiro', 'rh', 'pedagogico', 'outro']
const GENEROS = [{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }, { v: 'outro', l: 'Outro' }]

export default function FuncionarioNovo() {
  const navigate = useNavigate()
  const fotoRef = useRef()
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', bi: '', nuit: '', numero_seguranca_social: '',
    data_nascimento: '', genero: '', endereco: '', role: '', departamento_id: '',
    cargo_id: '', salario_base: '', tipo_contrato: '', data_admissao: '',
    banco: '', conta_bancaria: '', foto: ''
  })
  const [departamentos, setDepartamentos] = useState([])
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/rh/departamentos').then(r => setDepartamentos(r.data)).catch(() => {})
    api.get('/rh/cargos').then(r => setCargos(r.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('A foto não pode exceder 2MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) { setError('O nome é obrigatório.'); return }
    setLoading(true)
    try {
      const r = await api.post('/rh/funcionarios', form)
      navigate(`/rh/contratos?novo_func=${r.data.id}&nome=${encodeURIComponent(form.nome)}`)
    } catch (err) {
      setError(err.message || 'Erro ao registar funcionário.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all'
  const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide'

  const cargosFiltrados = form.departamento_id
    ? cargos.filter(c => String(c.departamento_id) === String(form.departamento_id))
    : cargos

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Novo Funcionário" subtitle="Preencha os dados do novo colaborador" />

      {error && (
        <div className="mb-5 flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">photo_camera</span>
            Fotografia (tipo passe)
          </h3>
          <div className="flex items-center gap-6">
            <div onClick={() => fotoRef.current?.click()}
              className="w-28 h-32 rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-surface-bright">
              {form.foto
                ? <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
                : <div className="text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">add_photo_alternate</span>
                    <p className="text-xs text-on-surface-variant mt-1">Adicionar foto</p>
                  </div>
              }
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-2">Fotografia 3×4 (tipo passe)</p>
              <button type="button" onClick={() => fotoRef.current?.click()}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-[16px]">upload</span>
                {form.foto ? 'Alterar foto' : 'Carregar foto'}
              </button>
              {form.foto && (
                <button type="button" onClick={() => setForm(f => ({ ...f, foto: '' }))}
                  className="mt-2 flex items-center gap-1 text-xs text-error hover:underline">
                  <span className="material-symbols-outlined text-[14px]">delete</span>Remover
                </button>
              )}
              <p className="text-xs text-on-surface-variant mt-2">JPG ou PNG, máx. 2MB</p>
            </div>
          </div>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
        </div>

        {/* Dados Pessoais */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            Dados Pessoais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome Completo *</label>
              <input name="nome" value={form.nome} onChange={handleChange} required
                placeholder="Nome completo do funcionário" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de Nascimento</label>
              <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Género</label>
              <select name="genero" value={form.genero} onChange={handleChange} className={inputCls}>
                <option value="">Seleccionar</option>
                {GENEROS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>BI / Passaporte</label>
              <input name="bi" value={form.bi} onChange={handleChange} placeholder="Número do documento" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>NUIT</label>
              <input name="nuit" value={form.nuit} onChange={handleChange} placeholder="Número de contribuinte" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nº Segurança Social</label>
              <input name="numero_seguranca_social" value={form.numero_seguranca_social} onChange={handleChange} placeholder="INSS" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="+258 84 000 0000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@escola.co.mz" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereço</label>
              <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Bairro, Rua, nº..." className={inputCls} />
            </div>
          </div>
        </div>

        {/* Dados Profissionais */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">work</span>
            Dados Profissionais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Função / Role</label>
              <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
                <option value="">Seleccionar</option>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Departamento</label>
              <select name="departamento_id" value={form.departamento_id} onChange={handleChange} className={inputCls}>
                <option value="">Sem departamento</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Cargo</label>
              <select name="cargo_id" value={form.cargo_id} onChange={handleChange} className={inputCls}>
                <option value="">Sem cargo</option>
                {cargosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de Contrato</label>
              <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange} className={inputCls}>
                <option value="">Seleccionar</option>
                {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data de Admissão</label>
              <input type="date" name="data_admissao" value={form.data_admissao} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Salário Base (MT)</label>
              <input type="number" name="salario_base" value={form.salario_base} onChange={handleChange}
                placeholder="0.00" min="0" step="0.01" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
            Dados Bancários
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Banco</label>
              <input name="banco" value={form.banco} onChange={handleChange} placeholder="Ex: BCI, BIM, Standard Bank..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Conta Bancária / NIB</label>
              <input name="conta_bancaria" value={form.conta_bancaria} onChange={handleChange} placeholder="Número de conta" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/rh/funcionarios')}
            className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-medium hover:bg-surface-bright transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {loading
              ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A registar...</>
              : <><span className="material-symbols-outlined text-[18px]">check_circle</span>Registar Funcionário</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
