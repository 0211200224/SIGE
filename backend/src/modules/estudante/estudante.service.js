const db = require('../../config/database')
const { marcarCobrancasVencidas } = require('../financeiro/financeiro.service')
const { calcularTrimestre, mediaAnual } = require('../../utils/avaliacao')

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
      `SELECT c.id, c.valor, c.valor_pago, c.mes_referencia, c.data_vencimento, c.status,
              t.nome AS taxa_nome,
              CASE WHEN c.status = 'vencido' AND c.data_vencimento IS NOT NULL
                   THEN GREATEST(0, CURRENT_DATE - (date_trunc('month', c.data_vencimento) + INTERVAL '1 month 4 days')::date)
                   ELSE 0 END AS dias_atraso
       FROM cobrancas c
       JOIN taxas t ON c.taxa_id = t.id
       WHERE c.escola_id = ? AND c.aluno_id = ? AND c.status IN ('pendente','vencido','parcial')
       ORDER BY c.data_vencimento ASC`,
      [tenantId, alunoId]
    )
    cobrancasPendentes = cobsRes.rows
  } catch (_) { /* tabela cobrancas pode não existir */ }

  // O portal do aluno/encarregado so mostra o que lhe diz respeito agir:
  // dividas, cobrancas pendentes e recibos. Nunca o total acumulado pago
  // nem o historico completo de pagamentos (isso e do Financeiro).
  // 'aprovado' e 'confirmado' sao o mesmo estado final (nome legado ainda
  // usado nalguns pontos do modulo Financeiro); anulados nunca sao recibo.
  const recibos = pagamentos.filter(p => (p.estado === 'aprovado' || p.estado === 'confirmado') && !Number(p.anulado))

  const restante = (c) => Number(c.valor) - Number(c.valor_pago || 0)
  const totalDivida = cobrancasPendentes.reduce((s, c) => s + restante(c), 0)
  const totalEmAtraso = cobrancasPendentes.filter(c => c.status === 'vencido').reduce((s, c) => s + restante(c), 0)

  return { cobrancasPendentes, recibos, totalDivida, totalEmAtraso }
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

// Boletim pela regra unica de avaliacao (vista v_notas_trimestrais):
// Media de cada trimestre = arred((2 x Media ACS + AP)/3) e Media final da
// disciplina = media anual (media dos trimestres concluidos).
const boletim = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)
  const [p, r] = await Promise.all([
    perfil(userId, tenantId),
    db.query(
      `SELECT v.disciplina_id, d.nome AS disciplina_nome, v.trimestre, v.acs1, v.acs2, v.ap, v.media_acs, v.media_trimestral
       FROM v_notas_trimestrais v JOIN subjects d ON d.id = v.disciplina_id
       WHERE v.escola_id = ? AND v.aluno_id = ?
       ORDER BY d.nome, v.trimestre`,
      [tenantId, alunoId]),
  ])

  const discsMap = {}
  for (const n of r.rows) {
    if (!discsMap[n.disciplina_id]) discsMap[n.disciplina_id] = { id: n.disciplina_id, nome: n.disciplina_nome, mediasTrimestrais: {}, detalhe: {} }
    const t = calcularTrimestre(n)
    discsMap[n.disciplina_id].mediasTrimestrais[n.trimestre] = t.media_trimestral
    discsMap[n.disciplina_id].detalhe[n.trimestre] = t
  }

  const disciplinas = Object.values(discsMap).map(d => {
    const medias = Object.values(d.mediasTrimestrais)
    return { ...d, mediaFinal: mediaAnual(medias), trimestresConcluidos: medias.filter(v => v !== null).length }
  })

  return { perfil: p, disciplinas }
}

module.exports = { perfil, notas, presencas, financeiro, boletim, obterRecibo }
