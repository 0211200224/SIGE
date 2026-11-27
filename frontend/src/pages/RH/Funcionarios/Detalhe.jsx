import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import { useVoltar } from '../../../hooks/useNavegacao'

const Row = ({ label, value }) => (
  <div className="py-2.5 border-b border-outline-variant/50 last:border-0 flex justify-between gap-4">
    <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wide shrink-0">{label}</span>
    <span className="text-sm text-on-surface text-right min-w-0 truncate">{value || '—'}</span>
  </div>
)

const TIPO_FALTA = { injustificada: 'Injustificada', justificada: 'Justificada', medica: 'Médica', licenca: 'Licença' }

const ROLES_SISTEMA = [
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'professor', label: 'Professor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'pedagogico', label: 'Pedagógico' },
]

const TIPOS_CONTRATO = ['efectivo', 'termo_certo', 'termo_incerto', 'prestacao_servicos', 'estagio']
// A escola paga por dia (ou salário mensal fixo) -- nunca por hora.
const REGIMES_SALARIAIS = [
  { v: 'diario', l: 'Diário (valor por dia trabalhado)' },
  { v: 'mensal', l: 'Mensal (salário fixo)' },
]
const ESTADO_CONTRATO_CLS = {
  activo: 'bg-green-100 text-green-700',
  expirado: 'bg-orange-100 text-orange-700',
  rescindido: 'bg-red-100 text-red-700',
  renovado: 'bg-gray-100 text-gray-500',
}
const contratoInputCls = 'w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white'
const contratoLabelCls = 'block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide'

