// ─────────────────────────────────────────────────────────────────────────────
// Motor único de cálculo salarial (INSS + IRPS + componentes).
//
// Usado por TODOS os pontos que calculam ou recalculam um salário: geração
// inicial da folha, edição manual de uma linha em rascunho e reprocessamento.
// Não deve existir nenhuma fórmula de INSS/IRPS fora deste ficheiro.
//
// Princípios (ver auditoria do módulo de payroll):
//  - Nenhuma taxa fiscal fica fixa no código: vêm sempre de rh_configuracao
//    (INSS) ou de uma tabela versionada em irps_tabelas (IRPS).
//  - Nenhum componente salarial é classificado por nome. Cada componente tem
//    campos explícitos sujeito_inss/sujeito_irps ('sim'|'nao'|'a_confirmar').
//    Um componente 'a_confirmar' NUNCA entra automaticamente numa base fiscal
//    — fica de fora e gera um aviso, em vez de se presumir um tratamento.
//  - Número de dependentes nunca é somado como valor monetário: só serve para
//    escolher a coluna aplicável na tabela de IRPS.
//  - INSS entidade nunca reduz o líquido do trabalhador.
// ─────────────────────────────────────────────────────────────────────────────

const fmt2 = (v) => parseFloat((parseFloat(v || 0)).toFixed(2))

// ─── IRPS ───────────────────────────────────────────────────────────────────

// Devolve a tabela de IRPS activa e vigente numa data de referência (string
// YYYY-MM-DD ou Date). Se houver mais que uma vigente (não devia acontecer,
// mas por segurança), usa a mais recente por vigencia_inicio.
const obterTabelaIrpsVigente = async (db, dataReferencia) => {
  const r = await db.query(
    `SELECT * FROM irps_tabelas
     WHERE activa = 1 AND vigencia_inicio <= ?
       AND (vigencia_fim IS NULL OR vigencia_fim >= ?)
     ORDER BY vigencia_inicio DESC LIMIT 1`,
    [dataReferencia, dataReferencia]
  )
  return r.rows[0] || null
}

// Calcula o IRPS de retenção mensal (nunca apuramento anual) a partir de uma
// tabela vigente já carregada (ver obterTabelaIrpsVigente). Devolve o valor
// e o detalhe do escalão aplicado, para ficar gravado como snapshot auditável.
const calcularIRPS = (rendimentoBase, numeroDependentes, tabela) => {
  if (!tabela) {
    return { irps: 0, escalao_aplicado: null, motivo: 'sem_tabela_vigente' }
  }
  const rendimento = fmt2(rendimentoBase)
  // A tabela só tem colunas 0,1,2,3,"4 ou mais" — dependentes acima de 4
  // usam sempre a última coluna.
  const depColuna = String(Math.min(Math.max(0, Math.floor(numeroDependentes || 0)), 4))

  const escaloes = Array.isArray(tabela.escaloes) ? tabela.escaloes : JSON.parse(tabela.escaloes || '[]')
  const escalao = escaloes.find(e =>
    rendimento >= e.limite_inferior && (e.limite_superior == null || rendimento <= e.limite_superior)
  )
  if (!escalao) {
    return { irps: 0, escalao_aplicado: null, motivo: 'rendimento_fora_da_tabela' }
  }
  if (escalao.isento) {
    return { irps: 0, escalao_aplicado: escalao, motivo: 'escalao_isento' }
  }
  if (Array.isArray(escalao.isento_deps) && escalao.isento_deps.includes(Number(depColuna))) {
    return { irps: 0, escalao_aplicado: escalao, dependentes_coluna: depColuna, motivo: 'isento_por_dependentes' }
  }
  const base = escalao.base?.[depColuna]
  if (base === undefined) {
    return { irps: 0, escalao_aplicado: escalao, motivo: 'coluna_dependentes_nao_definida' }
  }
  const irps = fmt2(base + (rendimento - escalao.limite_inferior) * escalao.coeficiente)
  return {
    irps,
    escalao_aplicado: escalao,
    dependentes_coluna: depColuna,
    tabela_codigo: tabela.codigo,
    tabela_id: tabela.id,
    motivo: 'calculado',
  }
}

// ─── Componentes salariais ────────────────────────────────────────────────────

