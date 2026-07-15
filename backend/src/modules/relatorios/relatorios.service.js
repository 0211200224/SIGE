const db = require('../../config/database')

const dashboard = async (tenantId) => {
  const [alunos, turmas, funcionarios, pagamentos] = await Promise.all([
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id = ?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM turmas WHERE escola_id = ?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM funcionarios WHERE escola_id = ? AND estado = ?', [tenantId, 'activo']),
    db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN estado='aprovado' THEN valor ELSE 0 END), 0) AS recebido,
         COALESCE(SUM(CASE WHEN estado='pendente' THEN valor ELSE 0 END), 0) AS pendente
       FROM pagamentos WHERE escola_id = ?`,
      [tenantId]
    ),
  ])
  return {
    total_alunos: parseInt(alunos.rows[0].total),
    total_turmas: parseInt(turmas.rows[0].total),
    funcionarios_activos: parseInt(funcionarios.rows[0].total),
    financeiro: pagamentos.rows[0],
  }
}

const academico = async (tenantId, filters = {}) => {
  const { turma_id, trimestre } = filters
  let sql = `SELECT d.nome AS disciplina, AVG(n.valor) AS media, COUNT(n.id) AS total_notas
             FROM notas n JOIN disciplinas d ON n.disciplina_id = d.id
             WHERE n.escola_id = ?`
  const params = [tenantId]
  if (turma_id) { sql += ' AND n.turma_id = ?'; params.push(turma_id) }
  if (trimestre) { sql += ' AND n.trimestre = ?'; params.push(trimestre) }
  sql += ' GROUP BY d.nome ORDER BY media DESC'
  const result = await db.query(sql, params)
  return result.rows
}

const financeiro = async (tenantId) => {
  const result = await db.query(
    `SELECT TO_CHAR(criado_em, 'YYYY-MM-01') AS mes,
            COALESCE(SUM(CASE WHEN estado='aprovado' THEN valor ELSE 0 END), 0) AS recebido,
            COALESCE(SUM(CASE WHEN estado='pendente' THEN valor ELSE 0 END), 0) AS pendente
     FROM pagamentos WHERE escola_id = ?
     GROUP BY TO_CHAR(criado_em, 'YYYY-MM-01')
     ORDER BY mes DESC LIMIT 12`,
    [tenantId]
  )
  return result.rows
}

const frequencia = async (tenantId, filters = {}) => {
  const { turma_id } = filters
  let sql = `SELECT a.nome,
                    COUNT(p.id) AS total_aulas,
                    SUM(CASE WHEN p.presente = 1 THEN 1 ELSE 0 END) AS presencas,
                    ROUND(SUM(CASE WHEN p.presente = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(p.id), 0), 1) AS taxa
             FROM alunos a
             LEFT JOIN presencas p ON a.id = p.aluno_id AND a.escola_id = p.escola_id
             WHERE a.escola_id = ?`
  const params = [tenantId]
  if (turma_id) { sql += ' AND a.turma_id = ?'; params.push(turma_id) }
  sql += ' GROUP BY a.nome ORDER BY taxa ASC'
  const result = await db.query(sql, params)
  return result.rows
}

const rh = async (tenantId) => {
  const result = await db.query(
    `SELECT departamento, COUNT(*) AS total, COALESCE(SUM(salario_base), 0) AS folha_salarial
     FROM funcionarios WHERE escola_id = ? GROUP BY departamento ORDER BY total DESC`,
    [tenantId]
  )
  return result.rows
}

module.exports = { dashboard, academico, financeiro, frequencia, rh }