function ModalContrato({ funcionarioId, base, onClose, onSaved }) {
  const renovando = !!base
  const [form, setForm] = useState({
    tipo: base?.tipo || '', data_inicio: renovando ? new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    data_fim: '', regime_salarial: base?.regime_salarial === 'mensal' ? 'mensal' : 'diario', salario: base?.salario || '',
    horas_semanais: base?.horas_semanais || '40', observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tipo) return setErro('Seleccione o tipo de contrato.')
    if (!form.data_inicio) return setErro('A data de início é obrigatória.')
    if (!form.salario) return setErro('O salário é obrigatório.')
    setSaving(true)
    setErro('')
    try {
      if (renovando) await api.post(`/rh/contratos/${base.id}/renovar`, form)
      else await api.post('/rh/contratos', { funcionario_id: funcionarioId, ...form })
      onSaved()
      onClose()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">{renovando ? 'Renovar Contrato' : 'Criar Contrato'}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={contratoLabelCls}>Tipo de Contrato *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={contratoInputCls}>
              <option value="">Seleccionar</option>
              {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={contratoLabelCls}>Data de Início *</label>
              <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} className={contratoInputCls} />
            </div>
            <div>
              <label className={contratoLabelCls}>Data de Término</label>
              <input type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} className={contratoInputCls} />
            </div>
          </div>
          <div>
            <label className={contratoLabelCls}>Regime Salarial</label>
            <select value={form.regime_salarial} onChange={e => set('regime_salarial', e.target.value)} className={contratoInputCls}>
              {REGIMES_SALARIAIS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={contratoLabelCls}>
                {form.regime_salarial === 'mensal' ? 'Salário Mensal (MT) *' : 'Valor por Dia (MT) *'}
              </label>
              <input type="number" min="0" step="0.01" value={form.salario} onChange={e => set('salario', e.target.value)} className={contratoInputCls} />
            </div>
            {form.regime_salarial === 'mensal' && (
              <div>
                <label className={contratoLabelCls}>Horas Semanais</label>
                <input type="number" min="1" max="60" value={form.horas_semanais} onChange={e => set('horas_semanais', e.target.value)} className={contratoInputCls} />
              </div>
            )}
          </div>
          <div>
            <label className={contratoLabelCls}>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Opcional"
              className={`${contratoInputCls} resize-none`} />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A guardar...' : renovando ? 'Renovar Contrato' : 'Criar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalRescindirContrato({ contrato, onClose, onSaved }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErro('')
    try {
      await api.patch(`/rh/contratos/${contrato.id}/rescindir`, { motivo })
      onSaved()
      onClose()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Rescindir Contrato</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          O contrato passa a estado rescindido e deixa de afectar a folha salarial.
        </p>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={contratoLabelCls}>Motivo</label>
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional"
              className={`${contratoInputCls} resize-none`} />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white font-semibold disabled:opacity-60">
              {saving ? 'A processar...' : 'Rescindir Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCriarAcesso({ funcionario, onClose, onSaved }) {
  const { escola } = useAuth()
  const [role, setRole] = useState('')
  const [selecionados, setSelecionados] = useState([])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  const alternar = (p) => {
    const marcado = selecionados.includes(p)
    const novos = marcado ? selecionados.filter(x => x !== p) : [...selecionados, p]
    setSelecionados(novos)
    if (!marcado && !role) setRole(p)
    if (marcado && role === p) setRole(novos[0] || '')
    setErro('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) return setErro('Seleccione pelo menos um portal de acesso')
    setSaving(true)
    setErro('')
    try {
      const r = await api.post(`/rh/funcionarios/${funcionario.id}/acesso`, { role, portais: selecionados.filter(p => p !== role) })
      setResultado(r.data)
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  const imprimirCredenciais = () => {
    const cor = escola?.cor_principal || '#1a2b4b'
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Credenciais — ${funcionario.nome}</title>
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
        <p><b>${funcionario.nome}</b></p>
        ${(resultado.codigos || [{ portal: resultado.role, codigo: resultado.codigo }]).map(c =>
          `<div class="caixa"><label>Código — ${ROLES_SISTEMA.find(r => r.value === c.portal)?.label || c.portal}</label><div class="valor">${c.codigo}</div></div>`
        ).join('')}
        <div class="caixa"><label>Senha Inicial</label><div class="valor">${resultado.senha_padrao}</div></div>
        <p class="aviso">Guarde este documento em local seguro. Deverá alterar a senha no primeiro login.</p>
        <p class="rodape">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP · ${new Date().toLocaleString('pt-MZ')}</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Criar Acesso ao Sistema</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">Funcionário: <b>{funcionario.nome}</b></p>

        {resultado ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-2">Acesso criado com sucesso!</p>
              <div className="space-y-1 text-xs text-on-surface-variant">
                {(resultado.codigos || [{ portal: resultado.role, codigo: resultado.codigo }]).map(c => (
                  <p key={c.portal}>{ROLES_SISTEMA.find(r => r.value === c.portal)?.label || c.portal}: <b className="text-on-surface font-mono">{c.codigo}</b></p>
                ))}
                <p>Senha inicial (a mesma para todos os códigos): <b className="text-on-surface font-mono">{resultado.senha_padrao}</b></p>
              </div>
              <p className="text-[10px] text-orange-600 mt-2">O funcionário deverá alterar a senha no primeiro login.</p>
            </div>
            <button onClick={imprimirCredenciais}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl border border-primary/30 text-primary font-semibold hover:bg-primary/5">
              <span className="material-symbols-outlined text-[18px]">print</span>Imprimir Credenciais
            </button>
            <button onClick={() => { onSaved(); onClose() }}
              className="w-full px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold">
              Fechar
            </button>
          </div>
        ) : (
          <>
            {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Portais (um ou mais)</label>
                <div className="space-y-1.5">
                  {ROLES_SISTEMA.map(r => {
                    const marcado = selecionados.includes(r.value)
                    return (
                      <div key={r.value} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${marcado ? 'border-primary bg-primary/5' : 'border-outline-variant'}`}>
                        <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
                          <input type="checkbox" checked={marcado} onChange={() => alternar(r.value)} />{r.label}
                        </label>
                        {marcado && (
                          <button type="button" onClick={() => setRole(r.value)}
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${role === r.value ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            {role === r.value ? 'Principal' : 'Tornar principal'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5">Um só código de entrada para todos. O Diretor pode acrescentar ou retirar portais depois.</p>
              </div>
              <p className="text-xs text-on-surface-variant">
                A senha inicial será a data de nascimento do funcionário (DDMMAAAA) ou <span className="font-mono">sige2024</span> se não estiver definida.
              </p>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
                  {saving ? 'A criar...' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function ModalFalta({ funcionarioId, funcionarioNome, onClose, onSaved }) {
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), tipo: 'injustificada', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErro('')
    try {
      await api.post('/rh/faltas', { funcionario_id: funcionarioId, ...form })
      onSaved()
      onClose()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Registar Falta</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">Funcionário: <b>{funcionarioNome}</b></p>
        {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{erro}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Data</label>
            <input type="date" required value={form.data} onChange={e => set('data', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white">
              {Object.entries(TIPO_FALTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2}
              placeholder="Opcional"
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60">
              {saving ? 'A registar...' : 'Registar Falta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FuncionarioDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const voltar = useVoltar('/rh/funcionarios')
  const toast = useToast()
  const confirmar = useConfirm()
  const [func, setFunc] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inactivando, setInactivando] = useState(false)
  const [modalFalta, setModalFalta] = useState(false)
  const [modalAcesso, setModalAcesso] = useState(false)
  const [gerendoAcesso, setGerendoAcesso] = useState(false)
  const [contratos, setContratos] = useState([])
  const [modalContrato, setModalContrato] = useState(null) // null | { base: null | contrato }
  const [modalRescindir, setModalRescindir] = useState(null) // null | contrato

  const carregarResumo = () => {
    api.get(`/rh/funcionarios/${id}/resumo`).then(r => setResumo(r.data)).catch(() => {})
  }

  const carregarContratos = () => {
    api.get(`/rh/contratos?funcionario_id=${id}`).then(r => setContratos(r.data)).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      api.get(`/rh/funcionarios/${id}`),
    ]).then(([rf]) => {
      setFunc(rf.data)
    }).catch(() => navigate('/rh/funcionarios'))
      .finally(() => setLoading(false))

    carregarResumo()
    carregarContratos()
  }, [id])

  const recarregarFuncionario = () =>
    api.get(`/rh/funcionarios/${id}`).then(r => setFunc(r.data)).catch(() => {})

  const recarregarContratos = () => { carregarContratos(); carregarResumo() }

  const toggleAcesso = async (acao) => {
    const ok = await confirmar({
      title: acao === 'revogar' ? 'Revogar acesso ao sistema?' : 'Reactivar acesso ao sistema?',
      body: acao === 'revogar'
        ? 'O funcionário deixa de conseguir iniciar sessão no sistema até o acesso ser reactivado.'
        : 'O funcionário volta a conseguir iniciar sessão no sistema com o código e senha existentes.',
      danger: acao === 'revogar',
      confirmLabel: acao === 'revogar' ? 'Revogar' : 'Reactivar',
    })
    if (!ok) return
    setGerendoAcesso(true)
    try {
      if (acao === 'revogar') await api.delete(`/rh/funcionarios/${id}/acesso`)
      else await api.patch(`/rh/funcionarios/${id}/acesso/reativar`)
      toast.success(acao === 'revogar' ? 'Acesso ao sistema revogado com sucesso.' : 'Acesso ao sistema reactivado com sucesso.')
      await recarregarFuncionario()
    } catch (err) { toast.error(err.message) } finally { setGerendoAcesso(false) }
  }

  const toggleEstado = async () => {
    const activo = func.estado === 'activo'
    const ok = await confirmar({
      title: activo ? 'Inactivar funcionário?' : 'Activar funcionário?',
      body: activo
        ? 'O funcionário passa a estado inactivo. Pode ser activado novamente mais tarde, se necessário.'
        : 'O funcionário volta a estado activo.',
      danger: activo,
      confirmLabel: activo ? 'Inactivar' : 'Activar',
    })
    if (!ok) return
    setInactivando(true)
    try {
      const r = await api.put(`/rh/funcionarios/${id}`, { estado: activo ? 'inactivo' : 'activo' })
      setFunc(r.data)
      toast.success(activo ? 'Funcionário inactivado com sucesso.' : 'Funcionário activado com sucesso.')
    } catch (err) { toast.error(err.message) } finally { setInactivando(false) }
  }

  const fmt = (v) => parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
  const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-MZ') : '—'

  if (loading) return (
    <div className="flex justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )
  if (!func) return null

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()
  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const faltasMes = resumo?.faltas_mes || []
  const totalFaltasMes = faltasMes.reduce((s, f) => s + Number(f.total), 0)
  const faltasInj = faltasMes.find(f => f.tipo === 'injustificada')?.total || 0

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {modalFalta && (
        <ModalFalta
          funcionarioId={id}
          funcionarioNome={func.nome}
          onClose={() => setModalFalta(false)}
          onSaved={carregarResumo}
        />
      )}
      {modalAcesso && (
        <ModalCriarAcesso
          funcionario={func}
          onClose={() => setModalAcesso(false)}
          onSaved={recarregarFuncionario}
        />
      )}
      {modalContrato && (
        <ModalContrato
          funcionarioId={id}
          base={modalContrato.base}
          onClose={() => setModalContrato(null)}
          onSaved={recarregarContratos}
        />
      )}
      {modalRescindir && (
        <ModalRescindirContrato
          contrato={modalRescindir}
          onClose={() => setModalRescindir(null)}
          onSaved={recarregarContratos}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={voltar} className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-on-surface truncate">{func.nome}</h1>
          <p className="text-sm text-on-surface-variant">{func.cargo_nome || '—'} · {func.departamento_nome || 'Sem departamento'}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Link to={`/rh/funcionarios/${id}/editar`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant bg-white text-sm font-medium hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </Link>
          <Link to={`/rh/funcionarios/${id}/documentos`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
            <span className="material-symbols-outlined text-[16px]">folder</span>
            Documentos
          </Link>
          <button onClick={() => setModalFalta(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors">
            <span className="material-symbols-outlined text-[16px]">event_busy</span>
            Registar Falta
          </button>
          <button onClick={toggleEstado} disabled={inactivando}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              func.estado === 'activo'
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{func.estado === 'activo' ? 'person_off' : 'person_check'}</span>
            {func.estado === 'activo' ? 'Inactivar' : 'Activar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda — foto + resumo */}
        <div className="space-y-4">
          {/* Foto + estado */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm text-center">
            <div className="w-28 h-32 rounded-xl mx-auto mb-4 overflow-hidden bg-surface-bright border border-outline-variant flex items-center justify-center">
              {func.foto
                ? <img src={func.foto} alt={func.nome} className="w-full h-full object-cover" />
                : <span className="material-symbols-outlined text-on-surface-variant text-5xl">person</span>
              }
            </div>
            <h2 className="font-bold text-on-surface">{func.nome}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{func.cargo_nome || '—'}</p>
            <span className={`mt-3 inline-flex px-3 py-1 rounded-full text-xs font-semibold ${func.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {func.estado}
            </span>
          </div>

          {/* Resumo do mês */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
              {MESES[mes]} {ano}
            </h3>

            {/* Faltas do mês */}
            <div className={`rounded-xl p-3 mb-3 ${faltasInj > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Faltas do mês</span>
                <span className={`text-lg font-bold ${faltasInj > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalFaltasMes}
                </span>
              </div>
              {faltasMes.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {faltasMes.map(f => (
                    <p key={f.tipo} className="text-[10px] text-on-surface-variant">
                      {TIPO_FALTA[f.tipo] || f.tipo}: {f.total}
                    </p>
                  ))}
                </div>
              )}
              {faltasInj > 0 && (
                <p className="text-[10px] text-red-600 mt-1">{faltasInj} injustificada(s) deduzida(s) na folha</p>
              )}
            </div>

            {/* Contrato activo */}
            {resumo?.contrato_activo ? (
              <div className="bg-blue-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-on-surface-variant">Contrato activo</p>
                <p className="text-sm font-semibold text-blue-700 capitalize">
                  {resumo.contrato_activo.tipo?.replace(/_/g, ' ')}
                </p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  Salário: {fmt(resumo.contrato_activo.salario)} MT
                </p>
                {resumo.contrato_activo.data_fim && (
                  <p className="text-[10px] text-orange-600 mt-0.5">
                    Termina em: {fmtData(resumo.contrato_activo.data_fim)}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-on-surface-variant">Sem contrato activo</p>
              </div>
            )}

            {/* Último salário */}
            {resumo?.ultimo_salario ? (
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-on-surface-variant">Último salário processado</p>
                <p className="text-sm font-semibold text-purple-700">
                  {fmt(resumo.ultimo_salario.valor_liquido)} MT
                </p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {MESES[resumo.ultimo_salario.mes]} {resumo.ultimo_salario.ano} · bruto: {fmt(resumo.ultimo_salario.valor_bruto)} MT
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-on-surface-variant">Sem salário processado</p>
              </div>
            )}
          </div>

          {/* Atalhos */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Ver mais</h3>
            <div className="space-y-2">
              {[
                { to: `/rh/funcionarios/${id}/documentos`, icon: 'folder', label: 'Documentos' },
                { to: `/rh/ferias?funcionario_id=${id}`, icon: 'beach_access', label: 'Férias & Licenças' },
                { to: `/rh/faltas?funcionario_id=${id}`, icon: 'event_busy', label: 'Histórico de Faltas' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <span className="material-symbols-outlined text-[16px]">{a.icon}</span>{a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita — dados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
              Dados Pessoais
            </h3>
            <Row label="Data de Nascimento" value={fmtData(func.data_nascimento)} />
            <Row label="Género" value={func.genero === 'M' ? 'Masculino' : func.genero === 'F' ? 'Feminino' : func.genero} />
            <Row label="BI / Passaporte" value={func.bi} />
            <Row label="NUIT" value={func.nuit} />
            <Row label="Nº Seg. Social" value={func.numero_seguranca_social} />
            <Row label="Telefone" value={func.telefone} />
            <Row label="Email" value={func.email} />
            <Row label="Endereço" value={func.endereco} />
          </div>

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">work</span>
              Dados Profissionais
            </h3>
            <Row label="Cargo" value={func.cargo_nome} />
            <Row label="Departamento" value={func.departamento_nome} />
            <Row label="Nº Funcionário" value={func.numero_funcionario} />
          </div>

          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">account_balance</span>
              Dados Bancários
            </h3>
            <Row label="Banco" value={func.banco} />
            <Row label="Conta Bancária / NIB" value={func.conta_bancaria} />
          </div>

          {/* Contratos */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                Contratos
              </h3>
              {!contratos.some(c => c.estado === 'activo') && (
                <button onClick={() => setModalContrato({ base: null })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>Criar Contrato
                </button>
              )}
            </div>

            {contratos.length === 0 ? (
              <div className="rounded-xl p-4 bg-surface-bright border border-outline-variant text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-1 block">description</span>
                <p className="text-sm text-on-surface-variant">Este funcionário ainda não tem nenhum contrato.</p>
                <p className="text-xs text-on-surface-variant mt-1">Sem contrato, não entra na folha salarial.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contratos.map(ct => (
                  <div key={ct.id} className="border border-outline-variant rounded-xl p-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-on-surface capitalize">{ct.tipo?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {fmtData(ct.data_inicio)} — {ct.data_fim ? fmtData(ct.data_fim) : 'Indeterminado'}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{fmt(ct.salario)} MT</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ESTADO_CONTRATO_CLS[ct.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {ct.estado}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Link to={`/rh/contratos/${ct.id}/documento`}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                        <span className="material-symbols-outlined text-[14px]">print</span>Ver / Imprimir
                      </Link>
                      {ct.estado === 'activo' && (
                        <>
                          <button onClick={() => setModalContrato({ base: ct })}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                            <span className="material-symbols-outlined text-[14px]">autorenew</span>Renovar
                          </button>
                          <button onClick={() => setModalRescindir(ct)}
                            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline">
                            <span className="material-symbols-outlined text-[14px]">cancel</span>Rescindir
                          </button>
                        </>
                      )}
                      {ct.estado === 'expirado' && (
                        <button onClick={() => setModalContrato({ base: ct })}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                          <span className="material-symbols-outlined text-[14px]">autorenew</span>Renovar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acesso ao Sistema */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">manage_accounts</span>
              Acesso ao Sistema
            </h3>

            {func.utilizador_id ? (
              <div className="space-y-3">
                <div className={`rounded-xl p-4 border ${func.utilizador_activo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${func.utilizador_activo ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-semibold ${func.utilizador_activo ? 'text-green-700' : 'text-red-700'}`}>
                      {func.utilizador_activo ? 'Acesso activo' : 'Acesso revogado'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-on-surface-variant">
                    <p>{ROLES_SISTEMA.find(r => r.value === func.utilizador_role)?.label || func.utilizador_role} <span className="text-[10px] uppercase">(principal)</span>:{' '}
                      <span className="font-mono font-semibold text-on-surface">{func.utilizador_codigo}</span>
                    </p>
                    {(func.utilizador_portais_extra || []).map(p => (
                      <p key={p.portal} className={p.expirado ? 'line-through opacity-60' : ''}>
                        {ROLES_SISTEMA.find(r => r.value === p.portal)?.label || p.portal}:{' '}
                        <span className="font-mono font-semibold text-on-surface">{p.codigo || '—'}</span>
                        {p.valido_ate && ` (${p.expirado ? 'expirou' : 'até'} ${new Date(`${p.valido_ate}T00:00:00`).toLocaleDateString('pt-MZ')})`}
                      </p>
                    ))}
                    <p className="text-[10px] text-on-surface-variant/80 pt-0.5">Um código por portal, todos com a mesma senha. Portais adicionais são geridos pelo Diretor em Utilizadores.</p>
                    {func.utilizador_email && <p>Email: <span className="text-on-surface">{func.utilizador_email}</span></p>}
                  </div>
                </div>

                {func.utilizador_activo ? (
                  <button onClick={() => toggleAcesso('revogar')} disabled={gerendoAcesso}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">no_accounts</span>
                    {gerendoAcesso ? 'A processar...' : 'Revogar Acesso'}
                  </button>
                ) : (
                  <button onClick={() => toggleAcesso('reativar')} disabled={gerendoAcesso}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-60">
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    {gerendoAcesso ? 'A processar...' : 'Reactivar Acesso'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-4 bg-surface-bright border border-outline-variant text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-1 block">person_off</span>
                  <p className="text-sm text-on-surface-variant">Este funcionário não tem acesso ao sistema.</p>
                  <p className="text-xs text-on-surface-variant mt-1">Apenas está registado para controlo de RH.</p>
                </div>
                <button onClick={() => setModalAcesso(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Criar Acesso ao Sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
