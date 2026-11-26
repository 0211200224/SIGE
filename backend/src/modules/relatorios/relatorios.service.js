const db = require('../../config/database')

const dashboard = async (tenantId) => {
  const [alunos, turmas, funcionarios, pagamentos] = await Promise.all([
    db.query('SELECT COUNT(*) AS total FROM alunos WHERE escola_id = ?', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM class_groups WHERE escola_id = ? AND activo = 1', [tenantId]),
    db.query('SELECT COUNT(*) AS total FROM funcionarios WHERE escola_id = ? AND estado = ?', [tenantId, 'activo']),
    // Mesma leitura do módulo Financeiro: o fluxo real grava sempre
    // 'confirmado' (nunca 'aprovado' sozinho), e a dívida vem das cobranças.
    db.query(
      `SELECT
         (SELECT COALESCE(SUM(valor), 0) FROM pagamentos
          WHERE escola_id = ? AND estado IN ('confirmado','aprovado') AND anulado = 0) AS recebido,
         (SELECT COALESCE(SUM(valor - valor_pago), 0) FROM cobrancas
          WHERE escola_id = ? AND status IN ('pendente','vencido','parcial')) AS pendente`,
      [tenantId, tenantId]
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
             FROM notas n JOIN subjects d ON n.disciplina_id = d.id
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
            COALESCE(SUM(CASE WHEN estado IN ('confirmado','aprovado') AND anulado = 0 THEN valor ELSE 0 END), 0) AS recebido,
            COALESCE(SUM(CASE WHEN estado IN ('pendente','em_analise') THEN valor ELSE 0 END), 0) AS pendente
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

// O salário vive no contrato activo (funcionarios.salario_base já não é
// preenchido no registo). Contrato diário conta como valor/dia x dias úteis.
const rh = async (tenantId) => {
  const result = await db.query(
    `SELECT COALESCE(d.nome, f.departamento, 'Sem departamento') AS departamento,
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN ct.regime_salarial = 'diario'
                              THEN ct.salario * COALESCE((SELECT dias_uteis_mes FROM rh_configuracao WHERE escola_id = f.escola_id), 22)
                              ELSE COALESCE(ct.salario, f.salario_base) END), 0) AS folha_salarial
     FROM funcionarios f
     LEFT JOIN departamentos d ON d.id = f.departamento_id
     LEFT JOIN contratos ct ON ct.id = (
       SELECT c2.id FROM contratos c2 WHERE c2.funcionario_id = f.id AND c2.estado = 'activo'
       ORDER BY c2.data_inicio DESC LIMIT 1)
     WHERE f.escola_id = ?
     GROUP BY COALESCE(d.nome, f.departamento, 'Sem departamento')
     ORDER BY total DESC`,
    [tenantId]
  )
  return result.rows
}

module.exports = { dashboard, academico, financeiro, frequencia, rh }
