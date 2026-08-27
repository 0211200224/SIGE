const db = require('../../config/database')
const { marcarCobrancasVencidas } = require('../financeiro/financeiro.service')

const getAlunoId = async (userId) => {
  const r = await db.query('SELECT aluno_id FROM utilizadores WHERE id = ?', [userId])
  const id = r.rows[0]?.aluno_id
  if (!id) throw Object.assign(new Error('Conta não associada a nenhum aluno'), { status: 404 })
  return id
}

const perfil = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)
  const r = await db.query(
    `SELECT a.id, a.nome, a.foto, a.data_nascimento, a.genero, a.numero_matricula, a.criado_em,
            cg.id AS turma_id, cg.nome AS turma_nome, gl.nome AS classe, a.ano_lectivo,
            e.nome AS escola_nome, e.sigla AS escola_sigla, e.nivel_ensino
     FROM alunos a
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN escolas e ON a.escola_id = e.id
     WHERE a.id = ? AND a.escola_id = ?`,
    [alunoId, tenantId]
  )
  return r.rows[0] || null
}

const notas = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)
  const r = await db.query(
    `SELECT n.id, n.trimestre, n.tipo, n.valor, n.observacoes, n.criado_em,
            d.id AS disciplina_id, d.nome AS disciplina_nome
     FROM notas n
     JOIN subjects d ON n.disciplina_id = d.id
     WHERE n.escola_id = ? AND n.aluno_id = ?
     ORDER BY n.trimestre, d.nome, n.tipo`,
    [tenantId, alunoId]
  )
  return r.rows
}

const presencas = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)
  const r = await db.query(
    `SELECT p.id, p.data, p.presente, p.justificada, p.observacao,
            d.nome AS disciplina_nome
     FROM presencas p
     LEFT JOIN subjects d ON p.disciplina_id = d.id
     WHERE p.escola_id = ? AND p.aluno_id = ?
     ORDER BY p.data DESC`,
    [tenantId, alunoId]
  )
  return r.rows
}

const financeiro = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)
  await marcarCobrancasVencidas(tenantId)

  const pgsRes = await db.query(
    `SELECT p.id, p.valor, p.metodo, p.referencia, p.estado, p.mes_referencia,
            p.numero_recibo, p.criado_em, p.aprovado_em, p.anulado,
            t.nome AS taxa_nome
     FROM pagamentos p
     LEFT JOIN taxas t ON p.taxa_id = t.id
     WHERE p.escola_id = ? AND p.aluno_id = ?
     ORDER BY p.criado_em DESC`,
    [tenantId, alunoId]
  )
  const pagamentos = pgsRes.rows

  let cobrancasPendentes = []
  try {
    const cobsRes = await db.query(
      `SELECT c.id, c.valor, c.mes_referencia, c.data_vencimento, c.status,
              t.nome AS taxa_nome,
              CASE WHEN c.status = 'vencido' AND c.data_vencimento IS NOT NULL
                   THEN GREATEST(0, CURRENT_DATE - c.data_vencimento) ELSE 0 END AS dias_atraso
       FROM cobrancas c
       JOIN taxas t ON c.taxa_id = t.id
       WHERE c.escola_id = ? AND c.aluno_id = ? AND c.status IN ('pendente','vencido')
       ORDER BY c.data_vencimento ASC`,
      [tenantId, alunoId]
    )
    cobrancasPendentes = cobsRes.rows
  } catch (_) { /* tabela cobrancas pode não existir */ }

  // 'aprovado' e 'confirmado' sao o mesmo estado final (nome legado ainda
  // usado nalguns pontos do modulo Financeiro) -- exclui pagamentos anulados
  // (registo corrigido pelo Financeiro), que nunca contam para o total pago.
  const totalPago = pagamentos
    .filter(p => (p.estado === 'aprovado' || p.estado === 'confirmado') && !p.anulado)
    .reduce((s, p) => s + Number(p.valor), 0)

  const totalPendente = cobrancasPendentes.reduce((s, c) => s + Number(c.valor), 0)

  return { pagamentos, cobrancasPendentes, totalPago, totalPendente }
}

// Recibo de um pagamento — sempre restrito ao proprio aluno logado (nunca
// aceita um id de pagamento de outro aluno, mesmo da mesma escola).
const obterRecibo = async (userId, tenantId, pagamentoId) => {
  const alunoId = await getAlunoId(userId)
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
     WHERE p.id = ? AND p.escola_id = ? AND p.aluno_id = ? AND p.estado IN ('confirmado','aprovado')`,
    [pagamentoId, tenantId, alunoId]
  )
  if (!r.rows.length) { const e = new Error('Recibo não encontrado'); e.status = 404; throw e }
  return r.rows[0]
}

const boletim = async (userId, tenantId) => {
  const [p, ns] = await Promise.all([perfil(userId, tenantId), notas(userId, tenantId)])

  // Agrupar notas por disciplina
  const discsMap = {}
  for (const n of ns) {
    if (!discsMap[n.disciplina_id]) {
      discsMap[n.disciplina_id] = { id: n.disciplina_id, nome: n.disciplina_nome, trimestres: {} }
    }
    if (!discsMap[n.disciplina_id].trimestres[n.trimestre]) {
      discsMap[n.disciplina_id].trimestres[n.trimestre] = []
    }
    discsMap[n.disciplina_id].trimestres[n.trimestre].push({ tipo: n.tipo, valor: n.valor })
  }

  // Calcular médias por trimestre e média final por disciplina
  const disciplinas = Object.values(discsMap).map(d => {
    const mediasTrimestrais = {}
    for (const [trim, notas] of Object.entries(d.trimestres)) {
      const vals = notas.map(n => Number(n.valor)).filter(v => !isNaN(v))
      mediasTrimestrais[trim] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null
    }
    const allMedias = Object.values(mediasTrimestrais).filter(v => v !== null)
    const mediaFinal = allMedias.length ? Math.round(allMedias.reduce((s, v) => s + v, 0) / allMedias.length * 10) / 10 : null
    return { ...d, mediasTrimestrais, mediaFinal }
  })

  return { perfil: p, disciplinas }
}

module.exports = { perfil, notas, presencas, financeiro, boletim, obterRecibo }
