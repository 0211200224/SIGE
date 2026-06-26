import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../../services/api'

const Row = ({ label, value }) => (
  <div className="py-2.5 border-b border-outline-variant/50 last:border-0 flex justify-between gap-4">
    <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">{label}</span>
    <span className="text-sm text-on-surface text-right">{value || '—'}</span>
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

function ModalCriarAcesso({ funcionario, onClose, onSaved }) {
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) return setErro('Seleccione um portal de acesso')
    setSaving(true)
    setErro('')
    try {
      const r = await api.post(`/rh/funcionarios/${funcionario.id}/acesso`, { role })
      setResultado(r.data)
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
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
                <p>Código de acesso: <b className="text-on-surface font-mono">{resultado.codigo}</b></p>
                <p>Portal: <b className="text-on-surface capitalize">{ROLES_SISTEMA.find(r => r.value === resultado.role)?.label}</b></p>
                <p>Senha inicial: <b className="text-on-surface font-mono">{resultado.senha_padrao}</b></p>
              </div>
              <p className="text-[10px] text-orange-600 mt-2">O funcionário deverá alterar a senha no primeiro login.</p>
            </div>
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
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wide">Portal de acesso</label>
                <select value={role} onChange={e => setRole(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none bg-white">
                  <option value="">Seleccionar portal...</option>
                  {ROLES_SISTEMA.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
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
  const [func, setFunc] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inactivando, setInactivando] = useState(false)
  const [modalFalta, setModalFalta] = useState(false)
  const [modalAcesso, setModalAcesso] = useState(false)
  const [gerendoAcesso, setGerendoAcesso] = useState(false)

  const carregarResumo = () => {
    api.get(`/rh/funcionarios/${id}/resumo`).then(r => setResumo(r.data)).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      api.get(`/rh/funcionarios/${id}`),
    ]).then(([rf]) => {
      setFunc(rf.data)
    }).catch(() => navigate('/rh/funcionarios'))
      .finally(() => setLoading(false))

    carregarResumo()
  }, [id])

  const recarregarFuncionario = () =>
    api.get(`/rh/funcionarios/${id}`).then(r => setFunc(r.data)).catch(() => {})

  const toggleAcesso = async (acao) => {
    if (!window.confirm(
      acao === 'revogar'
        ? 'Revogar o acesso ao sistema deste funcionário?'
        : 'Reactivar o acesso ao sistema deste funcionário?'
    )) return
    setGerendoAcesso(true)
    try {
      if (acao === 'revogar') await api.delete(`/rh/funcionarios/${id}/acesso`)
      else await api.patch(`/rh/funcionarios/${id}/acesso/reativar`)
      await recarregarFuncionario()
    } catch (err) { alert(err.message) } finally { setGerendoAcesso(false) }
  }

  const toggleEstado = async () => {
    if (!window.confirm(`Confirmar ${func.estado === 'activo' ? 'inactivação' : 'activação'} do funcionário?`)) return
    setInactivando(true)
    try {
      const r = await api.put(`/rh/funcionarios/${id}`, { estado: func.estado === 'activo' ? 'inactivo' : 'activo' })
      setFunc(r.data)
    } catch (err) { alert(err.message) } finally { setInactivando(false) }
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
    <div className="p-6 max-w-5xl mx-auto">
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

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/rh/funcionarios')} className="text-on-surface-variant hover:text-primary transition-colors">
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
                { to: `/rh/contratos?funcionario_id=${id}`, icon: 'description', label: 'Contratos' },
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
            <Row label="Tipo de Contrato" value={func.tipo_contrato?.replace(/_/g, ' ')} />
            <Row label="Data de Admissão" value={fmtData(func.data_admissao)} />
            <Row label="Salário Base" value={func.salario_base ? `${fmt(func.salario_base)} MT` : null} />
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
                    <p>Código: <span className="font-mono font-semibold text-on-surface">{func.utilizador_codigo}</span></p>
                    <p>Portal: <span className="font-semibold text-on-surface capitalize">
                      {ROLES_SISTEMA.find(r => r.value === func.utilizador_role)?.label || func.utilizador_role}
                    </span></p>
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
