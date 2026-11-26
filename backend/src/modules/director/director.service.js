const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { senhaDeNascimento, gerarCodigo } = require('../../utils/codigoGenerator')
const { PORTAIS_EQUIPA, SQL_TEM_PORTAL } = require('../../utils/portais')

// ── Académico: aprovação / reprovação ───────────────────────────────────────
// Por ALUNO (não por disciplina): a média de cada aluno em cada disciplina
// lançada (qualquer tipo de nota conta -- o professor define os tipos
// livremente no Portal do Professor, nunca existe nota com tipo='trimestral')
// é comparada à nota mínima; um aluno é "reprovado" se tiver pelo menos uma
// disciplina abaixo do mínimo, "aprovado" se todas as que tem lançadas
// estiverem dentro. `total` conta só alunos com pelo menos uma nota lançada,
// por isso aprovados+reprovados=total sempre -- nunca uma taxa inferida como
// o complemento da outra, e sem dados lançados ambas ficam a 0%.
const calcularAprovacaoReprovacao = async (tenantId) => {
  const r = await db.query(`
    WITH medias AS (
      SELECT aluno_id, disciplina_id, trimestre, AVG(valor) AS media
      FROM notas WHERE escola_id = ?
      GROUP BY aluno_id, disciplina_id, trimestre
    ),
    por_aluno AS (
      SELECT aluno_id, MIN(media) AS pior_media FROM medias GROUP BY aluno_id
    )
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN pior_media >= COALESCE((SELECT nota_minima_aprovacao FROM politicas_academicas WHERE escola_id = ?), 10) THEN 1 ELSE 0 END) AS aprovados,
      SUM(CASE WHEN pior_media <  COALESCE((SELECT nota_minima_aprovacao FROM politicas_academicas WHERE escola_id = ?), 10) THEN 1 ELSE 0 END) AS reprovados
    FROM por_aluno
  `, [tenantId, tenantId, tenantId])
  const total = parseInt(r.rows[0].total) || 0
  const aprovados = parseInt(r.rows[0].aprovados) || 0
  const reprovados = parseInt(r.rows[0].reprovados) || 0
  return {
    total, aprovados, reprovados,
    taxa_aprovacao: total > 0 ? Math.round(aprovados * 1000 / total) / 10 : 0,
    taxa_reprovacao: total > 0 ? Math.round(reprovados * 1000 / total) / 10 : 0,
  }
}

// ── Dashboard Executivo ─────────────────────────────────────────────────────

