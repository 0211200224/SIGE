const db = require('../../config/database')

const fmt2 = (v) => parseFloat(parseFloat(v || 0).toFixed(2))

// ─── STATS / RESUMO ───────────────────────────────────────────────────────────
const obterStats = async (tenantId) => {
  const [pg, cb, bolsas, fechos] = await Promise.all([
    db.query(`SELECT
       SUM(CASE WHEN estado IN ('pendente') THEN 1 ELSE 0 END) AS pendentes,
       SUM(CASE WHEN estado = 'em_analise' THEN 1 ELSE 0 END) AS em_analise,
       SUM(CASE WHEN estado IN ('confirmado','aprovado') THEN 1 ELSE 0 END) AS confirmados,
       SUM(CASE WHEN estado = 'rejeitado' THEN 1 ELSE 0 END) AS rejeitados,
       COALESCE(SUM(CASE WHEN estado IN ('confirmado','aprovado') THEN valor ELSE 0 END), 0) AS total_recebido
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

// ─── PLANOS DE PROPINAS ───────────────────────────────────────────────────────
const listarPlanos = async (tenantId) => {
  const r = await db.query(
    `SELECT p.*, gl.nome AS classe_nome
     FROM planos_propinas p
     LEFT JOIN grade_levels gl ON p.grade_level_id = gl.id
     WHERE p.escola_id = ? AND p.activo = 1
     ORDER BY p.ano_lectivo DESC, gl.ordem ASC, p.nome ASC`,
    [tenantId]
  )
  return r.rows
}

const criarPlano = async (tenantId, dados) => {
  const { nome, grade_level_id, curso, ano_lectivo, valor, periodicidade, meses_cobrados, descricao } = dados
  const r = await db.query(
    `INSERT INTO planos_propinas (escola_id, nome, grade_level_id, curso, ano_lectivo, valor, periodicidade, meses_cobrados, descricao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, grade_level_id || null, curso || null, ano_lectivo, fmt2(valor), periodicidade || 'mensal', meses_cobrados || 10, descricao || null]
  )
  const f = await db.query(`SELECT p.*, gl.nome AS classe_nome FROM planos_propinas p LEFT JOIN grade_levels gl ON p.grade_level_id = gl.id WHERE p.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarPlano = async (tenantId, id, dados) => {
  const permitidos = ['nome','grade_level_id','curso','ano_lectivo','valor','periodicidade','meses_cobrados','descricao','activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE planos_propinas SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(`SELECT p.*, gl.nome AS classe_nome FROM planos_propinas p LEFT JOIN grade_levels gl ON p.grade_level_id = gl.id WHERE p.id = ?`, [id])
  return f.rows[0]
}

const gerarCobrancasPlano = async (tenantId, { plano_id, mes_referencia, data_vencimento }) => {
  const plano = await db.query('SELECT * FROM planos_propinas WHERE id = ? AND escola_id = ?', [plano_id, tenantId])
  if (!plano.rows.length) throw new Error('Plano não encontrado')
  const p = plano.rows[0]

  const alunos = await db.query(
    `SELECT a.id FROM alunos a
     JOIN aluno_matriculas am ON am.aluno_id = a.id AND am.status = 'matriculado'
     JOIN class_groups cg ON am.class_group_id = cg.id
     WHERE a.escola_id = ? AND a.status = 'activo'
     ${p.grade_level_id ? 'AND cg.grade_level_id = ?' : ''}`,
    p.grade_level_id ? [tenantId, p.grade_level_id] : [tenantId]
  )

  let criados = 0, ignorados = 0
  for (const a of alunos.rows) {
    const existe = await db.query(
      'SELECT id FROM cobrancas WHERE aluno_id = ? AND mes_referencia = ? AND status != "cancelado"',
      [a.id, mes_referencia]
    )
    if (existe.rows.length) { ignorados++; continue }
    await db.query(
      'INSERT INTO cobrancas (escola_id, aluno_id, taxa_id, valor, mes_referencia, data_vencimento) VALUES (?,?,?,?,?,?)',
      [tenantId, a.id, null, p.valor, mes_referencia, data_vencimento || null]
    )
    // update conta aluno
    await db.query(
      `INSERT INTO contas_alunos (escola_id, aluno_id, ano_lectivo, total_cobrado)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_cobrado = total_cobrado + VALUES(total_cobrado)`,
      [tenantId, a.id, mes_referencia?.substring(0,4) || new Date().getFullYear(), p.valor]
    )
    criados++
  }
  return { criados, ignorados, total_alunos: alunos.rows.length }
}

// ─── TAXAS (compatibilidade + planos simples) ─────────────────────────────────
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
  const { nome, valor, periodicidade, grade_level_id, descricao, obrigatoria } = dados
  const r = await db.query(
    `INSERT INTO taxas (escola_id, nome, valor, periodicidade, grade_level_id, descricao, obrigatoria, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [tenantId, nome, fmt2(valor), periodicidade || 'mensal', grade_level_id || null, descricao || null, obrigatoria ? 1 : 0]
  )
  const f = await db.query(`SELECT t.*, gl.nome AS classe_nome FROM taxas t LEFT JOIN grade_levels gl ON t.grade_level_id = gl.id WHERE t.id = ?`, [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarTaxa = async (tenantId, id, dados) => {
  const permitidos = ['nome','valor','periodicidade','grade_level_id','descricao','obrigatoria','activo']
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
  if (valorFinal > 0) {
    await db.query(
      `INSERT INTO contas_alunos (escola_id, aluno_id, ano_lectivo, total_cobrado)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_cobrado = total_cobrado + VALUES(total_cobrado)`,
      [tenantId, aluno_id, mes_referencia?.substring(0,4) || String(new Date().getFullYear()), valorFinal]
    )
  }
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
    const existe = await db.query('SELECT id FROM cobrancas WHERE aluno_id = ? AND taxa_id = ? AND mes_referencia = ? AND status != "cancelado"', [a.id, taxa_id, mes_referencia])
    if (!existe.rows[0]) {
      await db.query('INSERT INTO cobrancas (escola_id, aluno_id, taxa_id, valor, mes_referencia, data_vencimento) VALUES (?,?,?,?,?,?)', [tenantId, a.id, taxa_id, valor, mes_referencia || null, data_vencimento || null])
      criados++
    }
  }
  return { criados, total_alunos: alunos.rows.length }
}

const cancelarCobranca = async (tenantId, id) => {
  await db.query("UPDATE cobrancas SET status = 'cancelado' WHERE id = ? AND escola_id = ?", [id, tenantId])
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
    if (estado === 'confirmado') { where += " AND p.estado IN ('confirmado','aprovado')"; }
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

const registarPagamento = async (tenantId, userId, dados) => {
  const { aluno_id, taxa_id, cobranca_id, valor, data_pagamento, metodo, referencia, mes_referencia, observacoes, comprovativo_url } = dados
  if (!aluno_id || !valor) throw new Error('Aluno e valor são obrigatórios')
  const r = await db.query(
    `INSERT INTO pagamentos (escola_id, aluno_id, taxa_id, valor, data_pagamento, metodo, referencia, mes_referencia, observacoes, comprovativo_url, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [tenantId, aluno_id, taxa_id || null, fmt2(valor), data_pagamento || null, metodo || 'Dinheiro', referencia || null, mes_referencia || null, observacoes || null, comprovativo_url || null]
  )
  if (cobranca_id) {
    await db.query("UPDATE cobrancas SET status = 'pago' WHERE id = ? AND escola_id = ?", [cobranca_id, tenantId])
  }
  const f = await db.query(`SELECT p.*, a.nome AS aluno_nome, t.nome AS taxa_nome FROM pagamentos p JOIN alunos a ON p.aluno_id = a.id LEFT JOIN taxas t ON p.taxa_id = t.id WHERE p.id = ?`, [r.rows[0].insertId])
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
     ON DUPLICATE KEY UPDATE total_pago = total_pago + VALUES(total_pago)`,
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
  let where = "p.escola_id = ? AND p.estado IN ('confirmado','aprovado')"
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
     WHERE p.id = ? AND p.escola_id = ? AND p.estado IN ('confirmado','aprovado')`,
    [id, tenantId]
  )
  if (!r.rows.length) throw new Error('Recibo não encontrado')
  return r.rows[0]
}

// ─── DÍVIDAS ──────────────────────────────────────────────────────────────────
const listarDividas = async (tenantId) => {
  const r = await db.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.numero_matricula, a.status AS aluno_status,
            cg.nome AS turma_nome, gl.nome AS classe_nome,
            COUNT(c.id) AS num_cobrancas,
            SUM(c.valor) AS total_divida,
            MIN(c.data_vencimento) AS vencimento_mais_antigo
     FROM cobrancas c
     JOIN alunos a ON c.aluno_id = a.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     WHERE c.escola_id = ? AND c.status IN ('pendente','vencido')
     GROUP BY a.id, a.nome, a.numero_matricula, a.status, cg.nome, gl.nome
     ORDER BY total_divida DESC`,
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

  const [recebido, cobrado, divida, devedores] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id = ? AND mes_referencia = ? AND estado IN ('confirmado','aprovado')`, [tenantId, mes_referencia]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM cobrancas WHERE escola_id = ? AND mes_referencia = ?`, [tenantId, mes_referencia]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM cobrancas WHERE escola_id = ? AND mes_referencia = ? AND status IN ('pendente','vencido')`, [tenantId, mes_referencia]),
    db.query(`SELECT COUNT(DISTINCT aluno_id) AS n FROM cobrancas WHERE escola_id = ? AND mes_referencia = ? AND status IN ('pendente','vencido')`, [tenantId, mes_referencia]),
  ])

  const dados = {
    total_recebido: fmt2(recebido.rows[0].total),
    total_cobrado: fmt2(cobrado.rows[0].total),
    total_divida: fmt2(divida.rows[0].total),
    num_pagamentos: 0,
    num_devedores: devedores.rows[0].n,
    status: 'fechado',
    fechado_em: new Date(),
    fechado_por: userId,
    observacoes: observacoes || null,
  }

  await db.query(
    `INSERT INTO fechos_financeiros (escola_id, mes_referencia, total_recebido, total_cobrado, total_divida, num_devedores, status, fechado_em, fechado_por, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, 'fechado', NOW(), ?, ?)
     ON DUPLICATE KEY UPDATE total_recebido = VALUES(total_recebido), total_cobrado = VALUES(total_cobrado), total_divida = VALUES(total_divida), status = 'fechado', fechado_em = NOW(), fechado_por = VALUES(fechado_por)`,
    [tenantId, mes_referencia, dados.total_recebido, dados.total_cobrado, dados.total_divida, dados.num_devedores, userId, dados.observacoes]
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
       WHERE escola_id = ? AND estado IN ('confirmado','aprovado') ${mes_referencia ? 'AND mes_referencia LIKE ?' : ''}
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
       WHERE p.escola_id = ? AND p.estado IN ('confirmado','aprovado') ${mes_referencia ? 'AND p.mes_referencia = ?' : ''}
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
  if (tipo === 'resumo_anual') {
    const r = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN estado IN ('confirmado','aprovado') THEN valor ELSE 0 END),0) AS total_recebido,
         SUM(CASE WHEN estado IN ('confirmado','aprovado') THEN 1 ELSE 0 END) AS pagamentos_confirmados,
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
  return []
}

module.exports = {
  obterStats,
  listarPlanos, criarPlano, atualizarPlano, gerarCobrancasPlano,
  listarTaxas, criarTaxa, atualizarTaxa, desactivarTaxa,
  listarCobrancas, criarCobranca, gerarCobrancasTurma, cancelarCobranca,
  listarContas, obterContaAluno,
  listarPagamentos, registarPagamento, moverParaAnalise, confirmarPagamento, rejeitarPagamento,
  listarRecibos, obterRecibo,
  listarDividas,
  listarBolsas, criarBolsa, decidirBolsa,
  listarFechos, realizarFecho,
  obterRelatorio,
}
