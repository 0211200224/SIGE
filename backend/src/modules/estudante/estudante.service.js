const db = require('../../config/database')

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
            t.id AS turma_id, t.nome AS turma_nome, t.classe, t.ano_lectivo,
            e.nome AS escola_nome, e.sigla AS escola_sigla, e.nivel_ensino
     FROM alunos a
     LEFT JOIN turmas t ON a.turma_id = t.id
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
     JOIN disciplinas d ON n.disciplina_id = d.id
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
     LEFT JOIN disciplinas d ON p.disciplina_id = d.id
     WHERE p.escola_id = ? AND p.aluno_id = ?
     ORDER BY p.data DESC`,
    [tenantId, alunoId]
  )
  return r.rows
}

const financeiro = async (userId, tenantId) => {
  const alunoId = await getAlunoId(userId)

  const pgsRes = await db.query(
    `SELECT p.id, p.valor, p.metodo, p.referencia, p.estado, p.mes_referencia,
            p.numero_recibo, p.criado_em, p.aprovado_em,
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
              t.nome AS taxa_nome
       FROM cobrancas c
       JOIN taxas t ON c.taxa_id = t.id
       WHERE c.escola_id = ? AND c.aluno_id = ? AND c.status IN ('pendente','vencido')
       ORDER BY c.data_vencimento ASC`,
      [tenantId, alunoId]
    )
    cobrancasPendentes = cobsRes.rows
  } catch (_) { /* tabela cobrancas pode não existir */ }

  const totalPago = pagamentos
    .filter(p => p.estado === 'aprovado')
    .reduce((s, p) => s + Number(p.valor), 0)

  const totalPendente = cobrancasPendentes.reduce((s, c) => s + Number(c.valor), 0)

  return { pagamentos, cobrancasPendentes, totalPago, totalPendente }
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

module.exports = { perfil, notas, presencas, financeiro, boletim }