const dashboardExecutivo = async (tenantId) => {
  const [
    alunosTotal, alunosTurma, academico, frequenciaMedia, alunosRisco,
    finReceita, finPendente, finDividas, finInadimplencia,
    rhAtivos, rhContratos, rhFaltas,
    matriculas, transferencias, utilizadores,
  ] = await Promise.all([
    // Académicos
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id = ?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM class_groups WHERE escola_id = ? AND activo = 1', [tenantId]),
    calcularAprovacaoReprovacao(tenantId),
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

    // Financeiros -- "receita" e "pendente" seguem a mesma leitura usada no
    // próprio módulo Financeiro (financeiro.service.js/obterStats): o dinheiro
    // já recebido vem de pagamentos confirmados (nunca 'aprovado' sozinho --
    // o fluxo real grava sempre 'confirmado', 'aprovado' é um valor legado),
    // e a dívida em aberto vem de cobranças, não de pagamentos.
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=? AND estado IN ('confirmado','aprovado') AND anulado = 0`, [tenantId]),
    db.query(`SELECT COALESCE(SUM(valor - valor_pago),0) AS total FROM cobrancas WHERE escola_id=? AND status IN ('pendente','vencido','parcial')`, [tenantId]),
    db.query(`SELECT COUNT(*) AS total FROM cobrancas WHERE escola_id=? AND status IN ('pendente','vencido','parcial')`, [tenantId]),
    db.query(`SELECT COUNT(DISTINCT aluno_id) AS total FROM cobrancas WHERE escola_id=? AND status IN ('pendente','vencido','parcial')`, [tenantId]),

    // RH
    db.query(`SELECT COUNT(*) AS total FROM funcionarios WHERE escola_id=? AND estado='activo'`, [tenantId]),
    db.query(`
      SELECT COUNT(*) AS total FROM contratos c
      JOIN funcionarios f ON c.funcionario_id = f.id AND f.escola_id = ?
      WHERE c.data_fim IS NOT NULL AND c.data_fim BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
    `, [tenantId]),
    db.query(`
      SELECT COUNT(*) AS total FROM faltas_rh fa
      JOIN funcionarios f ON fa.funcionario_id = f.id AND f.escola_id = ?
      WHERE fa.data >= (CURRENT_DATE - INTERVAL '30 days')
    `, [tenantId]),

    // Administrativos -- alunos actualmente com turma atribuída (não a
    // contagem histórica de aluno_matriculas, que inclui registos cancelados
    // e de anos lectivos anteriores e por isso não é comparável com
    // total_alunos).
    db.query(`SELECT COUNT(*) AS total FROM alunos WHERE escola_id=? AND class_group_id IS NOT NULL`, [tenantId]),
    db.query(`SELECT COUNT(*) AS total FROM transferencias WHERE escola_id=?`, [tenantId]),
    db.query(`SELECT COUNT(*) AS total FROM utilizadores WHERE escola_id=? AND activo=1`, [tenantId]),
  ])

  return {
    academicos: {
      total_alunos: parseInt(alunosTotal.rows[0].total),
      total_turmas: parseInt(alunosTurma.rows[0].total),
      taxa_aprovacao: academico.taxa_aprovacao,
      taxa_reprovacao: academico.taxa_reprovacao,
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
    SELECT u.id, u.nome, u.email, u.codigo, u.role, u.activo, u.criado_em,
           f.departamento, c.nome AS cargo,
           (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                     'portal', up.portal, 'codigo', up.codigo, 'valido_ate', TO_CHAR(up.valido_ate, 'YYYY-MM-DD'),
                     'expirado', up.valido_ate IS NOT NULL AND up.valido_ate < CURRENT_DATE
                   ) ORDER BY up.concedido_em), '[]')
            FROM utilizador_portais up WHERE up.utilizador_id = u.id) AS portais_extra
    FROM utilizadores u
    LEFT JOIN funcionarios f ON f.utilizador_id = u.id
    LEFT JOIN cargos c ON c.id = f.cargo_id
    WHERE u.escola_id = ? AND u.role != 'super_admin'
  `
  const params = [tenantId]
  if (role) { sql += ` AND ${SQL_TEM_PORTAL}`; params.push([role], [role]) }
  if (activo !== undefined && activo !== '') { sql += ' AND u.activo = ?'; params.push(activo === 'true' || activo === '1' ? 1 : 0) }
  if (search) { sql += ' AND (u.nome LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY u.activo DESC, u.nome ASC'
  const result = await db.query(sql, params)
  return result.rows
}

const atualizarEstadoUtilizador = async (tenantId, id, activo) => {
  await db.query(
    "UPDATE utilizadores SET activo = ? WHERE id = ? AND escola_id = ? AND role != 'super_admin'",
    [activo ? 1 : 0, id, tenantId]
  )
}

const atualizarRoleUtilizador = async (tenantId, id, role) => {
  const rolesValidos = ['director', 'secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']
  if (!rolesValidos.includes(role)) throw { status: 400, message: 'Role inválido' }
  await db.query(
    "UPDATE utilizadores SET role = ? WHERE id = ? AND escola_id = ? AND role != 'super_admin'",
    [role, id, tenantId]
  )
  // O novo portal principal deixa de fazer sentido como adicional.
  await db.query('DELETE FROM utilizador_portais WHERE utilizador_id = ? AND escola_id = ? AND portal = ?', [id, tenantId, role])
}

// ── Portais adicionais ──────────────────────────────────────────────────────
// Dá acesso a mais um portal sem recriar a conta nem retirar o que já tem.
// Sem valido_ate = definitivo; com valido_ate = temporário (deixa de contar
// sozinho a partir do dia seguinte). Conceder de novo o mesmo portal só
// actualiza a validade.
const concederPortal = async (tenantId, id, { portal, valido_ate }, concedidoPor) => {
  if (!PORTAIS_EQUIPA.includes(portal)) throw { status: 400, message: 'Portal inválido' }
  const u = await db.query(
    "SELECT id, role FROM utilizadores WHERE id = ? AND escola_id = ? AND role NOT IN ('super_admin','aluno')",
    [id, tenantId]
  )
  if (!u.rows[0]) throw { status: 404, message: 'Utilizador não encontrado' }
  if (u.rows[0].role === portal) throw { status: 400, message: 'Este já é o portal principal deste utilizador' }
  if (valido_ate && valido_ate < new Date().toISOString().slice(0, 10)) {
    throw { status: 400, message: 'A data limite do acesso temporário não pode estar no passado' }
  }
  // Conceder de novo um portal que já tinha (ex: renovar um temporário)
  // mantém o mesmo código -- só a validade muda.
  const existente = await db.query('SELECT codigo FROM utilizador_portais WHERE utilizador_id = ? AND portal = ?', [id, portal])
  if (existente.rows[0]) {
    let codigo = existente.rows[0].codigo
    if (!codigo) codigo = await gerarCodigo(tenantId, portal)
    await db.query(
      `UPDATE utilizador_portais SET valido_ate = ?, concedido_por = ?, concedido_em = NOW(), codigo = ?
       WHERE utilizador_id = ? AND portal = ?`,
      [valido_ate || null, concedidoPor, codigo, id, portal]
    )
    return { portal, codigo }
  }
  const codigo = await gerarCodigo(tenantId, portal)
  await db.query(
    `INSERT INTO utilizador_portais (escola_id, utilizador_id, portal, valido_ate, concedido_por, codigo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, id, portal, valido_ate || null, concedidoPor, codigo]
  )
  return { portal, codigo }
}

const removerPortal = async (tenantId, id, portal) => {
  await db.query(
    'DELETE FROM utilizador_portais WHERE utilizador_id = ? AND escola_id = ? AND portal = ?',
    [id, tenantId, portal]
  )
}

// Reposicao de senha assistida: o director repoe a senha padrao (data de
// nascimento, ou 'sige2024' se nao houver) e marca primeiro_login=1, tal
// como no momento em que a conta foi criada.
const resetarSenhaUtilizador = async (tenantId, id) => {
  // TO_CHAR devolve a data ja formatada como texto: evita que o driver pg
  // a converta para um objecto Date (que usaria a meia-noite no fuso
  // horario local do servidor e podia desviar o dia em 1).
  const r = await db.query(
    "SELECT id, nome, TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS data_nascimento FROM utilizadores WHERE id = ? AND escola_id = ? AND role != 'super_admin'",
    [id, tenantId]
  )
  const user = r.rows[0]
  if (!user) throw { status: 404, message: 'Utilizador não encontrado' }

  const senhaFinal = user.data_nascimento ? senhaDeNascimento(user.data_nascimento) : 'sige2024'
  const hash = await bcrypt.hash(senhaFinal, 12)
  await db.query(
    'UPDATE utilizadores SET password_hash = ?, primeiro_login = 1 WHERE id = ?',
    [hash, id]
  )
  return { id: user.id, nome: user.nome, senha_padrao: senhaFinal }
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
        SELECT cg.nome AS turma, COUNT(a.id) AS alunos
        FROM class_groups cg LEFT JOIN alunos a ON a.class_group_id = cg.id AND a.escola_id = cg.escola_id
        WHERE cg.escola_id = ? AND cg.activo = 1 GROUP BY cg.nome ORDER BY cg.nome
      `, [tenantId]),
      db.query(`
        SELECT d.nome AS disciplina,
               ROUND(AVG(n.valor), 2) AS media,
               COUNT(DISTINCT n.aluno_id) AS total_alunos
        FROM notas n JOIN subjects d ON n.disciplina_id = d.id
        WHERE n.escola_id = ? GROUP BY d.nome ORDER BY media DESC
      `, [tenantId]),
      db.query(`
        SELECT a.nome, cg.nome AS turma,
               ROUND(SUM(CASE WHEN p.presente=1 THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(p.id),0),1) AS frequencia
        FROM alunos a
        JOIN class_groups cg ON a.class_group_id = cg.id
        LEFT JOIN presencas p ON p.aluno_id = a.id AND p.escola_id = a.escola_id
        WHERE a.escola_id = ?
        GROUP BY a.id, a.nome, cg.nome
        ORDER BY frequencia ASC LIMIT 20
      `, [tenantId]),
    ])
    return { turmas: turmas.rows, notas: notas.rows, frequencia_baixa: frequencia.rows }
  }

  if (tipo === 'financeiro') {
    const [mensal, porEstado, inadimplentes] = await Promise.all([
      // Recebido = pagamentos confirmados (o fluxo real grava sempre
      // 'confirmado', nunca 'aprovado' sozinho) e nunca anulados. "Pendente"
      // aqui é pagamento submetido e ainda não confirmado (não é dívida do
      // aluno -- essa vem de cobrancas, ver "inadimplentes" abaixo).
      db.query(`
        SELECT TO_CHAR(criado_em,'YYYY-MM') AS mes,
               SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN valor ELSE 0 END) AS recebido,
               SUM(CASE WHEN estado IN ('pendente','em_analise') THEN valor ELSE 0 END) AS pendente
        FROM pagamentos WHERE escola_id=?
        GROUP BY TO_CHAR(criado_em,'YYYY-MM') ORDER BY mes DESC LIMIT 12
      `, [tenantId]),
      db.query(`
        SELECT estado, COUNT(*) AS qtd, COALESCE(SUM(valor),0) AS total
        FROM pagamentos WHERE escola_id=? AND anulado = 0 GROUP BY estado
      `, [tenantId]),
      // Inadimplentes = alunos com saldo em aberto em cobrancas (o que
      // efectivamente devem), não pagamentos por aprovar.
      db.query(`
        SELECT a.nome, a.numero_matricula,
               COALESCE(SUM(c.valor - c.valor_pago),0) AS divida
        FROM alunos a
        JOIN cobrancas c ON c.aluno_id = a.id AND c.escola_id = a.escola_id
        WHERE a.escola_id = ? AND c.status IN ('pendente','vencido','parcial')
        GROUP BY a.id HAVING SUM(c.valor - c.valor_pago) > 0 ORDER BY divida DESC LIMIT 20
      `, [tenantId]),
    ])
    return { mensal: mensal.rows, por_estado: porEstado.rows, inadimplentes: inadimplentes.rows }
  }

  if (tipo === 'rh') {
    const [departamentos, contratos, folha] = await Promise.all([
      db.query(`
        SELECT COALESCE(d.nome, f.departamento, 'Sem departamento') AS departamento,
               COUNT(*) AS total,
               COALESCE(SUM(CASE WHEN ct.regime_salarial = 'diario'
                                 THEN ct.salario * COALESCE((SELECT dias_uteis_mes FROM rh_configuracao WHERE escola_id = f.escola_id), 22)
                                 ELSE COALESCE(ct.salario, f.salario_base) END),0) AS folha_total
        FROM funcionarios f LEFT JOIN departamentos d ON d.id = f.departamento_id
        LEFT JOIN contratos ct ON ct.id = (
          SELECT c2.id FROM contratos c2 WHERE c2.funcionario_id = f.id AND c2.estado = 'activo'
          ORDER BY c2.data_inicio DESC LIMIT 1)
        WHERE f.escola_id=? AND f.estado='activo'
        GROUP BY COALESCE(d.nome, f.departamento, 'Sem departamento')
      `, [tenantId]),
      db.query(`
        SELECT f.nome, c.tipo AS tipo_contrato, c.data_inicio, c.data_fim,
               (c.data_fim - CURRENT_DATE) AS dias_restantes
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
      SELECT cg.nome AS turma, COUNT(am.id) AS matriculas,
             TO_CHAR(am.data_matricula,'YYYY-MM') AS mes
      FROM aluno_matriculas am JOIN class_groups cg ON am.class_group_id = cg.id AND cg.escola_id = am.escola_id
      WHERE am.escola_id = ?
      GROUP BY cg.nome, TO_CHAR(am.data_matricula,'YYYY-MM')
      ORDER BY mes DESC
    `, [tenantId])
    return { matriculas: r.rows }
  }

  return {}
}

// ── Indicadores ─────────────────────────────────────────────────────────────

const indicadoresInstitucionais = async (tenantId) => {
  const [academico, totalAlunos, presencaTotal, presencaPresente, financeiroPago, financeiroTotal] = await Promise.all([
    calcularAprovacaoReprovacao(tenantId),
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id=?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM presencas WHERE escola_id=?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM presencas WHERE escola_id=? AND presente=1', [tenantId]),
    // Pago = pagamentos confirmados (o fluxo real grava sempre 'confirmado',
    // nunca 'aprovado' sozinho) e nunca anulados; total facturado vem das
    // cobranças emitidas, não da soma de pagamentos (que incluiria tentativas
    // rejeitadas/pendentes e distorceria a taxa de arrecadação).
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE escola_id=? AND estado IN ('confirmado','aprovado') AND anulado = 0`, [tenantId]),
    db.query(`SELECT COALESCE(SUM(valor),0) AS total FROM cobrancas WHERE escola_id=?`, [tenantId]),
  ])

  const total = parseInt(totalAlunos.rows[0].total)
  const presTotal = parseInt(presencaTotal.rows[0].total) || 1
  const presPres = parseInt(presencaPresente.rows[0].total)
  const pago = parseFloat(financeiroPago.rows[0].total)
  const finTotal = parseFloat(financeiroTotal.rows[0].total) || 1

  return {
    taxa_aprovacao: academico.taxa_aprovacao,
    taxa_reprovacao: academico.taxa_reprovacao,
    taxa_frequencia: Math.round(presPres * 100 / presTotal),
    taxa_arrecadacao: finTotal > 0 ? Math.round(pago * 100 / finTotal) : 0,
    total_alunos: total,
    alunos_aprovados: academico.aprovados,
    alunos_reprovados: academico.reprovados,
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
  concederPortal,
  removerPortal,
  resetarSenhaUtilizador,
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
