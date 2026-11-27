import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useVoltar } from '../../../hooks/useNavegacao'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const METODOS = [
  { v: 'banco', l: 'Banco', icon: 'account_balance', cls: 'bg-blue-100 text-blue-700' },
  { v: 'mpesa', l: 'M-Pesa', icon: 'smartphone', cls: 'bg-red-100 text-red-700' },
  { v: 'emola', l: 'E-Mola', icon: 'smartphone', cls: 'bg-amber-100 text-amber-700' },
]
const METODO_INFO = Object.fromEntries(METODOS.map(m => [m.v, m]))

const PASSOS = [
  { key: 'rascunho',   label: 'Rascunho',   desc: 'Reveja e ajuste',     icon: 'edit_note' },
  { key: 'processado', label: 'Processado',  desc: 'Totais confirmados',  icon: 'pending_actions' },
  { key: 'pago',       label: 'Pago',        desc: 'Folha encerrada',     icon: 'check_circle' },
]

function fmt(v) {
  return parseFloat(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })
}
function fmtDataHora(d) {
  return new Date(d).toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const numeroFolha = (folha) => `FP-${folha.ano}${String(folha.mes).padStart(2, '0')}-${String(folha.id).padStart(4, '0')}`

// Os documentos abrem numa janela nova via document.write -- qualquer texto
// vindo da base de dados (nomes, contas) é escapado antes de entrar no HTML.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const f2 = (v) => (parseFloat(v) || 0).toFixed(2)

// Documento de pagamento de um grupo (E-Mola, M-Pesa ou um banco), no mesmo
// formato das folhas que a escola já entrega: E-Mola/M-Pesa com Valor D/H,
// Qtd. D/H, Bruto, INSS% e Líquido (+acréscimos / -descontos); Banco no
// formato de transferência em lote (CONTA, NOME, VALOR, ... TRAN, MOEDA).
function documentoGrupoHtml({ escola, folha, grupo, linhas, cfgRh }) {
  const mesNome = MESES[folha.mes - 1]
  const cor = escola?.cor_principal || '#1a2b4b'
  const rodape = `@page{size:A4 landscape;margin:12mm 10mm 14mm;@bottom-right{content:"Pág. " counter(page) " de " counter(pages);font-size:9px;color:#555}}`
  const base = `*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0}
    table{width:100%;border-collapse:collapse}th{background:#c6f6c6;font-weight:bold;padding:6px;border-bottom:1px solid #333}
    td{padding:5px 6px;border-bottom:1px solid #777;vertical-align:middle}.r{text-align:right}.c{text-align:center}
    .tot td{background:#c6f6c6;font-weight:bold;border-top:1px solid #333}.rodape-sige{text-align:center;font-size:8px;color:#999;margin-top:14px}
    ${rodape}`

  if (grupo.chave.startsWith('banco:')) {
    const banco = grupo.chave.slice(6)
    const descricao = `Salario/${mesNome.toUpperCase()} ${folha.ano}`
    const pagar = linhas.filter(l => parseFloat(l.valor_liquido) > 0)
    const total = pagar.reduce((s, l) => s + (parseFloat(l.valor_liquido) || 0), 0)
    const ordenante = cfgRh?.nome_ordenante || escola?.sigla || escola?.nome || ''
    return `<html><head><title>pagamento_${esc(banco)}_${mesNome}_${folha.ano}</title><style>${base}</style></head><body>
      <p style="font-size:10px;color:#555;margin:0 0 8px">${esc(escola?.nome)} — Pagamento de salários ${esc(mesNome)} ${folha.ano} · ${esc(banco)}</p>
      <table><thead><tr><th>CONTA</th><th>NOME</th><th class="r">VALOR</th><th class="c">NR_DOCUMENTO</th><th>DESC</th><th class="c">TRAN</th><th class="c">MOEDA</th></tr></thead><tbody>
      ${pagar.map(l => `<tr><td>${esc(l.conta_pagamento_utilizada)}</td><td>${esc(l.funcionario_nome)}</td><td class="r">${f2(l.valor_liquido)}</td><td class="c">0</td><td>${descricao}</td><td class="c">C</td><td class="c">0</td></tr>`).join('')}
      ${cfgRh?.conta_debito_salarios ? `<tr style="font-weight:bold"><td>${esc(cfgRh.conta_debito_salarios)}</td><td class="c">${esc(ordenante)}</td><td class="r">${f2(total)}</td><td class="c">0</td><td>${descricao}</td><td class="c">D</td><td class="c">0</td></tr>` : ''}
      </tbody></table>
      <p class="rodape-sige">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP — ${pagar.length} transferência(s) · Total ${f2(total)} MT</p>
    </body></html>`
  }

  const titulo = `FOLHA SALARIAL - ${grupo.titulo.toUpperCase()}`
  const tot = linhas.reduce((t, l) => ({ bruto: t.bruto + (parseFloat(l.valor_bruto) || 0), liquido: t.liquido + (parseFloat(l.valor_liquido) || 0) }), { bruto: 0, liquido: 0 })
  return `<html><head><title>Salarios ${mesNome} ${grupo.titulo} ${folha.ano}</title><style>${base}
      .topo{text-align:center;margin-bottom:10px}.topo img{width:58px;height:58px;object-fit:contain}
      .topo p{margin:3px 0}.meta{font-size:11px;margin:2px 0}.meta b{display:inline-block;width:38px}
      .liq{font-weight:bold}.mais{font-size:9px;color:#15803d}.menos{font-size:9px;color:#b91c1c}</style></head><body>
    <div class="topo">
      ${escola?.logo ? `<img src="${esc(escola.logo)}" />` : ''}
      <p style="font-size:12px;color:${esc(cor)};font-weight:bold">${esc((escola?.nome || '').toUpperCase())}</p>
      <p style="font-size:12px">${esc(titulo)}</p>
    </div>
    <p class="meta"><b>Ano:</b> ${folha.ano}</p>
    <p class="meta" style="margin-bottom:6px"><b>Mês:</b> ${esc(mesNome)}</p>
    <table><thead><tr><th class="c">Ord.</th><th>Nome do funcionário</th><th class="c">Conta</th><th class="r">Valor D/H</th><th class="c">Qtd. D/H</th><th class="r">Valor Bruto</th><th class="c">INSS%</th><th class="r">Valor Líquido</th></tr></thead><tbody>
    ${linhas.map((l, i) => `<tr>
      <td class="c">${i + 1}.</td><td>${esc(l.funcionario_nome)}</td><td class="c">${esc(l.conta_pagamento_utilizada)}</td>
      <td class="r">${f2(l.valor_dia)} MT</td><td class="c">${parseFloat(l.dias_pagos) || 0}</td><td class="r">${f2(l.valor_bruto)} MT</td>
      <td class="c">${parseFloat(l.inss_trabalhador) > 0 ? f2(l.taxa_inss_trabalhador) : '0.00'} %</td>
      <td class="r"><div class="liq">${f2(l.valor_liquido)} MT</div><div class="mais">+${f2(l.acrescimos)}</div><div class="menos">-${f2(l.descontos)}</div></td>
    </tr>`).join('')}
    <tr class="tot"><td colspan="2">TOTAL:</td><td class="c">-</td><td class="r">N/a</td><td class="c">-</td><td class="r">${f2(tot.bruto)} MT</td><td class="c">-</td><td class="r">${f2(tot.liquido)} MT</td></tr>
    </tbody></table>
    <p class="rodape-sige">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP · Folha ${numeroFolha(folha)}</p>
  </body></html>`
}

// Cabeçalho institucional partilhado pelas duas impressões desta página
// (folha completa e recibo individual) -- logotipo, nome e cor da escola,
// título do documento, número e data de emissão. HTML puro porque estas
// impressões abrem numa janela nova (document.write), sem Tailwind.
const CSS_CABECALHO_IMPRESSAO = `
  .cabecalho-sige{margin-bottom:14px}
  .cabecalho-topo{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid;padding-bottom:10px;gap:12px}
  .cabecalho-escola{display:flex;align-items:center;gap:10px}
  .logo-escola{width:44px;height:44px;object-fit:contain;border-radius:8px;flex-shrink:0}
  .cabecalho-escola h1{font-size:15px;margin:0}
  .meta-escola{font-size:9px;color:#666;margin:1px 0}
  .cabecalho-doc{text-align:right;flex-shrink:0}
  .doc-titulo{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;margin:0}
  .doc-numero{font-size:11px;font-family:monospace;margin:2px 0 0;color:#333}
  .doc-periodo{font-size:10px;color:#555;margin:1px 0}
  .doc-emissao{font-size:8px;color:#999;margin:1px 0 0}
`
function cabecalhoImpressaoHtml(escola, { titulo, numero, periodo }) {
  const cor = escola?.cor_principal || '#1a2b4b'
  return `
    <div class="cabecalho-sige">
      <div class="cabecalho-topo" style="border-color:${cor}">
        <div class="cabecalho-escola">
          ${escola?.logo ? `<img src="${escola.logo}" class="logo-escola" />` : ''}
          <div>
            <h1 style="color:${cor}">${escola?.nome || 'Escola'}</h1>
            ${escola?.localizacao ? `<p class="meta-escola">${escola.localizacao}</p>` : ''}
            ${escola?.contacto ? `<p class="meta-escola">${escola.contacto}</p>` : ''}
          </div>
        </div>
        <div class="cabecalho-doc">
          <p class="doc-titulo" style="color:${cor}">${titulo}</p>
          <p class="doc-numero">Nº ${numero}</p>
          <p class="doc-periodo">${periodo}</p>
          <p class="doc-emissao">Emitido em ${fmtDataHora(new Date())}</p>
        </div>
      </div>
    </div>
  `
}

// ── Modal: ajustar bónus / subsídios por funcionário ────────────────────────
function ModalAjustar({ linha, onClose, onSaved }) {
  const ehVariavel = linha.regime_salarial === 'diario' || linha.regime_salarial === 'horario'
  const unidade = linha.regime_salarial === 'diario' ? 'dia' : 'hora'

  const [form, setForm] = useState({
    bonus:                parseFloat(linha.bonus) || 0,
    subsidio_alimentacao: parseFloat(linha.subsidio_alimentacao) || 0,
    subsidio_transporte:  parseFloat(linha.subsidio_transporte) || 0,
    subsidio_habitacao:   parseFloat(linha.subsidio_habitacao) || 0,
    outras_deducoes:      parseFloat(linha.outras_deducoes) || 0,
    quantidade_trabalhada: parseFloat(linha.quantidade_trabalhada) || 0,
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }))

  // Pré-visualização: usa sempre a taxa de INSS realmente gravada nesta linha
  // (a mesma que foi usada na geração da folha), nunca uma percentagem fixa.
  const taxaInss    = parseFloat(linha.taxa_inss_trabalhador) || 0
  const taxaUnitaria = parseFloat(linha.taxa_unitaria) || 0
  // Regime diario/horario: o salario base nao vem congelado da geracao (nasce
  // a 0) -- e' sempre taxa x quantidade indicada aqui, ao vivo.
  const brutoBase   = ehVariavel ? taxaUnitaria * form.quantidade_trabalhada : (parseFloat(linha.valor_bruto) || 0)
  const totalAcres  = form.bonus + form.subsidio_alimentacao + form.subsidio_transporte + form.subsidio_habitacao
  const brutoTotal  = brutoBase + totalAcres
  const inss        = brutoTotal * (taxaInss / 100)
  const liquido     = brutoTotal - inss - form.outras_deducoes

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
          {ehVariavel ? (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-cyan-800">Regime {linha.regime_salarial === 'diario' ? 'diário' : 'horário'} — taxa</span>
                <span className="font-bold text-cyan-900 font-mono">{fmt(taxaUnitaria)} MT/{unidade}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-on-surface flex-1">{linha.regime_salarial === 'diario' ? 'Dias trabalhados' : 'Horas trabalhadas'}</label>
                <input type="number" min="0" step="0.5" value={form.quantidade_trabalhada}
                  onChange={e => set('quantidade_trabalhada', e.target.value)}
                  className="w-24 px-2.5 py-2 rounded-lg border border-cyan-300 bg-white text-sm text-right focus:border-primary outline-none font-mono" />
              </div>
              <div className="flex justify-between items-center text-sm border-t border-cyan-200 pt-2">
                <span className="text-on-surface-variant">Salário base (taxa × quantidade)</span>
                <span className="font-bold text-on-surface font-mono">{fmt(brutoBase)} MT</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface-bright rounded-xl p-3 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Salário base (após faltas)</span>
              <span className="font-bold text-on-surface font-mono">{fmt(brutoBase)} MT</span>
            </div>
          )}

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
              <span>INSS ({fmt(taxaInss)}%)</span><span className="font-mono">- {fmt(inss)} MT</span>
            </div>
            {form.outras_deducoes > 0 && (
              <div className="flex justify-between text-xs text-red-500 mb-1">
                <span>Outras deduções</span><span className="font-mono">- {fmt(form.outras_deducoes)} MT</span>
              </div>
            )}
            <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between">
              <span className="text-sm font-semibold text-primary">Salário Líquido (aprox.)</span>
              <span className="text-lg font-bold text-primary font-mono">{fmt(liquido)} MT</span>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2">O líquido final é recalculado pelo motor de cálculo ao guardar — este valor é apenas uma referência.</p>
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
  const { escola } = useAuth()
  const mesNome = MESES[folha.mes - 1]
  const brutoTotal = parseFloat(linha.valor_bruto || 0)
    + parseFloat(linha.bonus || 0)
    + parseFloat(linha.subsidio_alimentacao || 0)
    + parseFloat(linha.subsidio_transporte || 0)
    + parseFloat(linha.subsidio_habitacao || 0)

  const imprimir = () => {
    const conteudo = document.getElementById('recibo-individual').innerHTML
    const cabecalho = cabecalhoImpressaoHtml(escola, {
      titulo: 'Recibo de Vencimento',
      numero: `${numeroFolha(folha)}/${String(linha.id).padStart(3, '0')}`,
      periodo: `${mesNome} ${folha.ano}`,
    })
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
        ${CSS_CABECALHO_IMPRESSAO}
      </style></head>
      <body>${cabecalho}${conteudo}
        <p style="text-align:center;font-size:8px;color:#aaa;margin-top:16px">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP</p>
      </body></html>
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
                <span className="text-red-600">INSS Trabalhador{linha.taxa_inss_trabalhador ? ` (${fmt(linha.taxa_inss_trabalhador)}%)` : ''}</span>
                <span className="font-mono text-red-600">- {fmt(linha.inss_trabalhador)} MT</span>
              </div>
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
  const voltar = useVoltar('/rh/folha-pagamento')
  const { escola } = useAuth()
  const toast = useToast()
  const [folha, setFolha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [ajustarLinha, setAjustarLinha] = useState(null)
  const [reciboLinha, setReciboLinha] = useState(null)
  const [confirmacao, setConfirmacao] = useState(null)
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [cfgRh, setCfgRh] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [exportando, setExportando] = useState(null)

  const carregar = async () => {
    try {
      const r = await api.get(`/rh/folhas/${id}`)
      setFolha(r.data)
    } catch { navigate('/rh/folha-pagamento') }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [id])
  useEffect(() => { api.get('/rh/configuracao').then(r => setCfgRh(r.data)).catch(() => {}) }, [])

  // Volta a copiar conta/número/banco do cadastro para as linhas da folha
  // (ficam congelados na geração) -- para as correcções feitas a pedido da
  // análise chegarem à folha sem a ter de eliminar e gerar outra vez.
  const handleSincronizar = async () => {
    setSincronizando(true)
    try {
      const r = await api.post(`/rh/folhas/${id}/sincronizar-pagamento`, {})
      setFolha(r.data)
      toast.success('Dados de pagamento actualizados a partir do cadastro.')
    } catch (err) { toast.error(err.message) } finally { setSincronizando(false) }
  }

  const linhasDoGrupo = (grupo) => (folha.linhas || []).filter(l => l.grupo_pagamento === grupo.chave)

  const imprimirGrupo = (grupo) => {
    const win = window.open('', '_blank')
    win.document.write(documentoGrupoHtml({ escola, folha, grupo, linhas: linhasDoGrupo(grupo), cfgRh }))
    win.document.close()
    // Espera pelo logotipo antes de imprimir, mas nunca imprime duas vezes.
    let impresso = false
    const imprimir = () => { if (impresso) return; impresso = true; win.focus(); win.print() }
    win.onload = imprimir
    setTimeout(imprimir, 800)
  }

  const baixarExcel = async (grupo) => {
    setExportando(grupo.chave)
    try {
      const mesNome = MESES[folha.mes - 1]
      const nome = grupo.chave.startsWith('banco:')
        ? `pagamento_${grupo.chave.slice(6).replace(/[^A-Z0-9]+/gi, '_')}_${mesNome}_${folha.ano}.xlsx`
        : `Salarios_${mesNome}_${grupo.titulo}_${folha.ano}.xlsx`
      await api.download(`/rh/folhas/${id}/exportar?grupo=${encodeURIComponent(grupo.chave)}`, nome)
    } catch (err) { toast.error(err.message) } finally { setExportando(null) }
  }

  const handleProcessar = async () => {
    setProcessando(true)
    try {
      const r = await api.post(`/rh/folhas/${id}/processar`, {})
      setFolha(r.data)
      toast.success('Folha de pagamento processada com sucesso.')
    } catch (err) { toast.error(err.message) } finally { setProcessando(false); setConfirmacao(null) }
  }

  const handlePagar = async () => {
    try {
      const r = await api.patch(`/rh/folhas/${id}/pagar`, {})
      setFolha(r.data)
      toast.success('Folha marcada como paga com sucesso.')
    } catch (err) { toast.error(err.message) } finally { setConfirmacao(null) }
  }

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      await api.delete(`/rh/folhas/${id}`)
      toast.success('Rascunho de folha eliminado com sucesso.')
      navigate('/rh/folha-pagamento')
    } catch (err) { toast.error(err.message); setEliminando(false); setConfirmacao(null) }
  }

  const imprimirTudo = () => {
    const conteudo = document.getElementById('folha-print').innerHTML
    const cor = escola?.cor_principal || '#1a2b4b'
    const cabecalho = cabecalhoImpressaoHtml(escola, {
      titulo: 'Folha de Pagamento',
      numero: numeroFolha(folha),
      periodo: `${MESES[folha.mes - 1]} ${folha.ano}`,
    })
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Folha ${MESES[folha.mes - 1]} ${folha.ano}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:16px;color:#111}
        h1{font-size:14px;margin-bottom:2px}p{margin:2px 0;color:#555}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th{background:${cor};color:#fff;padding:5px 6px;text-align:left;font-size:9px;text-transform:uppercase}
        td{padding:4px 6px;border-bottom:1px solid #eee}
        tfoot td{font-weight:bold;background:#f9f9f9}
        .right{text-align:right}.red{color:#dc2626}.green{color:#16a34a}
        .no-print{display:none}.grupo-cab td{background:#eef2f7;font-weight:bold;font-size:11px;padding:6px}.grupo-sub td{font-weight:bold;background:#fafafa}
        .material-symbols-outlined{display:none}
        @media print{body{margin:0}}
        ${CSS_CABECALHO_IMPRESSAO}
      </style></head>
      <body>${cabecalho}${conteudo}
        <p style="text-align:center;font-size:8px;color:#aaa;margin-top:16px">Documento gerado pelo SIGE - SISTEMA INTEGRADO DE GESTÃO ESCOLAR ERP</p>
      </body></html>
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
  // Vem gravado na própria folha (nunca derivado de uma proporção fixa entre
  // taxas — cada escola pode ter taxas de INSS trabalhador/entidade diferentes).
  const totalInssEntidade = parseFloat(folha.total_inss_entidade || 0)
  const analise = folha.analise || { bloqueantes: [], alertas: [] }
  const nBloq = analise.bloqueantes.length
  const grupos = folha.grupos_pagamento || []
  // Tudo numa só folha, separado por canal (E-Mola, M-Pesa, um por banco).
  // O filtro mostra só um canal; sem filtro aparecem todos, um a seguir ao outro.
  const gruposVisiveis = grupos.filter(g => !filtroGrupo || g.chave === filtroGrupo)
  const somar = (ls) => ls.reduce((t, l) => ({
    bruto: t.bruto + (parseFloat(l.valor_bruto) || 0),
    acrescimos: t.acrescimos + (parseFloat(l.acrescimos) || 0),
    descontos: t.descontos + (parseFloat(l.descontos) || 0),
    liquido: t.liquido + (parseFloat(l.valor_liquido) || 0),
  }), { bruto: 0, acrescimos: 0, descontos: 0, liquido: 0 })
  const totaisVisiveis = somar((folha.linhas || []).filter(l => !filtroGrupo || l.grupo_pagamento === filtroGrupo))
  const grupoFiltrado = grupos.find(g => g.chave === filtroGrupo)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
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
        <button onClick={voltar} className="text-on-surface-variant hover:text-primary transition-colors">
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
          {isRascunho && (
            <button onClick={() => setConfirmacao('processar')} disabled={processando || nBloq > 0}
              title={nBloq > 0 ? `Resolva os ${nBloq} problema(s) da análise antes de processar` : ''}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">{nBloq > 0 ? 'block' : 'pending_actions'}</span>
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
            {isRascunho && <>Analise a folha abaixo: resolva todos os <b>problemas</b> e reveja os <b>alertas</b>. Use <b>Ajustar</b> para dias, bónus e descontos de cada funcionário. Só depois de processar ficam disponíveis os documentos de pagamento.</>}
            {isProcessado && <>Folha processada. Gere os <b>documentos de pagamento</b> abaixo (E-Mola, M-Pesa, Banco) e clique em <b>Marcar como Pago</b> depois de efectuar os pagamentos.</>}
            {isPago && <>Folha <b>encerrada</b>. Pode imprimir a folha geral ou os recibos individuais mas não é possível alterar valores.</>}
          </span>
        </div>
      </div>

      {/* Análise da folha -- problemas bloqueiam o processamento; alertas
          pedem atenção mas podem ser legítimos. */}
      <div className={`bg-white rounded-xl border p-5 mb-5 shadow-sm ${nBloq > 0 ? 'border-red-300' : 'border-outline-variant'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-semibold text-on-surface flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${nBloq > 0 ? 'text-red-600' : analise.alertas.length ? 'text-amber-600' : 'text-green-600'}`}>
              {nBloq > 0 ? 'report' : analise.alertas.length ? 'warning' : 'verified'}
            </span>
            Análise da Folha
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${nBloq > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {nBloq} problema(s)
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${analise.alertas.length ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {analise.alertas.length} alerta(s)
            </span>
            {isRascunho && (
              <button onClick={handleSincronizar} disabled={sincronizando}
                title="Copia de novo do cadastro o método, banco e conta de cada funcionário"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-bright disabled:opacity-60">
                <span className={`material-symbols-outlined text-[15px] ${sincronizando ? 'animate-spin' : ''}`}>{sincronizando ? 'progress_activity' : 'sync'}</span>
                Actualizar dados de pagamento
              </button>
            )}
          </div>
        </div>

        {isRascunho && folha.pagamento_desactualizado > 0 && (
          <div className="flex items-center gap-3 flex-wrap bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-3 py-2.5 mb-3 text-sm">
            <span className="material-symbols-outlined text-[18px]">sync_problem</span>
            <p className="flex-1 min-w-0">
              <b>{folha.pagamento_desactualizado} funcionário(s)</b> têm dados de pagamento corrigidos no cadastro que ainda não estão nesta folha.
            </p>
            <button onClick={handleSincronizar} disabled={sincronizando}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {sincronizando ? 'A actualizar...' : 'Actualizar agora'}
            </button>
          </div>
        )}

        {nBloq === 0 && analise.alertas.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            Nenhum problema encontrado: todos os funcionários têm conta de pagamento válida e valores coerentes.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {[...analise.bloqueantes.map(a => ({ ...a, nivel: 'bloq' })), ...analise.alertas.map(a => ({ ...a, nivel: 'alerta' }))].map((a, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${a.nivel === 'bloq' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                <span className="material-symbols-outlined text-[16px] mt-px flex-shrink-0">{a.nivel === 'bloq' ? 'block' : 'warning'}</span>
                <p className="flex-1 min-w-0"><b>{a.funcionario_nome || 'Folha'}</b> — {a.mensagem}</p>
                {a.funcionario_id && (
                  <button onClick={() => navigate(`/rh/funcionarios/${a.funcionario_id}/editar`)}
                    className="text-xs font-semibold underline whitespace-nowrap hover:opacity-70">Corrigir cadastro</button>
                )}
              </div>
            ))}
          </div>
        )}
        {nBloq > 0 && isRascunho && (
          <p className="text-[11px] text-on-surface-variant mt-3">
            Depois de corrigir o cadastro, clique em <b>Actualizar dados de pagamento</b> para a correcção chegar a esta folha.
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Funcionários',   value: folha.total_funcionarios,                               icon: 'badge',           c: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Total Bruto',    value: `${fmt(folha.total_bruto)} MT`,                          icon: 'payments',        c: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'INSS Trabalhador', value: `${fmt(folha.total_inss)} MT`,                        icon: 'account_balance', c: 'text-orange-600', bg: 'bg-orange-50' },
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[20px]">corporate_fare</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Custo Total para o Empregador</p>
            <p className="text-xs text-amber-700">Inclui INSS entidade{folha.taxa_inss_entidade_utilizada ? ` (${fmt(folha.taxa_inss_entidade_utilizada)}%)` : ''} sobre o bruto</p>
          </div>
        </div>
        <p className="text-lg font-bold text-amber-800 font-mono flex-shrink-0">
          {fmt(parseFloat(folha.total_bruto || 0) + totalInssEntidade)} MT
        </p>
      </div>

      {/* Filtro por canal -- quantos funcionários e quanto dinheiro há em cada
          um (E-Mola, M-Pesa, cada banco). Sem filtro, a folha mostra todos. */}
      <div className="print:hidden flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mr-1">Ver:</span>
        <button onClick={() => setFiltroGrupo('')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${!filtroGrupo ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-bright'}`}>
          Todos · {(folha.linhas || []).length} · {fmt(folha.total_liquido)} MT
        </button>
        {grupos.map(g => {
          const info = METODO_INFO[g.metodo] || METODO_INFO.banco
          const activo = filtroGrupo === g.chave
          return (
            <button key={g.chave} onClick={() => setFiltroGrupo(f => f === g.chave ? '' : g.chave)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${activo ? info.cls + ' border-current' : 'border-outline-variant text-on-surface-variant hover:bg-surface-bright'}`}>
              <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
              {g.titulo} · {g.funcionarios} · {fmt(g.total_liquido)} MT
            </button>
          )
        })}
      </div>

      {/* Folha -- uma só tabela, separada por canal de pagamento */}
      <div id="folha-print" className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h1 className="font-semibold text-on-surface">
            Folha de Pagamento — {MESES[folha.mes - 1]} {folha.ano}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {folha.total_funcionarios} funcionário(s) · Estado: {folha.estado}
            {grupoFiltrado && <> · A ver só: {grupoFiltrado.titulo}</>}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-bright">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Funcionário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Conta / Número</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Valor/Dia × Dias</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Bruto Base</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span className="text-green-600">+ Adicionais</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <span className="text-red-500">- Deduções</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wide font-bold">Líquido</th>
                <th className="no-print px-4 py-3 w-28 text-xs font-semibold text-on-surface-variant uppercase tracking-wide text-center">Acções</th>
              </tr>
            </thead>
            {gruposVisiveis.map(g => {
              const info = METODO_INFO[g.metodo] || METODO_INFO.banco
              const linhasGrupo = linhasDoGrupo(g)
              const sub = somar(linhasGrupo)
              return (
                <tbody key={g.chave} className="divide-y divide-outline-variant/50 border-t-2 border-outline-variant">
                  <tr className="grupo-cab bg-surface-container-low">
                    <td colSpan={8} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${info.cls}`}>
                          <span className="material-symbols-outlined text-[16px]">{info.icon}</span>
                        </span>
                        <span className="font-semibold text-on-surface">{g.titulo}</span>
                        <span className="text-xs text-on-surface-variant">· {g.funcionarios} funcionário(s) · {fmt(g.total_liquido)} MT</span>
                      </div>
                    </td>
                  </tr>
                  {linhasGrupo.map(l => {
                    const adicionais = parseFloat(l.bonus||0) + parseFloat(l.subsidio_alimentacao||0)
                      + parseFloat(l.subsidio_transporte||0) + parseFloat(l.subsidio_habitacao||0)
                    const deducoes = parseFloat(l.inss_trabalhador||0) + parseFloat(l.outras_deducoes||0)
                    return (
                      <tr key={l.id} className="hover:bg-surface-bright/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-on-surface">{l.funcionario_nome}</p>
                          {l.cargo_nome && (
                            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-bright text-on-surface-variant">
                              {l.cargo_nome}
                            </span>
                          )}
                          {l.observacoes && (
                            <p className="text-[11px] text-on-surface-variant flex items-start gap-1 mt-1.5">
                              <span className="no-print material-symbols-outlined text-[12px] mt-px flex-shrink-0">info</span>
                              <span>{l.observacoes}</span>
                            </p>
                          )}
                          {l.avisos && (
                            <p className="no-print text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-1 flex items-start gap-1 mt-1.5" title={l.avisos}>
                              <span className="material-symbols-outlined text-[12px] mt-px flex-shrink-0">warning</span>
                              <span>{l.avisos.length > 70 ? l.avisos.slice(0, 70) + '…' : l.avisos}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-mono text-on-surface">{l.conta_pagamento_utilizada || <span className="text-red-600 font-sans">sem conta</span>}</p>
                          {l.metodo_pagamento_utilizado === 'banco' && l.banco_utilizado && (
                            <p className="text-[11px] text-on-surface-variant">{l.banco_utilizado}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-on-surface-variant whitespace-nowrap">
                          {fmt(l.valor_dia)} × {parseFloat(l.dias_pagos) || 0}
                          <p className="text-[10px] uppercase">{l.regime_salarial === 'mensal' ? 'mensal' : 'diário'}</p>
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
                        <td className="no-print px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isRascunho && (
                              <button onClick={() => setAjustarLinha(l)} title="Ajustar dias, bónus e descontos"
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
                  <tr className="grupo-sub bg-surface-bright/60 text-xs">
                    <td className="px-4 py-2 font-semibold text-on-surface-variant" colSpan={3}>Subtotal {g.titulo}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(sub.bruto)}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-700">+ {fmt(sub.acrescimos)}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">- {fmt(sub.descontos)}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{fmt(sub.liquido)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tbody>
              )
            })}
            <tfoot>
              <tr className="bg-surface-bright font-semibold border-t-2 border-outline-variant">
                <td className="px-4 py-3 text-on-surface" colSpan={3}>TOTAL{grupoFiltrado ? ` — ${grupoFiltrado.titulo}` : ' DA FOLHA'}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(totaisVisiveis.bruto)}</td>
                <td className="px-4 py-3 text-right font-mono text-green-700">+ {fmt(totaisVisiveis.acrescimos)}</td>
                <td className="px-4 py-3 text-right font-mono text-red-500">- {fmt(totaisVisiveis.descontos)}</td>
                <td className="px-4 py-3 text-right font-mono text-green-700 font-bold">{fmt(totaisVisiveis.liquido)}</td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Baixar a folha -- a separação por canal só existe aqui, para pagar:
          o banco recebe o ficheiro no formato dele; E-Mola e M-Pesa são pagos
          manualmente pela escola a partir da lista. */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-5 mt-5">
        <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-[20px]">download</span>
          Baixar a folha
        </h2>
        <p className="text-xs text-on-surface-variant mb-4">
          {isRascunho
            ? 'Os ficheiros para pagamento ficam disponíveis depois de processar a folha.'
            : 'Banco: ficheiro no formato pedido pelo banco para a transferência. E-Mola / M-Pesa: lista para a escola pagar manualmente.'}
        </p>
        <div className="divide-y divide-outline-variant/60 border border-outline-variant rounded-xl">
          <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">description</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface">Folha completa</p>
              <p className="text-[11px] text-on-surface-variant">Todos os canais, separados, como aparece acima · {fmt(folha.total_liquido)} MT</p>
            </div>
            <button onClick={imprimirTudo}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-bright">
              <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>PDF
            </button>
          </div>
          {grupos.map(g => {
            const info = METODO_INFO[g.metodo] || METODO_INFO.banco
            const semDebito = g.metodo === 'banco' && cfgRh && !cfgRh.conta_debito_salarios
            return (
              <div key={g.chave} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${info.cls}`}>
                  <span className="material-symbols-outlined text-[16px]">{info.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{g.titulo}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {g.funcionarios} funcionário(s) · {fmt(g.total_liquido)} MT · {g.metodo === 'banco' ? 'para carregar no banco' : 'para pagamento manual'}
                  </p>
                  {semDebito && !isRascunho && (
                    <p className="text-[11px] text-amber-700">Sem conta de débito da escola configurada — o ficheiro sai sem a linha "D" (RH › Fórmula Salarial).</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => imprimirGrupo(g)} disabled={isRascunho}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-bright disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>PDF
                  </button>
                  <button onClick={() => baixarExcel(g)} disabled={isRascunho || exportando === g.chave}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className={`material-symbols-outlined text-[15px] ${exportando === g.chave ? 'animate-spin' : ''}`}>{exportando === g.chave ? 'progress_activity' : 'table_view'}</span>Excel
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
