// ─────────────────────────────────────────────────────────────────────────────
// Motor único de cálculo salarial (INSS + componentes).
//
// Usado por TODOS os pontos que calculam ou recalculam um salário: geração
// inicial da folha, edição manual de uma linha em rascunho e reprocessamento.
// Não deve existir nenhuma fórmula de INSS fora deste ficheiro.
//
// IRPS: removido do cálculo automático a pedido da escola — a retenção de
// IRPS passou a ser apurada manualmente por eles, fora do sistema. O campo
// "irps" mantido nas tabelas (histórico) não é escrito por este motor.
//
// Princípios (ver auditoria do módulo de payroll):
//  - A taxa de INSS nunca fica fixa no código: vem sempre de rh_configuracao.
//    Por lei moçambicana (Decreto n.º 53/2007, Regulamento do INSS), a taxa
//    de contribuição é de 7% do salário, repartida em 3% trabalhador + 4%
//    entidade — são os valores por omissão em rh_configuracao.
//  - Nenhum componente salarial é classificado por nome. Cada componente tem
//    um campo explícito sujeito_inss ('sim'|'nao'|'a_confirmar'). Um
//    componente 'a_confirmar' NUNCA entra automaticamente na base de INSS —
//    fica de fora e gera um aviso, em vez de se presumir um tratamento.
//  - Nem todo funcionário é descontado de INSS (decisão da escola, caso a
//    caso — ver funcionarios.sujeito_inss). Só 'sim' faz o motor calcular
//    INSS; 'nao' e 'a_confirmar' resultam em INSS zero, com aviso no
//    segundo caso.
//  - INSS entidade nunca reduz o líquido do trabalhador.
// ─────────────────────────────────────────────────────────────────────────────

const fmt2 = (v) => parseFloat((parseFloat(v || 0)).toFixed(2))

// ─── Componentes salariais ────────────────────────────────────────────────────

// Separa os componentes recorrentes/activos (aplicados automaticamente) dos
// que precisam de acção manual, e calcula o valor de cada um. Nunca classifica
// pelo nome — só pelos campos explícitos do componente.
const calcularComponentesRecorrentes = (componentes, salarioBase) => {
  const aplicados = []
  const avisos = []
  let totalAcrescimos = 0, totalDeducoes = 0
  let baseInssExtra = 0

  for (const c of (componentes || [])) {
    if (c.activo === false) continue
    if (!c.obrigatorio) continue // não-recorrentes só entram por evento manual
    const valor = c.percentual ? fmt2(salarioBase * (parseFloat(c.valor) / 100)) : fmt2(c.valor || 0)
    const sinal = c.tipo === 'deducao' ? -1 : 1
    if (sinal > 0) totalAcrescimos += valor; else totalDeducoes += valor

    const sujeitoInss = c.sujeito_inss === 'sim'
    if (sujeitoInss) baseInssExtra += valor * (sinal > 0 ? 1 : -1)

    if (c.sujeito_inss === 'a_confirmar') {
      avisos.push(`Componente "${c.nome}" sem tratamento fiscal de INSS confirmado — revisar em RH > Configuração. Não entrou na base de INSS até ser confirmado.`)
    }

    aplicados.push({
      id: c.id, nome: c.nome, tipo: c.tipo, valor, percentual: !!c.percentual,
      sujeito_inss: c.sujeito_inss || 'a_confirmar',
      origem: 'recorrente',
    })
  }

  return { aplicados, avisos, totalAcrescimos: fmt2(totalAcrescimos), totalDeducoes: fmt2(totalDeducoes), baseInssExtra: fmt2(baseInssExtra) }
}

