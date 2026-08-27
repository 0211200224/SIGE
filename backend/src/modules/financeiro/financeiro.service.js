const db = require('../../config/database')
const iva = require('./ivaEngine')

const fmt2 = (v) => parseFloat(parseFloat(v || 0).toFixed(2))

// ─── CONFIGURAÇÃO FISCAL (IVA) ─────────────────────────────────────────────────
const obterConfiguracaoIva = async (tenantId) => {
  const r = await db.query('SELECT * FROM financeiro_configuracao WHERE escola_id = ?', [tenantId])
  if (r.rows[0]) return r.rows[0]
  // Por omissão: IVA desligado, sem taxa definida -- nunca activo por defeito.
  await db.query(
    `INSERT INTO financeiro_configuracao (escola_id, iva_activo, taxa_iva, iva_fonte)
     VALUES (?, 0, NULL, NULL) ON CONFLICT (escola_id) DO NOTHING`,
    [tenantId]
  )
  return { escola_id: tenantId, iva_activo: 0, taxa_iva: null, iva_fonte: null, dia_vencimento_mensalidade: 8 }
}

// Dia do mes por omissao para as cobrancas geradas automaticamente pelos
// Planos de Mensalidades, quando o proprio plano nao define o seu dia.
// Campo em separado de atualizarConfiguracaoIva para nao arriscar apagar um
// valor ja configurado sempre que a pagina de IVA gravar sem o enviar.
const atualizarDiaVencimentoPadrao = async (tenantId, dia) => {
  const diaFinal = Number(dia) >= 1 && Number(dia) <= 28 ? Number(dia) : 8
  await obterConfiguracaoIva(tenantId) // garante que a linha existe
  await db.query(
    'UPDATE financeiro_configuracao SET dia_vencimento_mensalidade = ? WHERE escola_id = ?',
    [diaFinal, tenantId]
  )
  return obterConfiguracaoIva(tenantId)
}

// Nunca inferido so no momento da leitura: o status fica sempre correcto na
// base de dados, para qualquer relatorio/portal que leia "vencido"
// directamente (sem repetir esta logica) poder confiar nele.
const marcarCobrancasVencidas = async (tenantId) => {
  await db.query(
    `UPDATE cobrancas SET status = 'vencido'
     WHERE escola_id = ? AND status = 'pendente' AND data_vencimento IS NOT NULL AND data_vencimento < CURRENT_DATE`,
    [tenantId]
  )
}

const atualizarContaAlunoCobrado = async (tenantId, alunoId, anoLectivo, valor) => {
  if (!(valor > 0)) return
  await db.query(
    `INSERT INTO contas_alunos (escola_id, aluno_id, ano_lectivo, total_cobrado)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (escola_id, aluno_id, ano_lectivo) DO UPDATE SET total_cobrado = contas_alunos.total_cobrado + EXCLUDED.total_cobrado`,
    [tenantId, alunoId, anoLectivo, fmt2(valor)]
  )
}

const atualizarConfiguracaoIva = async (tenantId, dados) => {
  const { iva_activo, taxa_iva, iva_fonte } = dados
  await db.query(
    `INSERT INTO financeiro_configuracao (escola_id, iva_activo, taxa_iva, iva_fonte)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (escola_id) DO UPDATE SET
       iva_activo = EXCLUDED.iva_activo,
       taxa_iva = EXCLUDED.taxa_iva,
       iva_fonte = EXCLUDED.iva_fonte`,
    [tenantId, iva_activo ? 1 : 0, taxa_iva !== undefined && taxa_iva !== '' ? fmt2(taxa_iva) : null, iva_fonte || null]
  )
  return obterConfiguracaoIva(tenantId)
}

