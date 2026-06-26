import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PASSOS = [
  { key: 'rascunho',   label: 'Rascunho',   desc: 'Reveja e ajuste',     icon: 'edit_note' },
  { key: 'processado', label: 'Processado',  desc: 'Totais confirmados',  icon: 'pending_actions' },
  { key: 'pago',       label: 'Pago',        desc: 'Folha encerrada',     icon: 'check_circle' },
]

function fmt(v) {
  return parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
}

// ── Modal: ajustar bónus / subsídios por funcionário ────────────────────────
function ModalAjustar({ linha, onClose, onSaved }) {
  const [form, setForm] = useState({
    bonus:                parseFloat(linha.bonus) || 0,
    subsidio_alimentacao: parseFloat(linha.subsidio_alimentacao) || 0,
    subsidio_transporte:  parseFloat(linha.subsidio_transporte) || 0,
    subsidio_habitacao:   parseFloat(linha.subsidio_habitacao) || 0,
    outras_deducoes:      parseFloat(linha.outras_deducoes) || 0,
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }))

  const brutoBase   = parseFloat(linha.valor_bruto) || 0
  const totalAcres  = form.bonus + form.subsidio_alimentacao + form.subsidio_transporte + form.subsidio_habitacao
  const brutoTotal  = brutoBase + totalAcres
  const inss        = brutoTotal * 0.03
  const irps        = parseFloat(linha.irps) || 0
  const liquido     = brutoTotal - inss - irps - form.outras_deducoes

  const handleSave = async () => {
    setSaving(true); setErro('')
    try {
      await api.patch(`/rh/salarios/${linha.id}`, form)
      onSaved(); onClose()
    } catch (err) { setErro(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            <h3 className="font-semibold text-on-surface">Ajustar Vencimento</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{linha.funcionario_nome}</p>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>

        <div className="p-5 space-y-3">
          {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

          {/* Salário base */}
          <div className="bg-surface-bright rounded-xl p-3 flex justify-between items-center text-sm">
            <span className="text-on-surface-variant">Salário base (após faltas)</span>
            <span className="font-bold text-on-surface font-mono">{fmt(brutoBase)} MT</span>
          </div>

          <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide pt-1">
            Acréscimos (+)
          </div>

          {[
            { k: 'bonus',                l: 'Bónus',              icon: 'stars',          color: 'text-amber-600' },
            { k: 'subsidio_alimentacao', l: 'Subsídio Alimentação', icon: 'restaurant',   color: 'text-green-600' },
            { k: 'subsidio_transporte',  l: 'Subsídio Transporte', icon: 'directions_bus', color: 'text-blue-600' },
            { k: 'subsidio_habitacao',   l: 'Subsídio Habitação',  icon: 'home',           color: 'text-purple-600' },
          ].map(({ k, l, icon, color }) => (
            <div key={k} className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-[18px] flex-shrink-0 ${color}`}>{icon}</span>
              <label className="text-sm text-on-surface flex-1">{l}</label>
              <div className="flex items-center gap-1">
                <input type="number" min="0" step="0.01" value={form[k]}
                  onChange={e => set(k, e.target.value)}
                  className="w-28 px-2.5 py-2 rounded-lg border border-outline-variant text-sm text-right focus:border-primary outline-none font-mono" />
                <span className="text-xs text-on-surface-variant w-5">MT</span>
              </div>
            </div>
          ))}

          <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide pt-1">
            Deduções Extras (-)
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] flex-shrink-0 text-red-500">remove_circle</span>
            <label className="text-sm text-on-surface flex-1">Outras Deduções</label>
            <div className="flex items-center gap-1">
              <input type="number" min="0" step="0.01" value={form.outras_deducoes}
                onChange={e => set('outras_deducoes', e.target.value)}
                className="w-28 px-2.5 py-2 rounded-lg border border-outline-variant text-sm text-right focus:border-primary outline-none font-mono" />
              <span className="text-xs text-on-surface-variant w-5">MT</span>
            </div>
          </div>

          {/* Prévia do resultado */}
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mt-2">
            <div className="flex justify-between text-xs text-on-surface-variant mb-2">
              <span>Bruto total</span><span className="font-mono">{fmt(brutoTotal)} MT</span>
            </div>
            <div className="flex justify-between text-xs text-red-500 mb-1">
              <span>INSS (3%)</span><span className="font-mono">- {fmt(inss)} MT</span>
            </div>
            {irps > 0 && (
              <div className="flex justify-between text-xs text-red-500 mb-1">
                <span>IRPS</span><span className="font-mono">- {fmt(irps)} MT</span>
              </div>
            )}
            {form.outras_deducoes > 0 && (
              <div className="flex justify-between text-xs text-red-500 mb-1">
                <span>Outras deduções</span><span className="font-mono">- {fmt(form.outras_deducoes)} MT</span>
              </div>
            )}
            <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between">
              <span className="text-sm font-semibold text-primary">Salário Líquido</span>
              <span className="text-lg font-bold text-primary font-mono">{fmt(liquido)} MT</span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm rounded-xl bg-primary text-on-primary font-semibold disabled:opacity-60 flex items-center gap-2">
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: recibo individual ────────────────────────────────────────────────
function ModalRecibo({ linha, folha, onClose }) {
  const mesNome = MESES[folha.mes - 1]
  const brutoTotal = parseFloat(linha.valor_bruto || 0)
    + parseFloat(linha.bonus || 0)
    + parseFloat(linha.subsidio_alimentacao || 0)
    + parseFloat(linha.subsidio_transporte || 0)
    + parseFloat(linha.subsidio_habitacao || 0)

  const imprimir = () => {
    const conteudo = document.getElementById('recibo-individual').innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Recibo — ${linha.funcionario_nome}</title>
      <style>
        *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;margin:24px;color:#111;max-width:420px}
        h2{font-size:14px;margin:0}h3{font-size:12px;margin:0 0 4px}
        .header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
        .row{display:flex;justify-content:space-between;padding:3px 0}
        .section{margin-bottom:10px}
        .section-title{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#666;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:6px}
        .total{border-top:2px solid #111;margin-top:8px;padding-top:6px;font-weight:bold;font-size:13px}
        .green{color:#16a34a}.red{color:#dc2626}.mono{font-family:monospace}
      </style></head>
      <body>${conteudo}</body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="font-semibold text-on-surface">Recibo de Vencimento</h3>
          <div className="flex items-center gap-2">
            <button onClick={imprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-[14px]">print</span>Imprimir
            </button>
            <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
          </div>
        </div>

        <div id="recibo-individual" className="p-5 text-sm">
          {/* Header do recibo */}
          <div className="header border-b border-gray-200 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-on-surface text-base">{linha.funcionario_nome}</h2>
                {linha.cargo_nome && <p className="text-xs text-on-surface-variant mt-0.5">{linha.cargo_nome}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant">Período</p>
                <p className="font-semibold">{mesNome} {folha.ano}</p>
              </div>
            </div>
          </div>

          {/* Remunerações */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-2 section-title">Remunerações</p>
            <div className="space-y-1.5">
              <div className="row flex justify-between text-sm">
                <span className="text-on-surface-variant">Salário Base</span>
                <span className="font-mono font-semibold">{fmt(linha.valor_bruto)} MT</span>
              </div>
              {parseFloat(linha.bonus) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Bónus</span>
                  <span className="font-mono text-green-700">+ {fmt(linha.bonus)} MT</span>
                </div>
              )}
              {parseFloat(linha.subsidio_alimentacao) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Subsídio Alimentação</span>
                  <span className="font-mono text-green-700">+ {fmt(linha.subsidio_alimentacao)} MT</span>
                </div>
              )}
              {parseFloat(linha.subsidio_transporte) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Subsídio Transporte</span>
                  <span className="font-mono text-green-700">+ {fmt(linha.subsidio_transporte)} MT</span>
                </div>
              )}
              {parseFloat(linha.subsidio_habitacao) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Subsídio Habitação</span>
                  <span className="font-mono text-green-700">+ {fmt(linha.subsidio_habitacao)} MT</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1 border-t border-dashed border-outline-variant">
                <span className="font-semibold">Total Bruto</span>
                <span className="font-mono font-semibold">{fmt(brutoTotal)} MT</span>
              </div>
            </div>
          </div>

          {/* Deduções */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-2 section-title">Deduções</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">INSS Trabalhador (3%)</span>
                <span className="font-mono text-red-600">- {fmt(linha.inss_trabalhador)} MT</span>
              </div>
              {parseFloat(linha.irps) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">IRPS</span>
                  <span className="font-mono text-red-600">- {fmt(linha.irps)} MT</span>
                </div>
              )}
              {parseFloat(linha.outras_deducoes) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Outras Deduções</span>
                  <span className="font-mono text-red-600">- {fmt(linha.outras_deducoes)} MT</span>
                </div>
              )}
            </div>
          </div>

          {/* Líquido */}
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/15 total">
            <div className="flex justify-between items-center">
              <span className="font-bold text-on-surface">SALÁRIO LÍQUIDO</span>
              <span className="text-xl font-bold text-primary font-mono">{fmt(linha.valor_liquido)} MT</span>
            </div>
          </div>

          {linha.observacoes && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-amber-500 text-[14px] mt-0.5">warning</span>
              <p className="text-xs text-amber-800">{linha.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function FolhaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [folha, setFolha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [ajustarLinha, setAjustarLinha] = useState(null)
  const [reciboLinha, setReciboLinha] = useState(null)
  const [confirmacao, setConfirmacao] = useState(null)

  const carregar = async () => {
    try {
      const r = await api.get(`/rh/folhas/${id}`)
      setFolha(r.data)
    } catch { navigate('/rh/folha-pagamento') }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [id])

  const handleProcessar = async () => {
    setProcessando(true)
    try {
      const r = await api.post(`/rh/folhas/${id}/processar`, {})
      setFolha(r.data)
    } catch (err) { alert(err.message) } finally { setProcessando(false); setConfirmacao(null) }
  }

  const handlePagar = async () => {
    try {
      const r = await api.patch(`/rh/folhas/${id}/pagar`, {})
      setFolha(r.data)
    } catch (err) { alert(err.message) } finally { setConfirmacao(null) }
  }

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      await api.delete(`/rh/folhas/${id}`)
      navigate('/rh/folha-pagamento')
    } catch (err) { alert(err.message); setEliminando(false); setConfirmacao(null) }
  }

  const imprimirTudo = () => {
    const conteudo = document.getElementById('folha-print').innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Folha ${MESES[folha.mes - 1]} ${folha.ano}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:16px;color:#111}
        h1{font-size:14px;margin-bottom:2px}p{margin:2px 0;color:#555}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th{background:#f0f0f0;padding:4px 6px;text-align:left;font-size:9px;text-transform:uppercase}
        td{padding:4px 6px;border-bottom:1px solid #eee}
        tfoot td{font-weight:bold;background:#f9f9f9}
        .right{text-align:right}.red{color:#dc2626}.green{color:#16a34a}
        @media print{body{margin:0}}
      </style></head>
      <body>${conteudo}</body></html>
    `)
    win.document.close()
    win.print()
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
    </div>
  )
  if (!folha) return null

  const isRascunho   = folha.estado === 'rascunho'
  const isProcessado = folha.estado === 'processado'
  const isPago       = folha.estado === 'pago'
  const passoActual  = PASSOS.findIndex(p => p.key === folha.estado)
  const totalInssEntidade = parseFloat(folha.total_inss || 0) * (4 / 3)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {ajustarLinha && (
        <ModalAjustar linha={ajustarLinha} onClose={() => setAjustarLinha(null)} onSaved={carregar} />
      )}
      {reciboLinha && (
        <ModalRecibo linha={reciboLinha} folha={folha} onClose={() => setReciboLinha(null)} />
      )}

      {/* Diálogos de confirmação */}
      {confirmacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmacao === 'eliminar' ? 'bg-red-100' : confirmacao === 'processar' ? 'bg-blue-100' : 'bg-green-100'}`}>
                <span className={`material-symbols-outlined ${confirmacao === 'eliminar' ? 'text-red-600' : confirmacao === 'processar' ? 'text-blue-600' : 'text-green-600'}`}>
                  {confirmacao === 'eliminar' ? 'delete' : confirmacao === 'processar' ? 'pending_actions' : 'payments'}
                </span>
              </div>
              <h3 className="font-semibold text-on-surface">
                {confirmacao === 'eliminar' ? 'Eliminar rascunho?' : confirmacao === 'processar' ? 'Finalizar e processar?' : 'Marcar como pago?'}
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-5">
              {confirmacao === 'eliminar'
                ? 'O rascunho será apagado. Pode gerar uma nova folha para o mesmo período.'
                : confirmacao === 'processar'
                ? 'Os totais serão calculados com todos os ajustes. Após processar não poderá editar os valores individuais.'
                : 'A folha ficará encerrada e não poderá ser alterada. Esta acção é irreversível.'
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmacao(null)}
                className="px-4 py-2 text-sm rounded-xl border border-outline-variant hover:bg-surface-bright">Cancelar</button>
              <button
                onClick={confirmacao === 'eliminar' ? handleEliminar : confirmacao === 'processar' ? handleProcessar : handlePagar}
                disabled={processando || eliminando}
                className={`px-4 py-2 text-sm rounded-xl font-semibold text-white flex items-center gap-2 disabled:opacity-60 ${
                  confirmacao === 'eliminar' ? 'bg-red-600 hover:bg-red-700' : confirmacao === 'processar' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}>
                {(processando || eliminando) && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate('/rh/folha-pagamento')} className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-on-surface">
            Folha de Pagamento — {MESES[folha.mes - 1]} {folha.ano}
          </h1>
          <p className="text-sm text-on-surface-variant">{folha.total_funcionarios} funcionário(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isRascunho && (
            <button onClick={() => setConfirmacao('eliminar')} disabled={eliminando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm hover:bg-red-100 transition-colors">
              <span className="material-symbols-outlined text-[16px]">delete</span>Eliminar
            </button>
          )}
          <button onClick={imprimirTudo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-sm hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-[16px]">print</span>Imprimir
          </button>
          {isRascunho && (
            <button onClick={() => setConfirmacao('processar')} disabled={processando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              Finalizar e Processar
            </button>
          )}
          {isProcessado && (
            <button onClick={() => setConfirmacao('pagar')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              Marcar como Pago
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 mb-5 shadow-sm">
        <div className="flex items-center">
          {PASSOS.map((p, i) => (
            <div key={p.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  i < passoActual  ? 'bg-green-500 text-white' :
                  i === passoActual ? 'bg-primary text-on-primary' :
                  'bg-outline-variant/40 text-on-surface-variant'
                }`}>
                  {i < passoActual
                    ? <span className="material-symbols-outlined text-[16px]">check</span>
                    : <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${i === passoActual ? 'text-primary' : 'text-on-surface-variant'}`}>{p.label}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{p.desc}</p>
                </div>
              </div>
              {i < PASSOS.length - 1 && (
                <div className={`h-0.5 w-6 mx-2 flex-shrink-0 ${i < passoActual ? 'bg-green-500' : 'bg-outline-variant'}`} />
              )}
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
          isRascunho   ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
          isProcessado ? 'bg-blue-50 border border-blue-200 text-blue-800' :
          'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">
            {isRascunho ? 'info' : isProcessado ? 'info' : 'check_circle'}
          </span>
          <span>
            {isRascunho && <>Reveja os valores abaixo. Clique em <b>Ajustar</b> para alterar bónus e subsídios de um funcionário. Quando estiver pronto, clique em <b>Finalizar e Processar</b>.</>}
            {isProcessado && <>Folha processada e pronta. Clique em <b>Marcar como Pago</b> após efectuar os pagamentos.</>}
            {isPago && <>Folha <b>encerrada</b>. Pode imprimir a folha geral ou os recibos individuais mas não é possível alterar valores.</>}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Funcionários',   value: folha.total_funcionarios,                               icon: 'badge',           c: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Total Bruto',    value: `${fmt(folha.total_bruto)} MT`,                          icon: 'payments',        c: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'INSS + IRPS',    value: `${fmt(parseFloat(folha.total_inss||0)+parseFloat(folha.total_irps||0))} MT`, icon: 'account_balance', c: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Total Líquido',  value: `${fmt(folha.total_liquido)} MT`,                       icon: 'savings',         c: 'text-green-600',  bg: 'bg-green-50'  },
        ].map(s => (
          <div key={s.label} className={`rounded-xl ${s.bg} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-[18px] ${s.c}`}>{s.icon}</span>
              <p className="text-xs text-on-surface-variant">{s.label}</p>
            </div>
            <p className={`font-bold text-lg ${s.c} font-mono`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Custo total empregador */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[20px]">corporate_fare</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Custo Total para o Empregador</p>
            <p className="text-xs text-amber-700">Inclui INSS entidade (~4%) sobre o bruto</p>
          </div>
        </div>
        <p className="text-lg font-bold text-amber-800 font-mono flex-shrink-0">
          {fmt(parseFloat(folha.total_bruto || 0) + totalInssEntidade)} MT
        </p>
      </div>

      {/* Tabela */}
      <div id="folha-print" className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h1 className="font-semibold text-on-surface">
            Folha de Pagamento — {MESES[folha.mes - 1]} {folha.ano}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {folha.total_funcionarios} funcionário(s) · Estado: {folha.estado}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-bright">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Funcionário</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Bruto Base</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span className="text-green-600">+ Adicionais</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span className="text-red-500">- Deduções</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide font-bold">Líquido</th>
                <th className="px-4 py-3 w-28 text-xs font-semibold text-on-surface-variant uppercase tracking-wide text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {(folha.linhas || []).map(l => {
                const adicionais = parseFloat(l.bonus||0) + parseFloat(l.subsidio_alimentacao||0)
                  + parseFloat(l.subsidio_transporte||0) + parseFloat(l.subsidio_habitacao||0)
                const deducoes = parseFloat(l.inss_trabalhador||0) + parseFloat(l.irps||0) + parseFloat(l.outras_deducoes||0)
                return (
                  <tr key={l.id} className="hover:bg-surface-bright/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">{l.funcionario_nome}</p>
                      {l.cargo_nome && <p className="text-xs text-on-surface-variant">{l.cargo_nome}</p>}
                      {l.observacoes && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          {l.observacoes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface">{fmt(l.valor_bruto)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {adicionais > 0
                        ? <span className="text-green-700">+ {fmt(adicionais)}</span>
                        : <span className="text-outline-variant">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">- {fmt(deducoes)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-on-surface">{fmt(l.valor_liquido)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isRascunho && (
                          <button onClick={() => setAjustarLinha(l)} title="Ajustar bónus e subsídios"
                            className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                            <span className="material-symbols-outlined text-[15px]">tune</span>
                          </button>
                        )}
                        <button onClick={() => setReciboLinha(l)} title="Ver recibo individual"
                          className="p-1.5 rounded-lg bg-surface-bright border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors">
                          <span className="material-symbols-outlined text-[15px]">receipt</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-bright font-semibold border-t-2 border-outline-variant">
                <td className="px-4 py-3 text-on-surface">TOTAL</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(folha.total_bruto)}</td>
                <td></td>
                <td className="px-4 py-3 text-right font-mono text-red-500">
                  - {fmt(parseFloat(folha.total_inss||0) + parseFloat(folha.total_irps||0))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-green-700 font-bold">{fmt(folha.total_liquido)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