// Separa os componentes recorrentes/activos (aplicados automaticamente) dos
// que precisam de acção manual, e calcula o valor de cada um. Nunca classifica
// pelo nome — só pelos campos explícitos do componente.
const calcularComponentesRecorrentes = (componentes, salarioBase) => {
  const aplicados = []
  const avisos = []
  let totalAcrescimos = 0, totalDeducoes = 0
  let baseInssExtra = 0, baseIrpsExtra = 0

  for (const c of (componentes || [])) {
    if (c.activo === false) continue
    if (!c.obrigatorio) continue // não-recorrentes só entram por evento manual
    const valor = c.percentual ? fmt2(salarioBase * (parseFloat(c.valor) / 100)) : fmt2(c.valor || 0)
    const sinal = c.tipo === 'deducao' ? -1 : 1
    if (sinal > 0) totalAcrescimos += valor; else totalDeducoes += valor

    const sujeitoInss = c.sujeito_inss === 'sim'
    const sujeitoIrps = c.sujeito_irps === 'sim'
    if (sujeitoInss) baseInssExtra += valor * (sinal > 0 ? 1 : -1)
    if (sujeitoIrps) baseIrpsExtra += valor * (sinal > 0 ? 1 : -1)

    if (c.sujeito_inss === 'a_confirmar' || c.sujeito_irps === 'a_confirmar') {
      avisos.push(`Componente "${c.nome}" sem tratamento fiscal confirmado (INSS/IRPS) — revisar em RH > Configuração. Não entrou nas bases fiscais até ser confirmado.`)
    }

    aplicados.push({
      id: c.id, nome: c.nome, tipo: c.tipo, valor, percentual: !!c.percentual,
      sujeito_inss: c.sujeito_inss || 'a_confirmar', sujeito_irps: c.sujeito_irps || 'a_confirmar',
      origem: 'recorrente',
    })
  }

  return { aplicados, avisos, totalAcrescimos: fmt2(totalAcrescimos), totalDeducoes: fmt2(totalDeducoes), baseInssExtra: fmt2(baseInssExtra), baseIrpsExtra: fmt2(baseIrpsExtra) }
}

