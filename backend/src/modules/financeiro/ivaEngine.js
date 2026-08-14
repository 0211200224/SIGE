// ─────────────────────────────────────────────────────────────────────────────
// Motor único de cálculo de IVA sobre cobranças (Financeiro).
//
// Usado exclusivamente por registarPagamento() -- não deve existir nenhuma
// outra fórmula de IVA fora deste ficheiro.
//
// Princípios:
//  - A taxa de IVA nunca fica fixa no código: vem sempre de
//    financeiro_configuracao.taxa_iva, definida e confirmada pela escola.
//  - Uma taxa (tipo de cobrança) só entra na base de IVA quando
//    sujeito_iva === 'sim'. 'a_confirmar' e 'nao' NUNCA são tratados como
//    "sim" por omissão -- fica de fora do cálculo.
//  - Cálculo "IVA por dentro" (preço já inclui o IVA): a base tributável é
//    obtida dividindo o valor total pelo factor (1 + taxa/100); o IVA é
//    sempre a diferença entre o valor total e essa base -- nunca calculado
//    em separado -- para garantir que base + iva == valor exactamente,
//    sem desvios de arredondamento.
// ─────────────────────────────────────────────────────────────────────────────

const fmt2 = (v) => parseFloat((parseFloat(v || 0)).toFixed(2))

// Calcula a decomposição de IVA "por dentro" de um valor já registado.
//
// Entrada:
//   valor        - valor total cobrado (já inclui o IVA, se aplicável)
//   sujeitoIva   - 'sim' | 'nao' | 'a_confirmar' (vem da taxa/tipo de cobrança)
//   ivaActivo    - a escola tem o IVA activado (financeiro_configuracao.iva_activo)
//   taxaIva      - percentagem configurada (financeiro_configuracao.taxa_iva)
//
// Saída: snapshot pronto a gravar em pagamentos -- nunca recalculado depois.
const calcularIva = ({ valor, sujeitoIva, ivaActivo, taxaIva }) => {
  const aplicavel = !!ivaActivo && sujeitoIva === 'sim' && taxaIva != null && parseFloat(taxaIva) > 0

  if (!aplicavel) {
    return {
      iva_aplicado: 0,
      taxa_iva_aplicada: null,
      valor_base_tributavel: null,
      valor_iva: null,
    }
  }

  const total = fmt2(valor)
  const taxa = parseFloat(taxaIva)
  const base = fmt2(total / (1 + taxa / 100))
  const iva = fmt2(total - base) // por diferença, nunca em separado -- garante base + iva === total

  return {
    iva_aplicado: 1,
    taxa_iva_aplicada: fmt2(taxa),
    valor_base_tributavel: base,
    valor_iva: iva,
  }
}

module.exports = { calcularIva }