// ─── STATS / RESUMO ───────────────────────────────────────────────────────────
const obterStats = async (tenantId) => {
  await marcarCobrancasVencidas(tenantId)
  const [pg, cb, bolsas, fechos] = await Promise.all([
    db.query(`SELECT
       SUM(CASE WHEN estado IN ('pendente') THEN 1 ELSE 0 END) AS pendentes,
       SUM(CASE WHEN estado = 'em_analise' THEN 1 ELSE 0 END) AS em_analise,
       SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN 1 ELSE 0 END) AS confirmados,
       SUM(CASE WHEN estado = 'rejeitado' THEN 1 ELSE 0 END) AS rejeitados,
       SUM(CASE WHEN anulado = 1 THEN 1 ELSE 0 END) AS anulados,
       COALESCE(SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN valor ELSE 0 END), 0) AS total_recebido
     FROM pagamentos WHERE escola_id = ?`, [tenantId]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS divida_total, COUNT(*) AS devedores
     FROM cobrancas WHERE escola_id = ? AND status IN ('pendente','vencido')`, [tenantId]),
    db.query(`SELECT COUNT(*) n FROM bolsas WHERE escola_id = ? AND status = 'pendente'`, [tenantId]),
    db.query(`SELECT COUNT(*) n FROM fechos_financeiros WHERE escola_id = ? AND status = 'aberto'`, [tenantId]),
  ])
  return {
    ...pg.rows[0],
    ...cb.rows[0],
    bolsas_pendentes: bolsas.rows[0].n,
    fechos_abertos: fechos.rows[0].n,
  }
}

// ─── TAXAS (tipos de cobrança) ─────────────────────────────────────────────────
const listarTaxas = async (tenantId) => {
  const r = await db.query(
    `SELECT t.*, gl.nome AS classe_nome FROM taxas t
     LEFT JOIN grade_levels gl ON t.grade_level_id = gl.id
     WHERE t.escola_id = ? AND (t.activo = 1 OR t.activo IS NULL)
     ORDER BY t.nome ASC`,
    [tenantId]
  )
  return r.rows
}

const criarTaxa = async (tenantId, dados) => {
  const { nome, categoria, valor, valor_variavel, periodicidade, grade_level_id, descricao, obrigatoria, sujeito_iva } = dados
  const r = await db.query(
    `INSERT INTO taxas (escola_id, nome, categoria, valor, valor_variavel, periodicidade, grade_level_id, descricao, obrigatoria, sujeito_iva, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [tenantId, nome, categoria || 'academico', fmt2(valor), valor_variavel ? 1 : 0, periodicidade || 'mensal', grade_level_id || null, descricao || null, obrigatoria ? 1 : 0, sujeito_iva || 'a_confirmar']
  )
  const f = await db.query(`SELECT t.*, gl.nome AS classe_nome FROM taxas t LEFT JOIN grade_levels gl ON t.grade_level_id = gl.id WHERE t.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarTaxa = async (tenantId, id, dados) => {
  const permitidos = ['nome','categoria','valor','valor_variavel','periodicidade','grade_level_id','descricao','obrigatoria','activo','sujeito_iva']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE taxas SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(`SELECT t.*, gl.nome AS classe_nome FROM taxas t LEFT JOIN grade_levels gl ON t.grade_level_id = gl.id WHERE t.id = ?`, [id])
  return f.rows[0]
}

const desactivarTaxa = async (tenantId, id) => {
  await db.query('UPDATE taxas SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── COBRANÇAS ────────────────────────────────────────────────────────────────
const listarCobrancas = async (tenantId, { aluno_id, taxa_id, status, mes_referencia } = {}) => {
  await marcarCobrancasVencidas(tenantId)
  let where = 'c.escola_id = ?'
  const params = [tenantId]
  if (aluno_id) { where += ' AND c.aluno_id = ?'; params.push(aluno_id) }
  if (taxa_id) { where += ' AND c.taxa_id = ?'; params.push(taxa_id) }
  if (status) { where += ' AND c.status = ?'; params.push(status) }
  if (mes_referencia) { where += ' AND c.mes_referencia = ?'; params.push(mes_referencia) }
  const r = await db.query(
    `SELECT c.*, a.nome AS aluno_nome, a.numero_matricula, t.nome AS taxa_nome, cg.nome AS turma_nome
     FROM cobrancas c
     JOIN alunos a ON c.aluno_id = a.id
     LEFT JOIN taxas t ON c.taxa_id = t.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     WHERE ${where} ORDER BY c.data_vencimento ASC, c.criado_em DESC`, params
  )
  return r.rows
}

const criarCobranca = async (tenantId, dados) => {
  const { aluno_id, taxa_id, valor, mes_referencia, data_vencimento } = dados
  let valorFinal = fmt2(valor)
  if (!valorFinal && taxa_id) {
    const t = await db.query('SELECT valor FROM taxas WHERE id = ? AND escola_id = ?', [taxa_id, tenantId])
    valorFinal = fmt2(t.rows[0]?.valor || 0)
  }
  const r = await db.query(
    `INSERT INTO cobrancas (escola_id, aluno_id, taxa_id, valor, mes_referencia, data_vencimento) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, aluno_id, taxa_id || null, valorFinal, mes_referencia || null, data_vencimento || null]
  )
  // update conta
  await atualizarContaAlunoCobrado(tenantId, aluno_id, mes_referencia?.substring(0,4) || String(new Date().getFullYear()), valorFinal)
  const f = await db.query(`SELECT c.*, a.nome AS aluno_nome, t.nome AS taxa_nome FROM cobrancas c JOIN alunos a ON c.aluno_id = a.id LEFT JOIN taxas t ON c.taxa_id = t.id WHERE c.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

const gerarCobrancasTurma = async (tenantId, { class_group_id, taxa_id, mes_referencia, data_vencimento }) => {
  const alunos = await db.query(`SELECT id FROM alunos WHERE escola_id = ? AND class_group_id = ? AND status = 'activo'`, [tenantId, class_group_id])
  const taxa = await db.query('SELECT valor FROM taxas WHERE id = ? AND escola_id = ?', [taxa_id, tenantId])
  if (!taxa.rows[0]) throw new Error('Taxa não encontrada')
  const valor = fmt2(taxa.rows[0].valor)
  let criados = 0
  for (const a of alunos.rows) {
    const existe = await db.query("SELECT id FROM cobrancas WHERE aluno_id = ? AND taxa_id = ? AND mes_referencia = ? AND status != 'cancelado'", [a.id, taxa_id, mes_referencia])
    if (!existe.rows[0]) {
      await db.query('INSERT INTO cobrancas (escola_id, aluno_id, taxa_id, valor, mes_referencia, data_vencimento) VALUES (?,?,?,?,?,?)', [tenantId, a.id, taxa_id, valor, mes_referencia || null, data_vencimento || null])
      await atualizarContaAlunoCobrado(tenantId, a.id, mes_referencia?.substring(0,4) || String(new Date().getFullYear()), valor)
      criados++
    }
  }
  return { criados, total_alunos: alunos.rows.length }
}

// ─── PLANOS DE MENSALIDADES (geracao automatica e rigida de cobrancas) ────────
// Um plano por classe+ano lectivo. Gera "meses_cobrados" cobrancas (10 por
// omissao; a escola pode subir para 11 nas classes que tambem cobram o mes de
// exame) a partir de "mes_inicio", todas no mesmo "dia_vencimento" -- nunca
// datas escolhidas a mao cobranca a cobranca.
const listarPlanosPropinas = async (tenantId) => {
  const r = await db.query(
    `SELECT pp.*, gl.nome AS classe_nome, t.nome AS taxa_nome
     FROM planos_propinas pp
     LEFT JOIN grade_levels gl ON pp.grade_level_id = gl.id
     LEFT JOIN taxas t ON pp.taxa_id = t.id
     WHERE pp.escola_id = ?
     ORDER BY pp.ano_lectivo DESC, gl.nome ASC`,
    [tenantId]
  )
  return r.rows
}

const criarPlanoPropinas = async (tenantId, dados) => {
  const { nome, grade_level_id, ano_lectivo, taxa_id, meses_cobrados, mes_inicio, dia_vencimento } = dados
  if (!ano_lectivo) throw new Error('Ano lectivo é obrigatório')
  if (!grade_level_id) throw new Error('Classe é obrigatória')
  if (!taxa_id) throw new Error('Tipo de cobrança (propina) é obrigatório')

  const existe = await db.query(
    "SELECT id FROM planos_propinas WHERE escola_id = ? AND grade_level_id = ? AND ano_lectivo = ? AND activo = 1",
    [tenantId, grade_level_id, ano_lectivo]
  )
  if (existe.rows[0]) throw new Error('Já existe um plano de mensalidades activo para esta classe neste ano lectivo')

  const taxa = await db.query('SELECT valor, nome FROM taxas WHERE id = ? AND escola_id = ?', [taxa_id, tenantId])
  if (!taxa.rows[0]) throw new Error('Tipo de cobrança não encontrado')

  const meses = Number(meses_cobrados) === 11 ? 11 : 10
  const inicio = Number(mes_inicio) >= 1 && Number(mes_inicio) <= 12 ? Number(mes_inicio) : 1
  if (inicio + meses - 1 > 12) throw new Error('O plano ultrapassa Dezembro — reveja o mês de início ou o número de meses')

  const r = await db.query(
    `INSERT INTO planos_propinas (escola_id, nome, grade_level_id, ano_lectivo, taxa_id, valor, meses_cobrados, mes_inicio, dia_vencimento, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [tenantId, nome || taxa.rows[0].nome, grade_level_id, ano_lectivo, taxa_id, fmt2(taxa.rows[0].valor), meses, inicio, dia_vencimento || null]
  )
  const f = await db.query(
    `SELECT pp.*, gl.nome AS classe_nome, t.nome AS taxa_nome FROM planos_propinas pp
     LEFT JOIN grade_levels gl ON pp.grade_level_id = gl.id LEFT JOIN taxas t ON pp.taxa_id = t.id WHERE pp.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarPlanoPropinas = async (tenantId, id, dados) => {
  const atual = await db.query('SELECT * FROM planos_propinas WHERE id = ? AND escola_id = ?', [id, tenantId])
  if (!atual.rows[0]) throw new Error('Plano não encontrado')
  const p = atual.rows[0]
  const meses = dados.meses_cobrados !== undefined ? (Number(dados.meses_cobrados) === 11 ? 11 : 10) : p.meses_cobrados
  const inicio = dados.mes_inicio !== undefined ? Number(dados.mes_inicio) : p.mes_inicio
  if (inicio + meses - 1 > 12) throw new Error('O plano ultrapassa Dezembro — reveja o mês de início ou o número de meses')
  await db.query(
    `UPDATE planos_propinas SET nome = ?, meses_cobrados = ?, mes_inicio = ?, dia_vencimento = ?, activo = ?
     WHERE id = ? AND escola_id = ?`,
    [dados.nome ?? p.nome, meses, inicio, dados.dia_vencimento !== undefined ? (dados.dia_vencimento || null) : p.dia_vencimento,
     dados.activo !== undefined ? (dados.activo ? 1 : 0) : p.activo, id, tenantId]
  )
  const f = await db.query(
    `SELECT pp.*, gl.nome AS classe_nome, t.nome AS taxa_nome FROM planos_propinas pp
     LEFT JOIN grade_levels gl ON pp.grade_level_id = gl.id LEFT JOIN taxas t ON pp.taxa_id = t.id WHERE pp.id = ?`,
    [id]
  )
  return f.rows[0]
}

const _diaVencimentoDoPlano = async (tenantId, plano) => {
  if (plano.dia_vencimento) return plano.dia_vencimento
  const cfg = await obterConfiguracaoIva(tenantId)
  return cfg.dia_vencimento_mensalidade || 8
}

// Gera as cobrancas de UM aluno para um plano, a partir de "mesMinimo"
// (nunca meses anteriores -- ex: um aluno matriculado a meio do ano nao deve
// mensalidades de antes de entrar). Idempotente: nunca duplica uma cobranca
// ja existente para o mesmo aluno+taxa+mes.
const gerarCobrancasPlanoParaAluno = async (tenantId, plano, alunoId, mesMinimo = 1) => {
  const dia = Math.min(await _diaVencimentoDoPlano(tenantId, plano), 28) // evita erro em Fevereiro
  const fimMes = plano.mes_inicio + plano.meses_cobrados - 1
  const inicioReal = Math.max(plano.mes_inicio, mesMinimo)
  let criados = 0
  for (let mes = inicioReal; mes <= fimMes; mes++) {
    const mesRef = `${plano.ano_lectivo}-${String(mes).padStart(2, '0')}`
    const existe = await db.query(
      "SELECT id FROM cobrancas WHERE aluno_id = ? AND taxa_id = ? AND mes_referencia = ? AND status != 'cancelado'",
      [alunoId, plano.taxa_id, mesRef]
    )
    if (existe.rows[0]) continue
    const vencimento = `${plano.ano_lectivo}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    await db.query(
      'INSERT INTO cobrancas (escola_id, aluno_id, taxa_id, valor, mes_referencia, data_vencimento) VALUES (?,?,?,?,?,?)',
      [tenantId, alunoId, plano.taxa_id, plano.valor, mesRef, vencimento]
    )
    await atualizarContaAlunoCobrado(tenantId, alunoId, plano.ano_lectivo, plano.valor)
    criados++
  }
  return criados
}

// Backfill em lote: gera as cobrancas de todos os alunos ja matriculados na
// classe do plano (botao "Gerar Cobranças" na UI, usado ao activar um plano
// novo para alunos que ja estavam matriculados antes dele existir).
const gerarCobrancasDoPlano = async (tenantId, planoId) => {
  const p = await db.query('SELECT * FROM planos_propinas WHERE id = ? AND escola_id = ?', [planoId, tenantId])
  if (!p.rows[0]) throw new Error('Plano não encontrado')
  const plano = p.rows[0]
  if (!plano.activo) throw new Error('Plano está inactivo')

  const alunos = await db.query(
    `SELECT DISTINCT a.id FROM alunos a
     JOIN class_groups cg ON a.class_group_id = cg.id
     WHERE a.escola_id = ? AND cg.grade_level_id = ? AND a.status = 'activo' AND a.ano_lectivo = ?`,
    [tenantId, plano.grade_level_id, plano.ano_lectivo]
  )
  let totalCriadas = 0
  for (const a of alunos.rows) {
    totalCriadas += await gerarCobrancasPlanoParaAluno(tenantId, plano, a.id, plano.mes_inicio)
  }
  return { alunos: alunos.rows.length, cobrancas_criadas: totalCriadas }
}

// Chamado pela Secretaria ao matricular um aluno (ver secretaria.service.js:
// criarMatricula). Se ja existir um plano de mensalidades activo para a
// classe+ano lectivo, gera de imediato as cobrancas desse aluno a partir do
// mes corrente (nunca meses anteriores a matricula). Nunca lanca erro para o
// chamador -- a matricula em si nunca deve falhar por causa da parte
// financeira; sem plano configurado, simplesmente fica sem cobrancas
// automaticas (o Financeiro pode sempre gerar/lançar à mão depois).
const gerarCobrancasParaAluno = async (tenantId, alunoId, gradeLevelId, anoLectivo) => {
  try {
    if (!gradeLevelId || !anoLectivo) return
    const p = await db.query(
      "SELECT * FROM planos_propinas WHERE escola_id = ? AND grade_level_id = ? AND ano_lectivo = ? AND activo = 1",
      [tenantId, gradeLevelId, anoLectivo]
    )
    if (!p.rows[0]) return
    const mesAtual = new Date().getMonth() + 1
    await gerarCobrancasPlanoParaAluno(tenantId, p.rows[0], alunoId, mesAtual)
  } catch (err) {
    console.error('Erro ao gerar cobranças automáticas para aluno', alunoId, err.message)
  }
}

const cancelarCobranca = async (tenantId, id) => {
  await db.query("UPDATE cobrancas SET status = 'cancelado' WHERE id = ? AND escola_id = ?", [id, tenantId])
}

// Multa por atraso: decisao manual do Financeiro (se aplica e quanto). Nunca
// automatica -- fica ao criterio de quem gere as cobrancas, cobranca a cobranca.
const aplicarMulta = async (tenantId, userId, id, multaValor, motivo) => {
  const c = await db.query('SELECT id FROM cobrancas WHERE id = ? AND escola_id = ?', [id, tenantId])
  if (!c.rows.length) throw new Error('Cobrança não encontrada')
  await db.query(
    `UPDATE cobrancas SET multa_valor = ?, multa_motivo = ?, multa_aplicada_por = ?, multa_aplicada_em = NOW()
     WHERE id = ? AND escola_id = ?`,
    [fmt2(multaValor), motivo || null, userId, id, tenantId]
  )
  const f = await db.query(
    `SELECT c.*, a.nome AS aluno_nome, t.nome AS taxa_nome FROM cobrancas c JOIN alunos a ON c.aluno_id = a.id LEFT JOIN taxas t ON c.taxa_id = t.id WHERE c.id = ?`,
    [id]
  )
  return f.rows[0]
}

// ─── CONTAS DE ALUNOS ─────────────────────────────────────────────────────────
const listarContas = async (tenantId, { ano_lectivo } = {}) => {
  let where = 'ca.escola_id = ?'
  const params = [tenantId]
  if (ano_lectivo) { where += ' AND ca.ano_lectivo = ?'; params.push(ano_lectivo) }
  const r = await db.query(
    `SELECT ca.*,
            a.nome AS aluno_nome, a.numero_matricula, a.status AS aluno_status,
            cg.nome AS turma_nome, gl.nome AS classe_nome
     FROM contas_alunos ca
     JOIN alunos a ON ca.aluno_id = a.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     WHERE ${where}
     ORDER BY ca.saldo_devedor DESC, a.nome ASC`,
    params
  )
  return r.rows
}

const obterContaAluno = async (tenantId, alunoId, { ano_lectivo } = {}) => {
  const ano = ano_lectivo || String(new Date().getFullYear())
  const [conta, cobrancas, pagamentos] = await Promise.all([
    db.query(`SELECT ca.*, a.nome AS aluno_nome, a.numero_matricula FROM contas_alunos ca JOIN alunos a ON ca.aluno_id = a.id WHERE ca.escola_id = ? AND ca.aluno_id = ? AND ca.ano_lectivo = ?`, [tenantId, alunoId, ano]),
    db.query(`SELECT * FROM cobrancas WHERE escola_id = ? AND aluno_id = ? AND (mes_referencia LIKE ? OR mes_referencia IS NULL) ORDER BY mes_referencia ASC`, [tenantId, alunoId, `${ano}%`]),
    db.query(`SELECT p.*, t.nome AS taxa_nome FROM pagamentos p LEFT JOIN taxas t ON p.taxa_id = t.id WHERE p.escola_id = ? AND p.aluno_id = ? AND (p.mes_referencia LIKE ? OR p.mes_referencia IS NULL) ORDER BY p.criado_em DESC`, [tenantId, alunoId, `${ano}%`]),
  ])
  return {
    conta: conta.rows[0] || null,
    cobrancas: cobrancas.rows,
    pagamentos: pagamentos.rows,
  }
}

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────
const listarPagamentos = async (tenantId, { estado, aluno_id, mes_referencia } = {}) => {
  let where = 'p.escola_id = ?'
  const params = [tenantId]
  if (estado) {
    if (estado === 'confirmado') { where += " AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0"; }
    else if (estado === 'anulado') { where += ' AND p.anulado = 1' }
    else { where += ' AND p.estado = ?'; params.push(estado) }
  }
  if (aluno_id) { where += ' AND p.aluno_id = ?'; params.push(aluno_id) }
  if (mes_referencia) { where += ' AND p.mes_referencia = ?'; params.push(mes_referencia) }
  const r = await db.query(
    `SELECT p.*, a.nome AS aluno_nome, a.numero_matricula, t.nome AS taxa_nome,
            cg.nome AS turma_nome, u.nome AS aprovado_por_nome
     FROM pagamentos p
     JOIN alunos a ON p.aluno_id = a.id
     LEFT JOIN taxas t ON p.taxa_id = t.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN utilizadores u ON p.aprovado_por = u.id
     WHERE ${where}
     ORDER BY p.criado_em DESC`,
    params
  )
  return r.rows
}

const proximoNumeroRecibo = async (tenantId) => {
  const seq = await db.query("SELECT COUNT(*) AS n FROM pagamentos WHERE escola_id = ? AND estado IN ('confirmado','aprovado')", [tenantId])
  const num = String(Number(seq.rows[0].n) + 1).padStart(5, '0')
  const ano = new Date().getFullYear()
  return `REC-${ano}-${num}`
}

// Um pagamento registado pelo Financeiro ja e o dinheiro recebido -- fica
// confirmado de imediato, com recibo emitido no mesmo pedido. O antigo fluxo
// "pendente -> em analise -> confirmar" (ainda disponivel via
// moverParaAnalise/confirmarPagamento, para eventuais registos antigos) so
// gerava retrabalho: duas pessoas a validar o que a primeira ja tinha a
// certeza de ter recebido.
const registarPagamento = async (tenantId, userId, dados) => {
  const { aluno_id, taxa_id, valor, data_pagamento, metodo, referencia, numero_comprovativo, mes_referencia, observacoes, comprovativo_url } = dados
  let { cobranca_id } = dados
  if (!aluno_id || !valor) throw new Error('Aluno e valor são obrigatórios')
  if (!taxa_id) throw new Error('Tipo de cobrança é obrigatório')

  // Decomposição de IVA "congelada" no momento do registo -- nunca
  // recalculada depois, mesmo que a taxa ou a configuração da escola mudem.
  const [taxa, cfgIva] = await Promise.all([
    db.query('SELECT sujeito_iva FROM taxas WHERE id = ? AND escola_id = ?', [taxa_id, tenantId]),
    obterConfiguracaoIva(tenantId),
  ])
  const decomposicaoIva = iva.calcularIva({
    valor,
    sujeitoIva: taxa.rows[0]?.sujeito_iva,
    ivaActivo: cfgIva.iva_activo,
    taxaIva: cfgIva.taxa_iva,
  })

  // Ligação automática à cobrança em aberto -- não é preciso escolher à mão
  // qual cobrança este pagamento resolve, desde que aluno+taxa+mês
  // coincidam com uma cobrança pendente/vencida.
  if (!cobranca_id && mes_referencia) {
    const match = await db.query(
      "SELECT id FROM cobrancas WHERE escola_id = ? AND aluno_id = ? AND taxa_id = ? AND mes_referencia = ? AND status IN ('pendente','vencido')",
      [tenantId, aluno_id, taxa_id, mes_referencia]
    )
    if (match.rows[0]) cobranca_id = match.rows[0].id
  }

  const numero_recibo = await proximoNumeroRecibo(tenantId)

  const r = await db.query(
    `INSERT INTO pagamentos
      (escola_id, aluno_id, taxa_id, cobranca_id, valor, data_pagamento, metodo, referencia, numero_comprovativo, mes_referencia, observacoes, comprovativo_url, estado,
       numero_recibo, aprovado_por, aprovado_em, iva_aplicado, taxa_iva_aplicada, valor_base_tributavel, valor_iva)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', ?, ?, NOW(), ?, ?, ?, ?)`,
    [tenantId, aluno_id, taxa_id || null, cobranca_id || null, fmt2(valor), data_pagamento || null, metodo || 'Dinheiro', referencia || null, numero_comprovativo || null, mes_referencia || null, observacoes || null, comprovativo_url || null,
     numero_recibo, userId,
     decomposicaoIva.iva_aplicado, decomposicaoIva.taxa_iva_aplicada, decomposicaoIva.valor_base_tributavel, decomposicaoIva.valor_iva]
  )
  if (cobranca_id) {
    await db.query("UPDATE cobrancas SET status = 'pago' WHERE id = ? AND escola_id = ?", [cobranca_id, tenantId])
  }
  await db.query(
    `INSERT INTO contas_alunos (escola_id, aluno_id, ano_lectivo, total_pago)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (escola_id, aluno_id, ano_lectivo) DO UPDATE SET total_pago = contas_alunos.total_pago + EXCLUDED.total_pago`,
    [tenantId, aluno_id, mes_referencia?.substring(0,4) || String(new Date().getFullYear()), fmt2(valor)]
  )
  const f = await db.query(`SELECT p.*, a.nome AS aluno_nome, t.nome AS taxa_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id LEFT JOIN taxas t ON p.taxa_id = t.id WHERE p.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

// Anulação de um pagamento já confirmado (ex: registo enganado, valor
// errado) -- nunca apagado (mantém-se no histórico com o motivo), reverte
// contas_alunos.total_pago e reabre a cobrança associada para 'pendente' se
// esta ainda estiver 'pago' por causa deste pagamento. É a válvula de escape
// agora que o registo já não passa por uma fase pendente de aprovação.
const anularPagamento = async (tenantId, userId, id, motivo) => {
  const p = await db.query("SELECT * FROM pagamentos WHERE id = ? AND escola_id = ?", [id, tenantId])
  if (!p.rows.length) throw new Error('Pagamento não encontrado')
  const pag = p.rows[0]
  if (!['confirmado', 'aprovado'].includes(pag.estado)) throw new Error('Só é possível anular um pagamento confirmado')
  if (Number(pag.anulado)) throw new Error('Este pagamento já foi anulado')
  if (!motivo || !motivo.trim()) throw new Error('Indique o motivo da anulação')

  await db.query(
    `UPDATE pagamentos SET anulado = 1, anulado_motivo = ?, anulado_por = ?, anulado_em = NOW() WHERE id = ? AND escola_id = ?`,
    [motivo.trim(), userId, id, tenantId]
  )
  await db.query(
    `UPDATE contas_alunos SET total_pago = GREATEST(0, total_pago - ?) WHERE escola_id = ? AND aluno_id = ? AND ano_lectivo = ?`,
    [fmt2(pag.valor), tenantId, pag.aluno_id, pag.mes_referencia?.substring(0, 4) || String(new Date().getFullYear())]
  )
  if (pag.cobranca_id) {
    await db.query("UPDATE cobrancas SET status = 'pendente' WHERE id = ? AND escola_id = ? AND status = 'pago'", [pag.cobranca_id, tenantId])
  }
  const f = await db.query('SELECT p.*, a.nome AS aluno_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id WHERE p.id = ?', [id])
  return f.rows[0]
}

const moverParaAnalise = async (tenantId, userId, id) => {
  const p = await db.query("SELECT * FROM pagamentos WHERE id = ? AND escola_id = ?", [id, tenantId])
  if (!p.rows.length) throw new Error('Pagamento não encontrado')
  if (p.rows[0].estado !== 'pendente') throw new Error('Apenas pagamentos pendentes podem ser enviados para análise')
  await db.query(`UPDATE pagamentos SET estado = 'em_analise', analisado_por = ?, analisado_em = NOW() WHERE id = ? AND escola_id = ?`, [userId, id, tenantId])
  const f = await db.query('SELECT p.*, a.nome AS aluno_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id WHERE p.id = ?', [id])
  return f.rows[0]
}

const confirmarPagamento = async (tenantId, userId, id) => {
  const p = await db.query("SELECT * FROM pagamentos WHERE id = ? AND escola_id = ?", [id, tenantId])
  if (!p.rows.length) throw new Error('Pagamento não encontrado')
  if (!['pendente','em_analise'].includes(p.rows[0].estado)) throw new Error('Pagamento já foi processado')

  const seq = await db.query("SELECT COUNT(*) AS n FROM pagamentos WHERE escola_id = ? AND estado IN ('confirmado','aprovado')", [tenantId])
  const num = String(Number(seq.rows[0].n) + 1).padStart(5, '0')
  const ano = new Date().getFullYear()
  const numero_recibo = `REC-${ano}-${num}`

  await db.query(
    `UPDATE pagamentos SET estado = 'confirmado', numero_recibo = ?, aprovado_por = ?, aprovado_em = NOW()
     WHERE id = ? AND escola_id = ?`,
    [numero_recibo, userId, id, tenantId]
  )

  // update conta aluno
  await db.query(
    `INSERT INTO contas_alunos (escola_id, aluno_id, ano_lectivo, total_pago)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (escola_id, aluno_id, ano_lectivo) DO UPDATE SET total_pago = contas_alunos.total_pago + EXCLUDED.total_pago`,
    [tenantId, p.rows[0].aluno_id, p.rows[0].mes_referencia?.substring(0,4) || String(ano), fmt2(p.rows[0].valor)]
  )

  const f = await db.query('SELECT p.*, a.nome AS aluno_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id WHERE p.id = ?', [id])
  return f.rows[0]
}

const rejeitarPagamento = async (tenantId, id, motivo) => {
  const p = await db.query("SELECT estado FROM pagamentos WHERE id = ? AND escola_id = ?", [id, tenantId])
  if (!p.rows.length) throw new Error('Pagamento não encontrado')
  if (p.rows[0].estado === 'confirmado') throw new Error('Não é possível rejeitar um pagamento confirmado')
  await db.query(
    `UPDATE pagamentos SET estado = 'rejeitado', motivo_rejeicao = ? WHERE id = ? AND escola_id = ?`,
    [motivo || 'Sem motivo especificado', id, tenantId]
  )
  const f = await db.query('SELECT p.*, a.nome AS aluno_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id WHERE p.id = ?', [id])
  return f.rows[0]
}

// ─── RECIBOS ──────────────────────────────────────────────────────────────────
const listarRecibos = async (tenantId, { aluno_id, mes_referencia } = {}) => {
  let where = "p.escola_id = ? AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0"
  const params = [tenantId]
  if (aluno_id) { where += ' AND p.aluno_id = ?'; params.push(aluno_id) }
  if (mes_referencia) { where += ' AND p.mes_referencia = ?'; params.push(mes_referencia) }
  const r = await db.query(
    `SELECT p.*, a.nome AS aluno_nome, a.numero_matricula, t.nome AS taxa_nome,
            cg.nome AS turma_nome, u.nome AS aprovado_por_nome
     FROM pagamentos p
     JOIN alunos a ON p.aluno_id = a.id
     LEFT JOIN taxas t ON p.taxa_id = t.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN utilizadores u ON p.aprovado_por = u.id
     WHERE ${where}
     ORDER BY p.aprovado_em DESC`,
    params
  )
  return r.rows
}

const obterRecibo = async (tenantId, id) => {
  const r = await db.query(
    `SELECT p.*, a.nome AS aluno_nome, a.numero_matricula, t.nome AS taxa_nome,
            cg.nome AS turma_nome, gl.nome AS classe_nome,
            u.nome AS aprovado_por_nome
     FROM pagamentos p
     JOIN alunos a ON p.aluno_id = a.id
     LEFT JOIN taxas t ON p.taxa_id = t.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN utilizadores u ON p.aprovado_por = u.id
     WHERE p.id = ? AND p.escola_id = ? AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0`,
    [id, tenantId]
  )
  if (!r.rows.length) throw new Error('Recibo não encontrado')
  return r.rows[0]
}

// ─── DÍVIDAS ──────────────────────────────────────────────────────────────────
const listarDividas = async (tenantId) => {
  await marcarCobrancasVencidas(tenantId)
  const r = await db.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.numero_matricula, a.status AS aluno_status,
            cg.nome AS turma_nome, gl.nome AS classe_nome,
            COUNT(c.id) AS num_cobrancas,
            SUM(c.valor) AS total_divida,
            SUM(c.multa_valor) AS total_multas,
            SUM(c.valor + c.multa_valor) AS total_geral,
            MIN(c.data_vencimento) AS vencimento_mais_antigo,
            GREATEST(0, (CURRENT_DATE - MIN(c.data_vencimento))) AS dias_atraso,
            ARRAY_AGG(c.mes_referencia ORDER BY c.mes_referencia) FILTER (WHERE c.mes_referencia IS NOT NULL) AS meses_em_divida
     FROM cobrancas c
     JOIN alunos a ON c.aluno_id = a.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     WHERE c.escola_id = ? AND c.status IN ('pendente','vencido')
     GROUP BY a.id, a.nome, a.numero_matricula, a.status, cg.nome, gl.nome
     ORDER BY total_geral DESC`,
    [tenantId]
  )
  return r.rows
}

// ─── BOLSAS ───────────────────────────────────────────────────────────────────
const listarBolsas = async (tenantId, { aluno_id, status } = {}) => {
  let where = 'b.escola_id = ?'
  const params = [tenantId]
  if (aluno_id) { where += ' AND b.aluno_id = ?'; params.push(aluno_id) }
  if (status) { where += ' AND b.status = ?'; params.push(status) }
  const r = await db.query(
    `SELECT b.*, a.nome AS aluno_nome, a.numero_matricula, cg.nome AS turma_nome,
            u.nome AS aprovado_por_nome
     FROM bolsas b
     JOIN alunos a ON b.aluno_id = a.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN utilizadores u ON b.aprovado_por = u.id
     WHERE ${where}
     ORDER BY b.criado_em DESC`,
    params
  )
  return r.rows
}

const criarBolsa = async (tenantId, dados) => {
  const { aluno_id, tipo, desconto_pct, valor_fixo, motivo, ano_lectivo } = dados
  const r = await db.query(
    `INSERT INTO bolsas (escola_id, aluno_id, tipo, desconto_pct, valor_fixo, motivo, ano_lectivo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, aluno_id, tipo || 'parcial', desconto_pct || null, valor_fixo || null, motivo || null, ano_lectivo || null]
  )
  const f = await db.query(`SELECT b.*, a.nome AS aluno_nome FROM bolsas b JOIN alunos a ON b.aluno_id = a.id WHERE b.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

const decidirBolsa = async (tenantId, userId, id, decisao, motivo) => {
  if (!['aprovada','rejeitada'].includes(decisao)) throw new Error('Decisão inválida')
  await db.query(
    `UPDATE bolsas SET status = ?, aprovado_por = ?, aprovado_em = NOW() ${decisao === 'rejeitada' && motivo ? ', motivo = ?' : ''}
     WHERE id = ? AND escola_id = ?`,
    decisao === 'rejeitada' && motivo ? [decisao, userId, motivo, id, tenantId] : [decisao, userId, id, tenantId]
  )
  const f = await db.query(`SELECT b.*, a.nome AS aluno_nome FROM bolsas b JOIN alunos a ON b.aluno_id = a.id WHERE b.id = ?`, [id])
  return f.rows[0]
}

// ─── FECHO FINANCEIRO ─────────────────────────────────────────────────────────
const listarFechos = async (tenantId) => {
  const r = await db.query(`SELECT * FROM fechos_financeiros WHERE escola_id = ? ORDER BY mes_referencia DESC`, [tenantId])
  return r.rows
}

const realizarFecho = async (tenantId, userId, { mes_referencia, observacoes }) => {
  const existe = await db.query('SELECT id, status FROM fechos_financeiros WHERE escola_id = ? AND mes_referencia = ?', [tenantId, mes_referencia])
  if (existe.rows.length && existe.rows[0].status === 'fechado') throw new Error('Este mês já está fechado')
  await marcarCobrancasVencidas(tenantId)

  const [recebido, cobrado, divida, devedores, ivaApurado] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id = ? AND mes_referencia = ? AND estado IN ('confirmado','aprovado') AND anulado = 0`, [tenantId, mes_referencia]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM cobrancas WHERE escola_id = ? AND mes_referencia = ?`, [tenantId, mes_referencia]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM cobrancas WHERE escola_id = ? AND mes_referencia = ? AND status IN ('pendente','vencido')`, [tenantId, mes_referencia]),
    db.query(`SELECT COUNT(DISTINCT aluno_id) AS n FROM cobrancas WHERE escola_id = ? AND mes_referencia = ? AND status IN ('pendente','vencido')`, [tenantId, mes_referencia]),
    db.query(`SELECT COALESCE(SUM(valor_iva),0) AS total FROM pagamentos WHERE escola_id = ? AND mes_referencia = ? AND estado IN ('confirmado','aprovado') AND anulado = 0 AND iva_aplicado = 1`, [tenantId, mes_referencia]),
  ])

  const dados = {
    total_recebido: fmt2(recebido.rows[0].total),
    total_cobrado: fmt2(cobrado.rows[0].total),
    total_divida: fmt2(divida.rows[0].total),
    total_iva: fmt2(ivaApurado.rows[0].total),
    num_pagamentos: 0,
    num_devedores: devedores.rows[0].n,
    status: 'fechado',
    fechado_em: new Date(),
    fechado_por: userId,
    observacoes: observacoes || null,
  }

  await db.query(
    `INSERT INTO fechos_financeiros (escola_id, mes_referencia, total_recebido, total_cobrado, total_divida, total_iva, num_devedores, status, fechado_em, fechado_por, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'fechado', NOW(), ?, ?)
     ON CONFLICT (escola_id, mes_referencia) DO UPDATE SET total_recebido = EXCLUDED.total_recebido, total_cobrado = EXCLUDED.total_cobrado, total_divida = EXCLUDED.total_divida, total_iva = EXCLUDED.total_iva, status = 'fechado', fechado_em = NOW(), fechado_por = EXCLUDED.fechado_por`,
    [tenantId, mes_referencia, dados.total_recebido, dados.total_cobrado, dados.total_divida, dados.total_iva, dados.num_devedores, userId, dados.observacoes]
  )

  const f = await db.query('SELECT * FROM fechos_financeiros WHERE escola_id = ? AND mes_referencia = ?', [tenantId, mes_referencia])
  return f.rows[0]
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────
const obterRelatorio = async (tenantId, tipo, { mes_referencia, ano_lectivo } = {}) => {
  if (tipo === 'receita_mensal') {
    const r = await db.query(
      `SELECT mes_referencia, COALESCE(SUM(valor),0) AS total
       FROM pagamentos
       WHERE escola_id = ? AND estado IN ('confirmado','aprovado') AND anulado = 0 ${mes_referencia ? 'AND mes_referencia LIKE ?' : ''}
       GROUP BY mes_referencia ORDER BY mes_referencia ASC`,
      mes_referencia ? [tenantId, `${mes_referencia.substring(0,4)}%`] : [tenantId]
    )
    return r.rows
  }
  if (tipo === 'dividas_por_classe') {
    const r = await db.query(
      `SELECT gl.nome AS classe, COUNT(DISTINCT c.aluno_id) AS alunos, COALESCE(SUM(c.valor),0) AS total_divida
       FROM cobrancas c
       JOIN alunos a ON c.aluno_id = a.id
       LEFT JOIN class_groups cg ON a.class_group_id = cg.id
       LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
       WHERE c.escola_id = ? AND c.status IN ('pendente','vencido')
       GROUP BY gl.id, gl.nome ORDER BY total_divida DESC`,
      [tenantId]
    )
    return r.rows
  }
  if (tipo === 'pagantes_mes') {
    const r = await db.query(
      `SELECT a.nome AS aluno, a.numero_matricula, cg.nome AS turma,
              SUM(p.valor) AS total_pago, COUNT(p.id) AS num_pagamentos
       FROM pagamentos p
       JOIN alunos a ON p.aluno_id = a.id
       LEFT JOIN class_groups cg ON a.class_group_id = cg.id
       WHERE p.escola_id = ? AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0 ${mes_referencia ? 'AND p.mes_referencia = ?' : ''}
       GROUP BY a.id, a.nome, a.numero_matricula, cg.nome ORDER BY total_pago DESC`,
      mes_referencia ? [tenantId, mes_referencia] : [tenantId]
    )
    return r.rows
  }
  if (tipo === 'inadimplentes') {
    const r = await db.query(
      `SELECT a.nome AS aluno, a.numero_matricula, cg.nome AS turma, gl.nome AS classe,
              COUNT(c.id) AS meses_divida, SUM(c.valor) AS total_divida
       FROM cobrancas c
       JOIN alunos a ON c.aluno_id = a.id
       LEFT JOIN class_groups cg ON a.class_group_id = cg.id
       LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
       WHERE c.escola_id = ? AND c.status IN ('pendente','vencido')
       GROUP BY a.id, a.nome, a.numero_matricula, cg.nome, gl.nome ORDER BY total_divida DESC`,
      [tenantId]
    )
    return r.rows
  }
  if (tipo === 'receita_por_categoria') {
    const r = await db.query(
      `SELECT t.categoria,
              COALESCE(SUM(p.valor),0) AS total_recebido,
              COUNT(p.id) AS num_pagamentos
       FROM pagamentos p
       JOIN taxas t ON p.taxa_id = t.id
       WHERE p.escola_id = ? AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0
       ${mes_referencia ? 'AND p.mes_referencia LIKE ?' : ''}
       GROUP BY t.categoria ORDER BY total_recebido DESC`,
      mes_referencia ? [tenantId, `${mes_referencia.substring(0,4)}%`] : [tenantId]
    )
    return r.rows
  }
  if (tipo === 'receita_por_tipo') {
    const r = await db.query(
      `SELECT t.nome AS tipo_cobranca, t.categoria,
              COALESCE(SUM(p.valor),0) AS total_recebido,
              COUNT(p.id) AS num_pagamentos
       FROM pagamentos p
       JOIN taxas t ON p.taxa_id = t.id
       WHERE p.escola_id = ? AND p.estado IN ('confirmado','aprovado') AND p.anulado = 0
       ${mes_referencia ? 'AND p.mes_referencia LIKE ?' : ''}
       GROUP BY t.id, t.nome, t.categoria ORDER BY total_recebido DESC`,
      mes_referencia ? [tenantId, `${mes_referencia.substring(0,4)}%`] : [tenantId]
    )
    return r.rows
  }
  if (tipo === 'pendentes_por_categoria') {
    const r = await db.query(
      `SELECT t.categoria,
              COUNT(c.id) AS num_cobrancas,
              COUNT(DISTINCT c.aluno_id) AS num_alunos,
              COALESCE(SUM(c.valor),0) AS total_pendente
       FROM cobrancas c
       LEFT JOIN taxas t ON c.taxa_id = t.id
       WHERE c.escola_id = ? AND c.status IN ('pendente','vencido')
       GROUP BY t.categoria ORDER BY total_pendente DESC`,
      [tenantId]
    )
    return r.rows
  }
  if (tipo === 'resumo_anual') {
    const r = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN valor ELSE 0 END),0) AS total_recebido,
         SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN 1 ELSE 0 END) AS pagamentos_confirmados,
         SUM(CASE WHEN estado = 'pendente' THEN 1 ELSE 0 END) AS pagamentos_pendentes,
         SUM(CASE WHEN estado = 'rejeitado' THEN 1 ELSE 0 END) AS pagamentos_rejeitados,
         COUNT(DISTINCT aluno_id) AS alunos_pagantes
       FROM pagamentos WHERE escola_id = ?`,
      [tenantId]
    )
    const d = await db.query(
      `SELECT COALESCE(SUM(valor),0) AS total_divida, COUNT(DISTINCT aluno_id) AS inadimplentes
       FROM cobrancas WHERE escola_id = ? AND status IN ('pendente','vencido')`,
      [tenantId]
    )
    return [{ ...r.rows[0], ...d.rows[0] }]
  }
  // IVA arrecadado por mês -- só considera pagamentos confirmados com
  // iva_aplicado=1 (snapshot gravado em registarPagamento). Mesmo padrão de
  // agrupamento/filtro por ano de "receita_mensal".
  if (tipo === 'iva_apurado') {
    const r = await db.query(
      `SELECT mes_referencia,
              COUNT(*) FILTER (WHERE iva_aplicado = 1) AS num_pagamentos,
              COALESCE(SUM(CASE WHEN iva_aplicado = 1 THEN valor_base_tributavel ELSE 0 END), 0) AS total_base,
              COALESCE(SUM(CASE WHEN iva_aplicado = 1 THEN valor_iva ELSE 0 END), 0) AS total_iva,
              COALESCE(SUM(CASE WHEN iva_aplicado = 1 THEN valor ELSE 0 END), 0) AS total_bruto
       FROM pagamentos
       WHERE escola_id = ? AND estado IN ('confirmado','aprovado') AND anulado = 0 ${mes_referencia ? 'AND mes_referencia LIKE ?' : ''}
       GROUP BY mes_referencia ORDER BY mes_referencia ASC`,
      mes_referencia ? [tenantId, `${mes_referencia.substring(0,4)}%`] : [tenantId]
    )
    return r.rows
  }
  // Situacao de cada aluno num mes concreto: pagou, esta pendente/vencido (com
  // dias de atraso) ou nem sequer tem cobranca gerada nesse mes -- para dar ao
  // Financeiro controlo claro de quem pagou e quem nao pagou por mes.
  if (tipo === 'situacao_mensal') {
    const mes = mes_referencia || new Date().toISOString().substring(0, 7)
    const r = await db.query(
      `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.numero_matricula,
              cg.nome AS turma_nome, gl.nome AS classe_nome,
              c.id AS cobranca_id, c.valor, c.multa_valor, c.status AS cobranca_status,
              c.data_vencimento, t.nome AS taxa_nome,
              CASE WHEN c.status IN ('pendente','vencido') AND c.data_vencimento IS NOT NULL AND c.data_vencimento < CURRENT_DATE
                   THEN (CURRENT_DATE - c.data_vencimento) ELSE 0 END AS dias_atraso
       FROM alunos a
       LEFT JOIN class_groups cg ON a.class_group_id = cg.id
       LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
       LEFT JOIN cobrancas c ON c.aluno_id = a.id AND c.escola_id = a.escola_id
         AND c.mes_referencia = ? AND c.status != 'cancelado'
       LEFT JOIN taxas t ON c.taxa_id = t.id
       WHERE a.escola_id = ? AND a.status = 'activo'
       ORDER BY dias_atraso DESC, a.nome ASC`,
      [mes, tenantId]
    )
    return r.rows
  }
  return []
}

module.exports = {
  obterStats,
  obterConfiguracaoIva, atualizarConfiguracaoIva, atualizarDiaVencimentoPadrao,
  listarTaxas, criarTaxa, atualizarTaxa, desactivarTaxa,
  listarCobrancas, criarCobranca, gerarCobrancasTurma, cancelarCobranca, aplicarMulta,
  listarContas, obterContaAluno,
  listarPagamentos, registarPagamento, moverParaAnalise, confirmarPagamento, rejeitarPagamento, anularPagamento,
  listarRecibos, obterRecibo,
  listarDividas,
  listarBolsas, criarBolsa, decidirBolsa,
  listarFechos, realizarFecho,
  obterRelatorio,
  listarPlanosPropinas, criarPlanoPropinas, atualizarPlanoPropinas, gerarCobrancasDoPlano, gerarCobrancasParaAluno,
  marcarCobrancasVencidas,
}
