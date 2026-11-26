import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import PageHeader from '../../../components/ui/PageHeader'
import { useVoltar } from '../../../hooks/useNavegacao'
import { BANCOS_MZ, PORTAIS_EQUIPA, validarContaPagamento } from '../../../services/rhConstantes'

const TIPOS_CONTRATO = ['efectivo', 'termo_certo', 'termo_incerto', 'prestacao_servicos', 'estagio']
// A escola paga por dia (ou salário mensal fixo) -- nunca por hora.
const REGIMES_SALARIAIS = [
  { v: 'diario', l: 'Diário (valor por dia trabalhado)' },
  { v: 'mensal', l: 'Mensal (salário fixo)' },
]
const ROLES = ['professor', 'secretaria', 'financeiro', 'rh', 'pedagogico', 'outro']
const ROLES_SISTEMA = PORTAIS_EQUIPA.map(p => ({ value: p.v, label: p.l }))
const GENEROS = [{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }, { v: 'outro', l: 'Outro' }]
// No registo a escolha é obrigatória (nunca fica "a confirmar" por omissão):
// decide directamente se o funcionário leva desconto de INSS na folha.
const SUJEITO_INSS_OPCOES = [
  { v: 'sim', l: 'Sim — desconta INSS', cls: 'bg-red-100 text-red-700' },
  { v: 'nao', l: 'Não — não desconta', cls: 'bg-gray-100 text-gray-600' },
]
const METODOS_PAGAMENTO = [
  { v: 'banco', l: 'Banco', icon: 'account_balance' },
  { v: 'mpesa', l: 'M-Pesa', icon: 'smartphone' },
  { v: 'emola', l: 'E-Mola', icon: 'smartphone' },
]

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all'
const labelCls = 'block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide'

const PASSOS = [
  { n: 1, label: 'Dados do Funcionário', icon: 'person' },
  { n: 2, label: 'Contrato', icon: 'description' },
  { n: 3, label: 'Acesso ao Sistema', icon: 'manage_accounts' },
]

