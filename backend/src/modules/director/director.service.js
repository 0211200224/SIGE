const db = require('../../config/database')

// ── Dashboard Executivo ─────────────────────────────────────────────────────

const dashboardExecutivo = async (tenantId) => {
  const [
    alunosTotal, alunosTurma, taxaAprovacao, frequenciaMedia, alunosRisco,
    finReceita, finPendente, finDividas, finInadimplencia,
    rhAtivos, rhContratos, rhFaltas,
    matriculas, transferencias, utilizadores,
  ] = await Promise.all([
    // Académicos
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id = ?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM turmas WHERE escola_id = ?', [tenantId]),
    db.query(`
      SELECT
        ROUND(
          SUM(CASE WHEN n.valor >= COALESCE(pa.nota_minima_aprovacao, 10) THEN 1 ELSE 0 END)
          * 100.0 / NULLIF(COUNT(DISTINCT n.aluno_id), 0), 1
        ) AS taxa
      FROM notas n
      LEFT JOIN politicas_academicas pa ON pa.escola_id = n.escola_id
      WHERE n.escola_id = ? AND n.tipo = 'trimestral'
    `, [tenantId]),
    db.query(`
      SELECT ROUND(
        SUM(CASE WHEN p.presente = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(p.id), 0), 1
      ) AS media
      FROM presencas p WHERE p.escola_id = ?
    `, [tenantId]),
    db.query(`
      SELECT COUNT(DISTINCT a.id) AS total
      FROM alunos a
      JOIN presencas p ON a.id = p.aluno_id AND a.escola_id = p.escola_id
      LEFT JOIN politicas_academicas pa ON pa.escola_id = a.escola_id
      WHERE a.escola_id = ?
      GROUP BY a.id
      HAVING ROUND(SUM(CASE WHEN p.presente=1 THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(p.id),0),1)
             < COALESCE(MAX(pa.frequencia_minima), 75)
    `, [tenantId]),

    // Financeiros
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=? AND estado='aprovado'`, [tenantId]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=? AND estado='pendente'`, [tenantId]),
    db.query(`SELECT COUNT(DISTINCT aluno_id) AS total FROM pagamentos WHERE escola_id=? AND estado='pendente'`, [tenantId]),
    db.query(`
      SELECT COUNT(DISTINCT a.id) AS total
      FROM alunos a
      WHERE a.escola_id = ?
        AND (SELECT COALESCE(SUM(p.valor),0) FROM pagamentos p WHERE p.aluno_id=a.id AND p.estado='pendente') > 0
    `, [tenantId]),

    // RH
    db.query(`SELECT COUNT(*) AS total FROM funcionarios WHERE escola_id=? AND estado='activo'`, [tenantId]),
    db.query(`
      SELECT COUNT(*) AS total FROM contratos c
      JOIN funcionarios f ON c.funcionario_id = f.id AND f.escola_id = ?
      WHERE c.data_fim IS NOT NULL AND c.data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `, [tenantId]),
    db.query(`
      SELECT COUNT(*) AS total FROM faltas_rh fa
      JOIN funcionarios f ON fa.funcionario_id = f.id AND f.escola_id = ?
      WHERE fa.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [tenantId]),

    // Administrativos
    db.query(`SELECT COUNT(*) AS total FROM aluno_matriculas WHERE escola_id=?`, [tenantId]),
    db.query(`SELECT COUNT(*) AS total FROM transferencias WHERE escola_id=?`, [tenantId]),
    db.query(`SELECT COUNT(*) AS total FROM utilizadores WHERE escola_id=? AND activo=1`, [tenantId]),
  ])

  return {
    academicos: {
      total_alunos: parseInt(alunosTotal.rows[0].total),
      total_turmas: parseInt(alunosTurma.rows[0].total),
      taxa_aprovacao: parseFloat(taxaAprovacao.rows[0].taxa) || 0,
      taxa_reprovacao: 100 - (parseFloat(taxaAprovacao.rows[0].taxa) || 0),
      frequencia_media: parseFloat(frequenciaMedia.rows[0].media) || 0,
      alunos_risco: parseInt(alunosRisco.rows[0]?.total) || 0,
    },
    financeiros: {
      receita: parseFloat(finReceita.rows[0].total) || 0,
      pendente: parseFloat(finPendente.rows[0].total) || 0,
      dividas: parseInt(finDividas.rows[0].total) || 0,
      inadimplentes: parseInt(finInadimplencia.rows[0].total) || 0,
    },
    rh: {
      funcionarios_ativos: parseInt(rhAtivos.rows[0].total),
      contratos_vencer: parseInt(rhContratos.rows[0].total),
      faltas_mes: parseInt(rhFaltas.rows[0].total),
    },
    administrativos: {
      matriculas: parseInt(matriculas.rows[0].total),
      transferencias: parseInt(transferencias.rows[0].total),
      utilizadores_ativos: parseInt(utilizadores.rows[0].total),
    },
  }
}

// ── Utilizadores ────────────────────────────────────────────────────────────

const listarUtilizadores = async (tenantId, filters = {}) => {
  const { role, activo, search } = filters
  let sql = `
    SELECT u.id, u.nome, u.email, u.role, u.activo, u.criado_em,
           f.departamento, f.cargo
    FROM utilizadores u
    LEFT JOIN funcionarios f ON f.email = u.email AND f.escola_id = u.escola_id
    WHERE u.escola_id = ? AND u.role != 'super_admin'
  `
  const params = [tenantId]
  if (role) { sql += ' AND u.role = ?'; params.push(role) }
  if (activo !== undefined && activo !== '') { sql += ' AND u.activo = ?'; params.push(activo === 'true' || activo === '1' ? 1 : 0) }
  if (search) { sql += ' AND (u.nome LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY u.activo DESC, u.nome ASC'
  const result = await db.query(sql, params)
  return result.rows
}

const atualizarEstadoUtilizador = async (tenantId, id, activo) => {
  await db.query(
    'UPDATE utilizadores SET activo = ? WHERE id = ? AND escola_id = ? AND role != "super_admin"',
    [activo ? 1 : 0, id, tenantId]
  )
}

const atualizarRoleUtilizador = async (tenantId, id, role) => {
  const rolesValidos = ['director', 'secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']
  if (!rolesValidos.includes(role)) throw { status: 400, message: 'Role inválido' }
  await db.query(
    'UPDATE utilizadores SET role = ? WHERE id = ? AND escola_id = ? AND role != "super_admin"',
    [role, id, tenantId]
  )
}

// ── Políticas ───────────────────────────────────────────────────────────────

const obterPoliticasAcademicas = async (tenantId) => {
  const r = await db.query('SELECT * FROM politicas_academicas WHERE escola_id = ?', [tenantId])
  return r.rows[0] || { escola_id: tenantId, nota_minima_aprovacao: 10, frequencia_minima: 75, escala_max: 20 }
}

const salvarPoliticasAcademicas = async (tenantId, dados) => {
  const existing = await db.query('SELECT id FROM politicas_academicas WHERE escola_id = ?', [tenantId])
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE politicas_academicas SET
        nota_minima_aprovacao=?, frequencia_minima=?, escala_max=?,
        nota_exame_minima=?, permite_recurso=?, nota_minima_recurso=?,
        criterio_aprovacao=?, criterio_reprovacao=?, regras_exame=?, regras_recuperacao=?
       WHERE escola_id=?`,
      [dados.nota_minima_aprovacao, dados.frequencia_minima, dados.escala_max,
       dados.nota_exame_minima, dados.permite_recurso ? 1 : 0, dados.nota_minima_recurso,
       dados.criterio_aprovacao, dados.criterio_reprovacao, dados.regras_exame, dados.regras_recuperacao,
       tenantId]
    )
  } else {
    await db.query(
      `INSERT INTO politicas_academicas
        (escola_id, nota_minima_aprovacao, frequencia_minima, escala_max,
         nota_exame_minima, permite_recurso, nota_minima_recurso,
         criterio_aprovacao, criterio_reprovacao, regras_exame, regras_recuperacao)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, dados.nota_minima_aprovacao, dados.frequencia_minima, dados.escala_max,
       dados.nota_exame_minima, dados.permite_recurso ? 1 : 0, dados.nota_minima_recurso,
       dados.criterio_aprovacao, dados.criterio_reprovacao, dados.regras_exame, dados.regras_recuperacao]
    )
  }
}

const obterPoliticasFinanceiras = async (tenantId) => {
  const r = await db.query('SELECT * FROM politicas_financeiras WHERE escola_id = ?', [tenantId])
  return r.rows[0] || { escola_id: tenantId, dias_tolerancia_pagamento: 5, percentagem_multa: 2, max_desconto_percentagem: 20 }
}

const salvarPoliticasFinanceiras = async (tenantId, dados) => {
  const existing = await db.query('SELECT id FROM politicas_financeiras WHERE escola_id = ?', [tenantId])
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE politicas_financeiras SET
        dias_tolerancia_pagamento=?, percentagem_multa=?, max_desconto_percentagem=?,
        max_bolsa_percentagem=?, regras_inadimplencia=?, politica_descontos=?,
        politica_bolsas=?, regras_cobranca=?, bloquear_acesso_divida=?
       WHERE escola_id=?`,
      [dados.dias_tolerancia_pagamento, dados.percentagem_multa, dados.max_desconto_percentagem,
       dados.max_bolsa_percentagem, dados.regras_inadimplencia, dados.politica_descontos,
       dados.politica_bolsas, dados.regras_cobranca, dados.bloquear_acesso_divida ? 1 : 0,
       tenantId]
    )
  } else {
    await db.query(
      `INSERT INTO politicas_financeiras
        (escola_id, dias_tolerancia_pagamento, percentagem_multa, max_desconto_percentagem,
         max_bolsa_percentagem, regras_inadimplencia, politica_descontos, politica_bolsas,
         regras_cobranca, bloquear_acesso_divida)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, dados.dias_tolerancia_pagamento, dados.percentagem_multa, dados.max_desconto_percentagem,
       dados.max_bolsa_percentagem, dados.regras_inadimplencia, dados.politica_descontos,
       dados.politica_bolsas, dados.regras_cobranca, dados.bloquear_acesso_divida ? 1 : 0]
    )
  }
}

const obterPoliticasAdministrativas = async (tenantId) => {
  const r = await db.query('SELECT * FROM politicas_administrativas WHERE escola_id = ?', [tenantId])
  return r.rows[0] || { escola_id: tenantId }
}

const salvarPoliticasAdministrativas = async (tenantId, dados) => {
  const existing = await db.query('SELECT id FROM politicas_administrativas WHERE escola_id = ?', [tenantId])
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE politicas_administrativas SET
        horario_abertura=?, horario_encerramento=?, dias_funcionamento=?,
        missao=?, visao=?, valores=?, regras_internas=?, politicas_gerais=?
       WHERE escola_id=?`,
      [dados.horario_abertura, dados.horario_encerramento, dados.dias_funcionamento,
       dados.missao, dados.visao, dados.valores, dados.regras_internas, dados.politicas_gerais,
       tenantId]
    )
  } else {
    await db.query(
      `INSERT INTO politicas_administrativas
        (escola_id, horario_abertura, horario_encerramento, dias_funcionamento,
         missao, visao, valores, regras_internas, politicas_gerais)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [tenantId, dados.horario_abertura, dados.horario_encerramento, dados.dias_funcionamento,
       dados.missao, dados.visao, dados.valores, dados.regras_internas, dados.politicas_gerais]
    )
  }
}

// ── Aprovações ──────────────────────────────────────────────────────────────

const listarAprovacoes = async (tenantId, filters = {}) => {
  const { estado, tipo } = filters
  let sql = `
    SELECT sa.*, u.nome AS solicitante_nome, u.role AS solicitante_role
    FROM solicitacoes_aprovacao sa
    JOIN utilizadores u ON sa.solicitante_id = u.id
    WHERE sa.escola_id = ?
  `
  const params = [tenantId]
  if (estado) { sql += ' AND sa.estado = ?'; params.push(estado) }
  if (tipo) { sql += ' AND sa.tipo = ?'; params.push(tipo) }
  sql += ' ORDER BY sa.criado_em DESC'
  const result = await db.query(sql, params)
  return result.rows
}

const criarSolicitacao = async (tenantId, dados, solicitanteId) => {
  const r = await db.query(
    `INSERT INTO solicitacoes_aprovacao
      (escola_id, tipo, subtipo, titulo, descricao, dados_json, solicitante_id)
     VALUES (?,?,?,?,?,?,?)`,
    [tenantId, dados.tipo, dados.subtipo, dados.titulo, dados.descricao,
     JSON.stringify(dados.dados_json || {}), solicitanteId]
  )
  return r.rows[0]
}

const decidirSolicitacao = async (tenantId, id, estado, observacao) => {
  if (!['aprovado', 'rejeitado'].includes(estado)) throw { status: 400, message: 'Estado inválido' }
  await db.query(
    `UPDATE solicitacoes_aprovacao
     SET estado=?, director_observacao=?, aprovado_em=NOW()
     WHERE id=? AND escola_id=?`,
    [estado, observacao, id, tenantId]
  )
}

// ── Auditoria ───────────────────────────────────────────────────────────────

const listarAuditoria = async (tenantId, filters = {}) => {
  const { modulo, utilizador_id, data_inicio, data_fim, limit = 100 } = filters
  let sql = `
    SELECT al.*, u.nome AS utilizador_nome_atual
    FROM auditoria_log al
    LEFT JOIN utilizadores u ON al.utilizador_id = u.id
    WHERE al.escola_id = ?
  `
  const params = [tenantId]
  if (modulo) { sql += ' AND al.modulo = ?'; params.push(modulo) }
  if (utilizador_id) { sql += ' AND al.utilizador_id = ?'; params.push(utilizador_id) }
  if (data_inicio) { sql += ' AND DATE(al.criado_em) >= ?'; params.push(data_inicio) }
  if (data_fim) { sql += ' AND DATE(al.criado_em) <= ?'; params.push(data_fim) }
  sql += ' ORDER BY al.criado_em DESC LIMIT ?'
  params.push(parseInt(limit))
  const result = await db.query(sql, params)
  return result.rows
}

const registarAuditoria = async (tenantId, utilizadorId, utilizadorNome, modulo, acao, detalhes, ip) => {
  try {
    await db.query(
      `INSERT INTO auditoria_log (escola_id, utilizador_id, utilizador_nome, modulo, acao, detalhes, ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [tenantId, utilizadorId, utilizadorNome, modulo, acao, detalhes, ip]
    )
  } catch (_) {}
}

// ── Relatórios Executivos ───────────────────────────────────────────────────

const relatorioExecutivo = async (tenantId, tipo) => {
  if (tipo === 'academico') {
    const [turmas, notas, frequencia] = await Promise.all([
      db.query(`
        SELECT t.nome AS turma, COUNT(a.id) AS alunos
        FROM turmas t LEFT JOIN alunos a ON a.turma_id = t.id AND a.escola_id = t.escola_id
        WHERE t.escola_id = ? GROUP BY t.nome ORDER BY t.nome
      `, [tenantId]),
      db.query(`
        SELECT d.nome AS disciplina,
               ROUND(AVG(n.valor), 2) AS media,
               COUNT(DISTINCT n.aluno_id) AS total_alunos
        FROM notas n JOIN disciplinas d ON n.disciplina_id = d.id
        WHERE n.escola_id = ? GROUP BY d.nome ORDER BY media DESC
      `, [tenantId]),
      db.query(`
        SELECT a.nome, t.nome AS turma,
               ROUND(SUM(CASE WHEN p.presente=1 THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(p.id),0),1) AS frequencia
        FROM alunos a
        JOIN turmas t ON a.turma_id = t.id
        LEFT JOIN presencas p ON p.aluno_id = a.id AND p.escola_id = a.escola_id
        WHERE a.escola_id = ?
        GROUP BY a.id, a.nome, t.nome
        ORDER BY frequencia ASC LIMIT 20
      `, [tenantId]),
    ])
    return { turmas: turmas.rows, notas: notas.rows, frequencia_baixa: frequencia.rows }
  }

  if (tipo === 'financeiro') {
    const [mensal, porEstado, inadimplentes] = await Promise.all([
      db.query(`
        SELECT DATE_FORMAT(criado_em,'%Y-%m') AS mes,
               SUM(CASE WHEN estado='aprovado' THEN valor ELSE 0 END) AS recebido,
               SUM(CASE WHEN estado='pendente' THEN valor ELSE 0 END) AS pendente
        FROM pagamentos WHERE escola_id=?
        GROUP BY DATE_FORMAT(criado_em,'%Y-%m') ORDER BY mes DESC LIMIT 12
      `, [tenantId]),
      db.query(`
        SELECT estado, COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total
        FROM pagamentos WHERE escola_id=? GROUP BY estado
      `, [tenantId]),
      db.query(`
        SELECT a.nome, a.numero_matricula,
               COALESCE(SUM(CASE WHEN p.estado='pendente' THEN p.valor ELSE 0 END),0) AS divida
        FROM alunos a
        JOIN pagamentos p ON p.aluno_id = a.id AND p.escola_id = a.escola_id
        WHERE a.escola_id = ?
        GROUP BY a.id HAVING divida > 0 ORDER BY divida DESC LIMIT 20
      `, [tenantId]),
    ])
    return { mensal: mensal.rows, por_estado: porEstado.rows, inadimplentes: inadimplentes.rows }
  }

  if (tipo === 'rh') {
    const [departamentos, contratos, folha] = await Promise.all([
      db.query(`
        SELECT departamento, COUNT(*) AS total, COALESCE(SUM(salario_base),0) AS folha_total
        FROM funcionarios WHERE escola_id=? AND estado='activo' GROUP BY departamento
      `, [tenantId]),
      db.query(`
        SELECT f.nome, c.tipo_contrato, c.data_inicio, c.data_fim,
               DATEDIFF(c.data_fim, CURDATE()) AS dias_restantes
        FROM contratos c JOIN funcionarios f ON c.funcionario_id = f.id AND f.escola_id = ?
        WHERE c.data_fim IS NOT NULL ORDER BY c.data_fim ASC LIMIT 20
      `, [tenantId]),
      db.query(`
        SELECT mes, ano, SUM(valor_liquido) AS total_liquido, COUNT(*) AS funcionarios
        FROM salarios s JOIN funcionarios f ON s.funcionario_id = f.id AND f.escola_id = ?
        GROUP BY mes, ano ORDER BY ano DESC, mes DESC LIMIT 12
      `, [tenantId]),
    ])
    return { departamentos: departamentos.rows, contratos: contratos.rows, folha: folha.rows }
  }

  if (tipo === 'matriculas') {
    const r = await db.query(`
      SELECT t.nome AS turma, COUNT(m.id) AS matriculas,
             DATE_FORMAT(m.data_matricula,'%Y-%m') AS mes
      FROM matriculas m JOIN turmas t ON m.turma_id = t.id AND t.escola_id = m.escola_id
      WHERE m.escola_id = ?
      GROUP BY t.nome, DATE_FORMAT(m.data_matricula,'%Y-%m')
      ORDER BY mes DESC
    `, [tenantId])
    return { matriculas: r.rows }
  }

  return {}
}

// ── Indicadores ─────────────────────────────────────────────────────────────

const indicadoresInstitucionais = async (tenantId) => {
  const [aprovados, reprovados, totalAlunos, presencaTotal, presencaPresente, financeiroPago, financeiroTotal] = await Promise.all([
    db.query(`
      SELECT COUNT(DISTINCT n.aluno_id) AS total
      FROM notas n
      LEFT JOIN politicas_academicas pa ON pa.escola_id = n.escola_id
      WHERE n.escola_id=? AND n.tipo='trimestral'
        AND n.valor >= COALESCE(pa.nota_minima_aprovacao, 10)
    `, [tenantId]),
    db.query(`
      SELECT COUNT(DISTINCT n.aluno_id) AS total
      FROM notas n
      LEFT JOIN politicas_academicas pa ON pa.escola_id = n.escola_id
      WHERE n.escola_id=? AND n.tipo='trimestral'
        AND n.valor < COALESCE(pa.nota_minima_aprovacao, 10)
    `, [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id=?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM presencas WHERE escola_id=?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM presencas WHERE escola_id=? AND presente=1', [tenantId]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=? AND estado='aprovado'`, [tenantId]),
    db.query('SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=?', [tenantId]),
  ])

  const total = parseInt(totalAlunos.rows[0].total)
  const aprov = parseInt(aprovados.rows[0].total)
  const reprov = parseInt(reprovados.rows[0].total)
  const presTotal = parseInt(presencaTotal.rows[0].total) || 1
  const presPres = parseInt(presencaPresente.rows[0].total)
  const pago = parseFloat(financeiroPago.rows[0].total)
  const finTotal = parseFloat(financeiroTotal.rows[0].total) || 1

  return {
    taxa_aprovacao: total > 0 ? Math.round(aprov * 100 / total) : 0,
    taxa_reprovacao: total > 0 ? Math.round(reprov * 100 / total) : 0,
    taxa_frequencia: Math.round(presPres * 100 / presTotal),
    taxa_arrecadacao: Math.round(pago * 100 / finTotal),
    total_alunos: total,
    alunos_aprovados: aprov,
    alunos_reprovados: reprov,
    total_presencas: presTotal,
    presencas_dadas: presPres,
    valor_arrecadado: pago,
    valor_total: finTotal,
  }
}

module.exports = {
  dashboardExecutivo,
  listarUtilizadores,
  atualizarEstadoUtilizador,
  atualizarRoleUtilizador,
  obterPoliticasAcademicas,
  salvarPoliticasAcademicas,
  obterPoliticasFinanceiras,
  salvarPoliticasFinanceiras,
  obterPoliticasAdministrativas,
  salvarPoliticasAdministrativas,
  listarAprovacoes,
  criarSolicitacao,
  decidirSolicitacao,
  listarAuditoria,
  registarAuditoria,
  relatorioExecutivo,
  indicadoresInstitucionais,
}
