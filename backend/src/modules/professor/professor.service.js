const db = require('../../config/database')

// Turmas e disciplinas atribuídas ao professor
const minhasTurmas = async (tenantId, professorId) => {
  const r = await db.query(
    `SELECT ta.id AS atribuicao_id, ta.ano_lectivo,
            cg.id AS turma_id, cg.nome AS turma_nome, cg.turno, cg.capacidade,
            gl.nome AS classe_nome,
            s.id AS disciplina_id, s.nome AS disciplina_nome, s.codigo AS disciplina_codigo,
            (SELECT COUNT(*) FROM aluno_matriculas am WHERE am.class_group_id = cg.id AND am.status = 'activa') AS total_alunos
     FROM teaching_assignments ta
     JOIN class_groups cg ON ta.class_group_id = cg.id
     JOIN grade_levels gl ON cg.grade_level_id = gl.id
     JOIN subjects s ON ta.subject_id = s.id
     WHERE ta.escola_id = ? AND ta.professor_id = ? AND ta.activo = 1
     ORDER BY cg.nome ASC, s.nome ASC`,
    [tenantId, professorId])
  return r.rows
}

// Alunos de uma turma
const alunosDaTurma = async (tenantId, turmaId) => {
  const r = await db.query(
    `SELECT a.id, a.nome, a.numero_matricula, a.genero, am.status AS matricula_status
     FROM aluno_matriculas am
     JOIN alunos a ON am.aluno_id = a.id
     WHERE am.class_group_id = ? AND a.escola_id = ? AND am.status = 'activa'
     ORDER BY a.nome ASC`,
    [turmaId, tenantId])
  return r.rows
}

// ─── NOTAS ───────────────────────────────────────────────────────────────────

const listarNotas = async (tenantId, { turma_id, disciplina_id, trimestre }) => {
  let where = 'n.escola_id = ?'
  const params = [tenantId]
  if (turma_id) { where += ' AND n.turma_id = ?'; params.push(turma_id) }
  if (disciplina_id) { where += ' AND n.disciplina_id = ?'; params.push(disciplina_id) }
  if (trimestre) { where += ' AND n.trimestre = ?'; params.push(trimestre) }

  const r = await db.query(
    `SELECT n.*, a.nome AS aluno_nome, a.numero_matricula, s.nome AS disciplina_nome
     FROM notas n
     JOIN alunos a ON n.aluno_id = a.id
     LEFT JOIN subjects s ON n.disciplina_id = s.id
     WHERE ${where}
     ORDER BY a.nome ASC, n.tipo ASC`,
    params)
  return r.rows
}

const lancarNotasLote = async (tenantId, professorId, { turma_id, disciplina_id, trimestre, notas }) => {
  // notas = [{ aluno_id, tipo, valor, observacoes }]
  const resultados = []
  for (const nota of notas) {
    if (nota.valor === null || nota.valor === undefined || nota.valor === '') continue

    const existe = await db.query(
      'SELECT id FROM notas WHERE escola_id = ? AND aluno_id = ? AND disciplina_id = ? AND turma_id = ? AND trimestre = ? AND tipo = ?',
      [tenantId, nota.aluno_id, disciplina_id, turma_id, trimestre, nota.tipo])

    if (existe.rows[0]) {
      await db.query(
        'UPDATE notas SET valor = ?, observacoes = ? WHERE id = ?',
        [parseFloat(nota.valor), nota.observacoes || null, existe.rows[0].id])
      resultados.push(existe.rows[0].id)
    } else {
      const r = await db.query(
        'INSERT INTO notas (escola_id, aluno_id, disciplina_id, turma_id, trimestre, tipo, valor, observacoes) VALUES (?,?,?,?,?,?,?,?)',
        [tenantId, nota.aluno_id, disciplina_id, turma_id, trimestre, nota.tipo, parseFloat(nota.valor), nota.observacoes || null])
      resultados.push(r.rows[0].insertId)
    }
  }
  return { guardado: resultados.length }
}

// ─── PRESENÇAS ───────────────────────────────────────────────────────────────

const listarPresencas = async (tenantId, { turma_id, disciplina_id, data }) => {
  let where = 'p.escola_id = ?'
  const params = [tenantId]
  if (turma_id) { where += ' AND p.turma_id = ?'; params.push(turma_id) }
  if (disciplina_id) { where += ' AND p.disciplina_id = ?'; params.push(disciplina_id) }
  if (data) { where += ' AND p.data = ?'; params.push(data) }

  const r = await db.query(
    `SELECT p.*, a.nome AS aluno_nome, a.numero_matricula
     FROM presencas p JOIN alunos a ON p.aluno_id = a.id
     WHERE ${where}
     ORDER BY a.nome ASC`, params)
  return r.rows
}