function Stepper({ passo }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {PASSOS.map((p, i) => (
        <div key={p.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
              passo === p.n ? 'bg-primary text-on-primary' : passo > p.n ? 'bg-primary/15 text-primary' : 'bg-surface-bright text-on-surface-variant'
            }`}>
              {passo > p.n ? <span className="material-symbols-outlined text-[18px]">check</span> : p.n}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${passo === p.n ? 'text-on-surface' : 'text-on-surface-variant'}`}>{p.label}</span>
          </div>
          {i < PASSOS.length - 1 && <div className={`flex-1 h-px mx-3 ${passo > p.n ? 'bg-primary/40' : 'bg-outline-variant'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function FuncionarioNovo() {
  const navigate = useNavigate()
  const voltar = useVoltar('/rh/funcionarios')
  const { escola } = useAuth()
  const fotoRef = useRef()
  const [passo, setPasso] = useState(1)
  const [funcId, setFuncId] = useState(null)
  const [funcNome, setFuncNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', bi: '', nuit: '', numero_seguranca_social: '',
    data_nascimento: '', genero: '', endereco: '', role: '', departamento_id: '',
    cargo_id: '', banco: '', conta_bancaria: '', foto: '', numero_dependentes: '0',
    sujeito_inss: '', metodo_pagamento: 'banco',
  })
  const [bancoOutro, setBancoOutro] = useState(false)
  const [departamentos, setDepartamentos] = useState([])
  const [cargos, setCargos] = useState([])

  const [contrato, setContrato] = useState({
    tipo: '', data_inicio: new Date().toISOString().slice(0, 10), data_fim: '',
    regime_salarial: 'diario', salario: '', horas_semanais: '40', observacoes: '',
  })

  const [acessoRole, setAcessoRole] = useState('')
  const [acessoExtras, setAcessoExtras] = useState([])
  const [acessoResultado, setAcessoResultado] = useState(null)

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

  const cargosFiltrados = form.departamento_id
    ? cargos.filter(c => String(c.departamento_id) === String(form.departamento_id))
    : cargos

  const submitFuncionario = async (e) => {
    e.preventDefault()
    if (!form.nome) { setError('O nome é obrigatório.'); return }
    if (!form.bi.trim()) { setError('O número do BI é obrigatório.'); return }
    const erroConta = validarContaPagamento(form)
    if (erroConta) { setError(erroConta); return }
    if (!form.sujeito_inss) { setError('Indique se o funcionário desconta INSS.'); return }
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/rh/funcionarios', form)
      setFuncId(r.data.id)
      setFuncNome(form.nome)
      setPasso(2)
    } catch (err) {
      setError(err.message || 'Erro ao registar funcionário.')
    } finally {
      setLoading(false)
    }
  }

  const submitContrato = async (e) => {
    e.preventDefault()
    if (!contrato.tipo) { setError('Seleccione o tipo de contrato.'); return }
    if (!contrato.data_inicio) { setError('A data de início é obrigatória.'); return }
    if (!contrato.salario) { setError('O salário é obrigatório.'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/rh/contratos', { funcionario_id: funcId, ...contrato })
      setPasso(3)
    } catch (err) {
      setError(err.message || 'Erro ao criar contrato.')
    } finally {
      setLoading(false)
    }
  }

  const pularContrato = () => setPasso(3)

  const submitAcesso = async (e) => {
    e.preventDefault()
    if (!acessoRole) { setError('Seleccione um portal de acesso.'); return }
    setLoading(true)
    setError('')
    try {
      const r = await api.post(`/rh/funcionarios/${funcId}/acesso`, { role: acessoRole, portais: acessoExtras.filter(p => p !== acessoRole) })
      setAcessoResultado(r.data)
    } catch (err) {
      setError(err.message || 'Erro ao criar acesso.')
    } finally {
      setLoading(false)
    }
  }

  const imprimirCredenciais = () => {
    const cor = escola?.cor_principal || '#1a2b4b'
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Credenciais — ${funcNome}</title>
      <style>
        *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111;max-width:420px}
        h1{font-size:14px;margin:0 0 2px}p{margin:2px 0;color:#555}
        .header{border-bottom:3px solid ${cor};padding-bottom:10px;margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .header img{width:40px;height:40px;object-fit:contain;border-radius:8px}
        .titulo{color:${cor};font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;margin:16px 0 10px}
        .caixa{border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin-bottom:10px}
        .caixa label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:3px}
        .caixa .valor{font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:.04em;color:#111}
        .aviso{font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-top:12px}
        .rodape{text-align:center;font-size:8px;color:#aaa;margin-top:24px}
      </style></head>
      <body>
        <div class="header">
          ${escola?.logo ? `<img src="${escola.logo}" />` : ''}
          <div><h1 style="color:${cor}">${escola?.nome || 'Escola'}</h1><p>${escola?.localizacao || ''}</p></div>
        </div>
        <p class="titulo">Credenciais de Acesso ao Sistema</p>
        <p><b>${funcNome}</b></p>
        ${(acessoResultado.codigos || [{ portal: acessoResultado.role, codigo: acessoResultado.codigo }]).map(c =>
          `<div class="caixa"><label>Código — ${ROLES_SISTEMA.find(r => r.value === c.portal)?.label || c.portal}</label><div class="valor">${c.codigo}</div></div>`
        ).join('')}
        <div class="caixa"><label>Senha Inicial</label><div class="valor">${acessoResultado.senha_padrao}</div></div>
        <p class="aviso">Guarde este documento em local seguro. Deverá alterar a senha no primeiro login.</p>
        <p class="rodape">Documento gerado pelo SIGE — Sistema Integrado de Gestão Escolar · ${new Date().toLocaleString('pt-MZ')}</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <PageHeader title="Novo Funcionário" subtitle="Registo do funcionário, contrato e acesso ao sistema" />

      <Stepper passo={passo} />

      {error && (
        <div className="mb-5 flex items-center gap-3 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {/* PASSO 1 — Dados do Funcionário */}
      {passo === 1 && (
        <form onSubmit={submitFuncionario} className="space-y-6">
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
                <label className={labelCls}>BI / Passaporte *</label>
                <input name="bi" value={form.bi} onChange={handleChange} required placeholder="Número do documento" className={inputCls} />
                <p className="text-[11px] text-on-surface-variant mt-1">Único por funcionário — o sistema não aceita o mesmo BI duas vezes.</p>
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
                <label className={labelCls}>Nº de Dependentes</label>
                <input type="number" min="0" max="10" name="numero_dependentes" value={form.numero_dependentes} onChange={handleChange} className={inputCls} />
                <p className="text-[11px] text-on-surface-variant mt-1">Apenas informativo — a escola calcula o IRPS manualmente, fora do sistema.</p>
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

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">work</span>
              Função
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
            </div>
          </div>

          {/* Tudo o que decide quanto recebe e para onde vai o dinheiro --
              agrupado e obrigatório, porque é aqui que nascem os erros da folha. */}
          <div className="bg-white rounded-xl border-2 border-primary/30 p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
              Dados que afectam o salário
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Estes dados entram directamente na folha de pagamento e nos documentos E-Mola / M-Pesa / Banco. Confirme-os com o funcionário.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Desconta INSS? *</label>
                <select name="sujeito_inss" value={form.sujeito_inss} onChange={handleChange} required
                  className={`${inputCls} font-medium ${SUJEITO_INSS_OPCOES.find(o => o.v === form.sujeito_inss)?.cls || ''}`}>
                  <option value="">Seleccionar...</option>
                  {SUJEITO_INSS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <p className="text-[11px] text-on-surface-variant mt-1">Nem todos os funcionários são descontados — por isso tem de ser escolhido aqui.</p>
              </div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Método de Pagamento do Salário *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {METODOS_PAGAMENTO.map(m => (
                  <button key={m.v} type="button" onClick={() => setForm(f => ({ ...f, metodo_pagamento: m.v, banco: m.v === 'banco' ? f.banco : '' }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      form.metodo_pagamento === m.v ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-bright'
                    }`}>
                    <span className={`material-symbols-outlined text-[18px] ${form.metodo_pagamento === m.v ? 'text-primary' : 'text-on-surface-variant'}`}>{m.icon}</span>
                    <p className="text-sm font-semibold text-on-surface">{m.l}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.metodo_pagamento === 'banco' && (
                <div>
                  <label className={labelCls}>Banco *</label>
                  <select value={bancoOutro ? '__outro' : form.banco} required
                    onChange={e => {
                      const v = e.target.value
                      setBancoOutro(v === '__outro')
                      setForm(f => ({ ...f, banco: v === '__outro' ? '' : v }))
                      setError('')
                    }} className={inputCls}>
                    <option value="">Seleccionar banco...</option>
                    {BANCOS_MZ.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="__outro">Outro banco...</option>
                  </select>
                  {bancoOutro && (
                    <input name="banco" value={form.banco} onChange={handleChange} required placeholder="Nome do banco"
                      className={`${inputCls} mt-2`} />
                  )}
                  <p className="text-[11px] text-on-surface-variant mt-1">O nome do banco — a folha gera um ficheiro de transferência por banco.</p>
                </div>
              )}
              <div>
                <label className={labelCls}>
                  {form.metodo_pagamento === 'banco' ? 'Número da Conta Bancária *' : `Número ${form.metodo_pagamento === 'mpesa' ? 'M-Pesa' : 'E-Mola'} *`}
                </label>
                <input name="conta_bancaria" value={form.conta_bancaria} onChange={handleChange} required inputMode="numeric"
                  placeholder={form.metodo_pagamento === 'banco' ? 'Ex: 1164121445' : form.metodo_pagamento === 'mpesa' ? 'Ex: 84 123 4567' : 'Ex: 86 123 4567'}
                  className={inputCls} />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {form.metodo_pagamento === 'banco'
                    ? 'Só algarismos, tal como aparece no ficheiro do banco.'
                    : `9 algarismos a começar por ${form.metodo_pagamento === 'mpesa' ? '84 ou 85 (Vodacom)' : '86 ou 87 (Movitel)'}.`}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-3">
              O nome do funcionário vai como titular no ficheiro de pagamento — deve ser igual ao do BI / conta.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={voltar}
              className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-medium hover:bg-surface-bright transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
              {loading
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A registar...</>
                : <>Continuar para o Contrato<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
              }
            </button>
          </div>
        </form>
      )}

      {/* PASSO 2 — Contrato */}
      {passo === 2 && (
        <form onSubmit={submitContrato} className="space-y-6">
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
              Contrato de {funcNome}
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Sem contrato, o funcionário fica registado apenas para controlo de RH e não entra na folha salarial.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Tipo de Contrato *</label>
                <select value={contrato.tipo} onChange={e => setContrato(c => ({ ...c, tipo: e.target.value }))} className={inputCls}>
                  <option value="">Seleccionar</option>
                  {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Data de Início *</label>
                <input type="date" value={contrato.data_inicio} onChange={e => setContrato(c => ({ ...c, data_inicio: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Data de Término</label>
                <input type="date" value={contrato.data_fim} onChange={e => setContrato(c => ({ ...c, data_fim: e.target.value }))} className={inputCls} />
                <p className="text-[11px] text-on-surface-variant mt-1">Deixe em branco para contrato sem termo. O sistema marca automaticamente como expirado após esta data.</p>
              </div>
              <div>
                <label className={labelCls}>Regime Salarial</label>
                <select value={contrato.regime_salarial} onChange={e => setContrato(c => ({ ...c, regime_salarial: e.target.value }))} className={inputCls}>
                  {REGIMES_SALARIAIS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  {contrato.regime_salarial === 'mensal' ? 'Salário Mensal (MT) *' : 'Valor por Dia (MT) *'}
                </label>
                <input type="number" min="0" step="0.01" value={contrato.salario} onChange={e => setContrato(c => ({ ...c, salario: e.target.value }))}
                  placeholder="0.00" className={inputCls} />
                {contrato.regime_salarial === 'diario' && (
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Na folha: valor por dia × dias úteis do mês − faltas injustificadas. O RH só ajusta as excepções.
                    {parseFloat(contrato.salario) > 0 && <> Com 22 dias úteis ≈ <b>{(parseFloat(contrato.salario) * 22).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</b>/mês.</>}
                  </p>
                )}
              </div>
              {contrato.regime_salarial === 'mensal' && (
                <div>
                  <label className={labelCls}>Horas Semanais</label>
                  <input type="number" min="1" max="60" value={contrato.horas_semanais} onChange={e => setContrato(c => ({ ...c, horas_semanais: e.target.value }))} className={inputCls} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelCls}>Observações</label>
                <textarea rows={2} value={contrato.observacoes} onChange={e => setContrato(c => ({ ...c, observacoes: e.target.value }))}
                  placeholder="Opcional" className={`${inputCls} resize-none`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-between items-center flex-wrap">
            <button type="button" onClick={pularContrato}
              className="text-sm text-on-surface-variant hover:underline">
              Continuar sem criar contrato agora
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
              {loading
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>A criar...</>
                : <>Criar Contrato e Continuar<span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
              }
            </button>
          </div>
        </form>
      )}

      {/* PASSO 3 — Acesso ao Sistema */}
      {passo === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">manage_accounts</span>
              Acesso ao Sistema
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              {funcNome} pode ou não ter acesso para iniciar sessão no sistema. Isto é independente do contrato.
            </p>

            {acessoResultado ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">Acesso criado com sucesso!</p>
                  <div className="space-y-1 text-xs text-on-surface-variant">
                    {(acessoResultado.codigos || [{ portal: acessoResultado.role, codigo: acessoResultado.codigo }]).map(c => (
                      <p key={c.portal}>{ROLES_SISTEMA.find(r => r.value === c.portal)?.label || c.portal}: <b className="text-on-surface font-mono">{c.codigo}</b></p>
                    ))}
                    <p>Senha inicial (a mesma para todos os códigos): <b className="text-on-surface font-mono">{acessoResultado.senha_padrao}</b></p>
                  </div>
                  <p className="text-[10px] text-orange-600 mt-2">O funcionário deverá alterar a senha no primeiro login.</p>
                </div>
                <button onClick={imprimirCredenciais} type="button"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl border border-primary/30 text-primary font-semibold hover:bg-primary/5">
                  <span className="material-symbols-outlined text-[18px]">print</span>Imprimir Credenciais
                </button>
              </div>
            ) : (
              <form onSubmit={submitAcesso} className="space-y-4">
                <div>
                  <label className={labelCls}>Portais a que tem acesso (um ou mais)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PORTAIS_EQUIPA.map(p => {
                      const marcado = acessoExtras.includes(p.v)
                      return (
                        <div key={p.v}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${marcado ? 'border-primary bg-primary/5' : 'border-outline-variant'}`}>
                          <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                            <input type="checkbox" checked={marcado} onChange={() => {
                              const novos = marcado ? acessoExtras.filter(x => x !== p.v) : [...acessoExtras, p.v]
                              setAcessoExtras(novos)
                              if (!marcado && !acessoRole) setAcessoRole(p.v)
                              if (marcado && acessoRole === p.v) setAcessoRole(novos[0] || '')
                              setError('')
                            }} />
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{p.icon}</span>
                            {p.l}
                          </label>
                          {marcado && (
                            <button type="button" onClick={() => setAcessoRole(p.v)}
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${acessoRole === p.v ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                              {acessoRole === p.v ? 'Principal' : 'Tornar principal'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    Um só código de entrada para todos os portais escolhidos. O principal é onde entra por omissão; o Diretor pode acrescentar ou retirar portais mais tarde.
                  </p>
                </div>
                <p className="text-xs text-on-surface-variant">
                  A senha inicial será a data de nascimento do funcionário (DDMMAAAA) ou <span className="font-mono">sige2024</span> se não estiver definida.
                </p>
                <div className="flex justify-end">
                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60">
                    {loading ? 'A criar...' : 'Criar Acesso'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => navigate(`/rh/funcionarios/${funcId}`, { replace: true })}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {acessoResultado ? 'Concluir' : 'Concluir sem atribuir acesso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