// ─── Motor principal ──────────────────────────────────────────────────────────
//
// Único ponto de cálculo de um salário. Usado na geração da folha, na edição
// manual de uma linha e em qualquer reprocessamento.
//
// Entrada:
//   salarioBase, diasUteis, diasFalta, tipoFalta,
//   componentesRecorrentes (array da configuração), eventosManuais (array
//   {nome, valor, tipo:'bonus'|'deducao', sujeito_inss, sujeito_irps} — ex:
//   ajustes feitos à mão numa linha em rascunho),
//   taxaInssTrabalhador, taxaInssEntidade (%), calcularIrpsFlag,
//   tabelaIrps (objecto já carregado ou null), numeroDependentes,
//   outrasDeducoes, temContrato (bool, só para aviso)
//
// Saída: objecto completo com todos os valores intermédios, pronto a gravar
// como snapshot auditável.
const calcularSalarioFuncionario = ({
  salarioBase, diasUteis, diasFalta = 0, tipoFalta = 'injustificada',
  componentesRecorrentes = [], eventosManuais = [],
  taxaInssTrabalhador, taxaInssEntidade, calcularIrpsFlag, tabelaIrps,
  numeroDependentes = 0, outrasDeducoes = 0, temContrato = true,
}) => {
  const avisos = []
  if (!temContrato) avisos.push('Funcionário sem contrato activo. Salário base do cadastro utilizado como fallback.')

  const base = fmt2(salarioBase)
  const deducaoFalta = diasUteis > 0 ? fmt2((base / diasUteis) * (diasFalta || 0)) : 0
  const brutoAposFaltas = fmt2(base - deducaoFalta)

  const recorrentes = calcularComponentesRecorrentes(componentesRecorrentes, base)
  avisos.push(...recorrentes.avisos)

  // Eventos manuais (ajustes desta competência): mesma regra de classificação
  // fiscal explícita — nunca presumida.
  let manualAcrescimos = 0, manualDeducoes = 0, manualBaseInss = 0, manualBaseIrps = 0
  const eventosAplicados = []
  for (const ev of eventosManuais) {
    const valor = fmt2(ev.valor || 0)
    if (valor === 0) continue
    const sinal = ev.tipo === 'deducao' ? -1 : 1
    if (sinal > 0) manualAcrescimos += valor; else manualDeducoes += valor
    if (ev.sujeito_inss === 'sim') manualBaseInss += valor * sinal
    if (ev.sujeito_irps === 'sim') manualBaseIrps += valor * sinal
    if (!ev.sujeito_inss || !ev.sujeito_irps || ev.sujeito_inss === 'a_confirmar' || ev.sujeito_irps === 'a_confirmar') {
      avisos.push(`Ajuste manual "${ev.nome || 'sem nome'}" sem tratamento fiscal confirmado — não entrou nas bases fiscais.`)
    }
    eventosAplicados.push({ ...ev, valor, origem: 'manual' })
  }

  const brutoTotal = fmt2(brutoAposFaltas + recorrentes.totalAcrescimos - recorrentes.totalDeducoes + manualAcrescimos - manualDeducoes)

  // Base INSS: salário base (sempre contributivo) + componentes/eventos
  // explicitamente marcados sujeito_inss = 'sim'. Nunca "bruto total" por
  // omissão.
  const baseInss = fmt2(brutoAposFaltas + recorrentes.baseInssExtra + manualBaseInss)
  const inssTrabalhador = fmt2(baseInss * (parseFloat(taxaInssTrabalhador) / 100))
  const inssEntidade = fmt2(baseInss * (parseFloat(taxaInssEntidade) / 100))

  // Base IRPS: salário base + componentes/eventos sujeitos a IRPS, menos o
  // INSS do trabalhador (prática corrente moçambicana: a contribuição para a
  // segurança social do trabalhador é deduzida antes do IRPS). Esta dedução
  // do INSS já vinha da implementação anterior — mantida, mas assinalada
  // como prática a confirmar formalmente (ver REGRA FISCAL A VALIDAR).
  const baseIrpsAntesInss = fmt2(brutoAposFaltas + recorrentes.baseIrpsExtra + manualBaseIrps)
  const baseIrps = fmt2(baseIrpsAntesInss - inssTrabalhador)

  let irpsResultado = { irps: 0, escalao_aplicado: null, motivo: 'irps_desactivado' }
  if (calcularIrpsFlag) {
    if (!tabelaIrps) {
      avisos.push('Cálculo de IRPS activo mas nenhuma tabela de IRPS vigente foi encontrada — IRPS não foi calculado (0,00).')
    } else if (!tabelaIrps.confirmada_vigente) {
      avisos.push(`Tabela de IRPS "${tabelaIrps.codigo}" ainda não confirmada como vigente à data actual — usar com reserva até confirmação (ver fonte da tabela).`)
    }
    irpsResultado = calcularIRPS(baseIrps, numeroDependentes, tabelaIrps)
  }

  const outras = fmt2(outrasDeducoes)
  const liquido = fmt2(brutoTotal - inssTrabalhador - irpsResultado.irps - outras)
  const custoEntidade = fmt2(brutoTotal + inssEntidade)

  return {
    // Snapshot dos parâmetros usados (para gravar, não recalcular no futuro)
    salario_base: base,
    dias_uteis_utilizados: diasUteis,
    dias_falta: diasFalta,
    tipo_falta: tipoFalta,
    deducao_falta: deducaoFalta,
    bruto_apos_faltas: brutoAposFaltas,
    componentes_aplicados: [...recorrentes.aplicados, ...eventosAplicados],
    total_acrescimos: fmt2(recorrentes.totalAcrescimos + manualAcrescimos),
    total_deducoes_componentes: fmt2(recorrentes.totalDeducoes + manualDeducoes),
    bruto_total: brutoTotal,
    base_inss: baseInss,
    taxa_inss_trabalhador: fmt2(taxaInssTrabalhador),
    taxa_inss_entidade: fmt2(taxaInssEntidade),
    inss_trabalhador: inssTrabalhador,
    inss_entidade: inssEntidade,
    base_irps: baseIrps,
    numero_dependentes_utilizado: numeroDependentes,
    irps: irpsResultado.irps,
    irps_tabela_id: irpsResultado.tabela_id || null,
    irps_escalao_aplicado: irpsResultado.escalao_aplicado ? { ...irpsResultado.escalao_aplicado, dependentes_coluna: irpsResultado.dependentes_coluna, motivo: irpsResultado.motivo } : { motivo: irpsResultado.motivo },
    outras_deducoes: outras,
    valor_liquido: liquido,
    custo_entidade: custoEntidade,
    avisos,
  }
}

module.exports = {
  obterTabelaIrpsVigente,
  calcularIRPS,
  calcularComponentesRecorrentes,
  calcularSalarioFuncionario,
}