// ─── Motor principal ──────────────────────────────────────────────────────────
//
// Único ponto de cálculo de um salário. Usado na geração da folha, na edição
// manual de uma linha e em qualquer reprocessamento.
//
// Entrada:
//   salarioBase, diasUteis, diasFalta, tipoFalta,
//   componentesRecorrentes (array da configuração), eventosManuais (array
//   {nome, valor, tipo:'bonus'|'deducao', sujeito_inss} — ex: ajustes feitos
//   à mão numa linha em rascunho),
//   taxaInssTrabalhador, taxaInssEntidade (%),
//   outrasDeducoes, temContrato (bool, só para aviso)
//
// Saída: objecto completo com todos os valores intermédios, pronto a gravar
// como snapshot auditável.
const calcularSalarioFuncionario = ({
  salarioBase, diasUteis, diasFalta = 0, tipoFalta = 'injustificada',
  componentesRecorrentes = [], eventosManuais = [],
  taxaInssTrabalhador, taxaInssEntidade, sujeitoInss = 'a_confirmar',
  outrasDeducoes = 0, temContrato = true,
}) => {
  const avisos = []
  if (!temContrato) avisos.push('Funcionário sem contrato activo. Salário base do cadastro utilizado como fallback.')
  if (sujeitoInss === 'a_confirmar') {
    avisos.push('Funcionário sem tratamento de INSS confirmado no cadastro — revisar em RH > Funcionários. INSS não foi aplicado até ser confirmado.')
  }

  const base = fmt2(salarioBase)
  const deducaoFalta = diasUteis > 0 ? fmt2((base / diasUteis) * (diasFalta || 0)) : 0
  const brutoAposFaltas = fmt2(base - deducaoFalta)

  const recorrentes = calcularComponentesRecorrentes(componentesRecorrentes, base)
  avisos.push(...recorrentes.avisos)

  // Eventos manuais (ajustes desta competência): mesma regra de classificação
  // fiscal explícita — nunca presumida.
  let manualAcrescimos = 0, manualDeducoes = 0, manualBaseInss = 0
  const eventosAplicados = []
  for (const ev of eventosManuais) {
    const valor = fmt2(ev.valor || 0)
    if (valor === 0) continue
    const sinal = ev.tipo === 'deducao' ? -1 : 1
    if (sinal > 0) manualAcrescimos += valor; else manualDeducoes += valor
    if (ev.sujeito_inss === 'sim') manualBaseInss += valor * sinal
    if (!ev.sujeito_inss || ev.sujeito_inss === 'a_confirmar') {
      avisos.push(`Ajuste manual "${ev.nome || 'sem nome'}" sem tratamento fiscal de INSS confirmado — não entrou na base de INSS.`)
    }
    eventosAplicados.push({ ...ev, valor, origem: 'manual' })
  }

  const brutoTotal = fmt2(brutoAposFaltas + recorrentes.totalAcrescimos - recorrentes.totalDeducoes + manualAcrescimos - manualDeducoes)

  // Base INSS: salário base (sempre contributivo) + componentes/eventos
  // explicitamente marcados sujeito_inss = 'sim'. Nunca "bruto total" por
  // omissão. Só se o próprio funcionário está marcado sujeito_inss='sim' --
  // caso contrário a base e o INSS calculado ficam a zero (nunca metade
  // calculado, para não confundir a leitura do recibo).
  const funcionarioSujeitoInss = sujeitoInss === 'sim'
  const baseInss = funcionarioSujeitoInss ? fmt2(brutoAposFaltas + recorrentes.baseInssExtra + manualBaseInss) : 0
  const inssTrabalhador = funcionarioSujeitoInss ? fmt2(baseInss * (parseFloat(taxaInssTrabalhador) / 100)) : 0
  const inssEntidade = funcionarioSujeitoInss ? fmt2(baseInss * (parseFloat(taxaInssEntidade) / 100)) : 0

  const outras = fmt2(outrasDeducoes)
  const liquido = fmt2(brutoTotal - inssTrabalhador - outras)
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
    outras_deducoes: outras,
    valor_liquido: liquido,
    custo_entidade: custoEntidade,
    avisos,
  }
}

module.exports = {
  calcularComponentesRecorrentes,
  calcularSalarioFuncionario,
}