const registarPresencas = async (tenantId, professorId, { turma_id, disciplina_id, data, presencas }) => {
  // presencas = [{ aluno_id, presente, justificada, observacao }]
  for (const p of presencas) {
    const existe = await db.query(
      'SELECT id FROM presencas WHERE escola_id = ? AND turma_id = ? AND disciplina_id = ? AND data = ? AND aluno_id = ?',
      [tenantId, turma_id, disciplina_id, data, p.aluno_id])

    if (existe.rows[0]) {
      await db.query(
        'UPDATE presencas SET presente = ?, justificada = ?, observacao = ?, professor_id = ? WHERE id = ?',
        [p.presente ? 1 : 0, p.justificada ? 1 : 0, p.observacao || null, professorId, existe.rows[0].id])
    } else {
      await db.query(
        'INSERT INTO presencas (escola_id, turma_id, disciplina_id, data, professor_id, aluno_id, presente, justificada, observacao) VALUES (?,?,?,?,?,?,?,?,?)',
        [tenantId, turma_id, disciplina_id, data, professorId, p.aluno_id, p.presente ? 1 : 0, p.justificada ? 1 : 0, p.observacao || null])
    }
  }
  return { registado: presencas.length }
}

// Estatísticas de presença por aluno numa turma/disciplina
const estatisticasPresenca = async (tenantId, { turma_id, disciplina_id }) => {
  const r = await db.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.numero_matricula,
            COUNT(p.id) AS total_aulas,
            SUM(p.presente) AS presentes,
            SUM(CASE WHEN p.presente = 0 AND p.justificada = 0 THEN 1 ELSE 0 END) AS faltas,
            SUM(CASE WHEN p.presente = 0 AND p.justificada = 1 THEN 1 ELSE 0 END) AS faltas_justificadas,
            ROUND(SUM(p.presente) / COUNT(p.id) * 100, 1) AS pct_presenca
     FROM aluno_matriculas am
     JOIN alunos a ON am.aluno_id = a.id
     LEFT JOIN presencas p ON p.aluno_id = a.id AND p.turma_id = am.class_group_id
       ${disciplina_id ? 'AND p.disciplina_id = ?' : ''}
     WHERE am.class_group_id = ? AND a.escola_id = ? AND am.status = 'activa'
     GROUP BY a.id, a.nome, a.numero_matricula
     ORDER BY a.nome ASC`,
    disciplina_id ? [disciplina_id, turma_id, tenantId] : [turma_id, tenantId])
  return r.rows
}

// ─── PAUTA ───────────────────────────────────────────────────────────────────

const obterPauta = async (tenantId, { turma_id, disciplina_id, trimestre }) => {
  const alunos = await db.query(
    `SELECT a.id, a.nome, a.numero_matricula
     FROM aluno_matriculas am JOIN alunos a ON am.aluno_id = a.id
     WHERE am.class_group_id = ? AND a.escola_id = ? AND am.status = 'activa'
     ORDER BY a.nome ASC`,
    [turma_id, tenantId])

  const notas = await db.query(
    `SELECT n.aluno_id, n.tipo, n.valor FROM notas n
     WHERE n.escola_id = ? AND n.turma_id = ? AND n.disciplina_id = ? AND n.trimestre = ?`,
    [tenantId, turma_id, disciplina_id, trimestre])

  const turmaInfo = await db.query(
    `SELECT cg.nome AS turma_nome, gl.nome AS classe_nome, s.nome AS disciplina_nome
     FROM class_groups cg JOIN grade_levels gl ON cg.grade_level_id = gl.id, subjects s
     WHERE cg.id = ? AND cg.escola_id = ? AND s.id = ?`,
    [turma_id, tenantId, disciplina_id])

  // agrupar notas por aluno
  const notasPorAluno = {}
  for (const n of notas.rows) {
    if (!notasPorAluno[n.aluno_id]) notasPorAluno[n.aluno_id] = {}
    notasPorAluno[n.aluno_id][n.tipo] = parseFloat(n.valor)
  }

  const pautas = alunos.rows.map(a => {
    const ns = notasPorAluno[a.id] || {}
    const vals = Object.values(ns).filter(v => v !== null)
    const media = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null
    return { ...a, notas: ns, media }
  })

  return { info: turmaInfo.rows[0] || {}, trimestre, alunos: pautas }
}

module.exports = {
  minhasTurmas,
  alunosDaTurma,
  listarNotas,
  lancarNotasLote,
  listarPresencas,
  registarPresencas,
  estatisticasPresenca,
  obterPauta,
}
