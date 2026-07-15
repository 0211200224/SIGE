const db = require('../../config/database')

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const tid = (tenantId) => tenantId

// ─── STATS DASHBOARD ─────────────────────────────────────────────────────────
const obterStats = async (tenantId) => {
  const [classes, turmas, disciplinas, professores, atribuicoes, periodos, avaliacoes, resultados] = await Promise.all([
    db.query('SELECT COUNT(*) n FROM grade_levels WHERE escola_id = ? AND activo = 1', [tenantId]),
    db.query('SELECT COUNT(*) n FROM class_groups WHERE escola_id = ? AND activo = 1', [tenantId]),
    db.query('SELECT COUNT(*) n FROM subjects WHERE escola_id = ? AND activo = 1', [tenantId]),
    db.query("SELECT COUNT(*) n FROM utilizadores WHERE escola_id = ? AND role = 'professor' AND activo = 1", [tenantId]),
    db.query('SELECT COUNT(*) n FROM teaching_assignments WHERE escola_id = ? AND activo = 1', [tenantId]),
    db.query("SELECT COUNT(*) n FROM periodos_lectivos WHERE escola_id = ? AND status = 'aberto'", [tenantId]),
    db.query("SELECT COUNT(*) n FROM avaliacoes WHERE escola_id = ? AND status = 'activa'", [tenantId]),
    db.query("SELECT COUNT(*) n FROM resultados_finais WHERE escola_id = ? AND situacao = 'pendente'", [tenantId]),
  ])
  return {
    total_classes: classes.rows[0].n,
    total_turmas: turmas.rows[0].n,
    total_disciplinas: disciplinas.rows[0].n,
    total_professores: professores.rows[0].n,
    total_atribuicoes: atribuicoes.rows[0].n,
    periodos_abertos: periodos.rows[0].n,
    avaliacoes_activas: avaliacoes.rows[0].n,
    resultados_pendentes: resultados.rows[0].n,
  }
}

// ─── CLASSES (grade_levels) ───────────────────────────────────────────────────
const listarClasses = async (tenantId) => {
  const r = await db.query(
    'SELECT * FROM grade_levels WHERE escola_id = ? AND activo = 1 ORDER BY ordem ASC',
    [tenantId]
  )
  return r.rows
}

const criarClasse = async (tenantId, dados) => {
  const { nome, ordem, nivel_ensino } = dados
  const r = await db.query(
    'INSERT INTO grade_levels (escola_id, nome, ordem, nivel_ensino) VALUES (?, ?, ?, ?)',
    [tenantId, nome, parseInt(ordem), nivel_ensino || 'Secundário']
  )
  const f = await db.query('SELECT * FROM grade_levels WHERE id = ?', [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarClasse = async (tenantId, id, dados) => {
  const permitidos = ['nome', 'ordem', 'nivel_ensino', 'activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE grade_levels SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query('SELECT * FROM grade_levels WHERE id = ?', [id])
  return f.rows[0]
}

const removerClasse = async (tenantId, id) => {
  await db.query('UPDATE grade_levels SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── SALAS ────────────────────────────────────────────────────────────────────
const listarSalas = async (tenantId) => {
  const r = await db.query('SELECT * FROM salas WHERE escola_id = ? AND activo = 1 ORDER BY nome ASC', [tenantId])
  return r.rows
}

const criarSala = async (tenantId, dados) => {
  const { codigo, nome, tipo, capacidade } = dados
  const r = await db.query(
    'INSERT INTO salas (escola_id, codigo, nome, tipo, capacidade) VALUES (?, ?, ?, ?, ?)',
    [tenantId, codigo || null, nome, tipo || 'Sala de Aula', parseInt(capacidade) || 40]
  )
  const f = await db.query('SELECT * FROM salas WHERE id = ?', [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarSala = async (tenantId, id, dados) => {
  const permitidos = ['codigo', 'nome', 'tipo', 'capacidade', 'activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE salas SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query('SELECT * FROM salas WHERE id = ?', [id])
  return f.rows[0]
}

const removerSala = async (tenantId, id) => {
  await db.query('UPDATE salas SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── TURMAS ───────────────────────────────────────────────────────────────────
const listarTurmas = async (tenantId) => {
  const r = await db.query(
    `SELECT cg.*, gl.nome AS classe_nome, gl.nivel_ensino,
            s.nome AS sala_nome,
            COUNT(am.id) AS total_alunos
     FROM class_groups cg
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN salas s ON cg.room_id = s.id
     LEFT JOIN aluno_matriculas am ON am.class_group_id = cg.id AND am.status NOT IN ('cancelado')
     WHERE cg.escola_id = ? AND cg.activo = 1
     GROUP BY cg.id, gl.nome, gl.nivel_ensino, s.nome
     ORDER BY gl.ordem ASC, cg.nome ASC`,
    [tenantId]
  )
  return r.rows
}

const criarTurma = async (tenantId, dados) => {
  const { grade_level_id, room_id, nome, turno, capacidade, ano_lectivo, professor_director_id } = dados
  const r = await db.query(
    `INSERT INTO class_groups (escola_id, grade_level_id, room_id, nome, turno, capacidade, ano_lectivo, professor_director_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, grade_level_id, room_id || null, nome, turno || 'Manhã', parseInt(capacidade) || 40, ano_lectivo, professor_director_id || null]
  )
  const id = r.rows[0].insertId
  const f = await db.query(
    `SELECT cg.*, gl.nome AS classe_nome, s.nome AS sala_nome
     FROM class_groups cg LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id LEFT JOIN salas s ON cg.room_id = s.id
     WHERE cg.id = ?`, [id]
  )
  return f.rows[0]
}

const atualizarTurma = async (tenantId, id, dados) => {
  const permitidos = ['nome','turno','capacidade','ano_lectivo','room_id','grade_level_id','professor_director_id','activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE class_groups SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(`SELECT cg.*, gl.nome AS classe_nome FROM class_groups cg LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id WHERE cg.id = ?`, [id])
  return f.rows[0]
}

const removerTurma = async (tenantId, id) => {
  await db.query('UPDATE class_groups SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── DISCIPLINAS ──────────────────────────────────────────────────────────────
const listarDisciplinas = async (tenantId) => {
  const r = await db.query(
    `SELECT s.*, gl.nome AS classe_nome
     FROM subjects s LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id
     WHERE s.escola_id = ? AND s.activo = 1 ORDER BY s.nome ASC`,
    [tenantId]
  )
  return r.rows
}

const criarDisciplina = async (tenantId, dados) => {
  const { nome, codigo, grade_level_id, carga_horaria } = dados
  const r = await db.query(
    'INSERT INTO subjects (escola_id, nome, codigo, grade_level_id, carga_horaria) VALUES (?, ?, ?, ?, ?)',
    [tenantId, nome, codigo || null, grade_level_id || null, parseInt(carga_horaria) || 4]
  )
  const f = await db.query('SELECT s.*, gl.nome AS classe_nome FROM subjects s LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id WHERE s.id = ?', [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarDisciplina = async (tenantId, id, dados) => {
  const permitidos = ['nome','codigo','grade_level_id','carga_horaria','activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE subjects SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query('SELECT s.*, gl.nome AS classe_nome FROM subjects s LEFT JOIN grade_levels gl ON s.grade_level_id = gl.id WHERE s.id = ?', [id])
  return f.rows[0]
}

const removerDisciplina = async (tenantId, id) => {
  await db.query('UPDATE subjects SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── ATRIBUIÇÕES ──────────────────────────────────────────────────────────────
const listarAtribuicoes = async (tenantId, { ano_lectivo } = {}) => {
  let where = 'ta.escola_id = ? AND ta.activo = 1'
  const params = [tenantId]
  if (ano_lectivo) { where += ' AND ta.ano_lectivo = ?'; params.push(ano_lectivo) }
  const r = await db.query(
    `SELECT ta.*,
            u.nome AS professor_nome, u.email AS professor_email,
            cg.nome AS turma_nome, cg.turno, cg.ano_lectivo AS turma_ano,
            gl.nome AS classe_nome,
            s.nome AS disciplina_nome, s.codigo AS disciplina_codigo
     FROM teaching_assignments ta
     JOIN utilizadores u ON ta.professor_id = u.id
     JOIN class_groups cg ON ta.class_group_id = cg.id
     JOIN grade_levels gl ON cg.grade_level_id = gl.id
     JOIN subjects s ON ta.subject_id = s.id
     WHERE ${where}
     ORDER BY gl.ordem ASC, cg.nome ASC, s.nome ASC`,
    params
  )
  return r.rows
}

const criarAtribuicao = async (tenantId, dados) => {
  const { professor_id, class_group_id, subject_id, ano_lectivo, carga_horaria } = dados
  const existe = await db.query(
    'SELECT id FROM teaching_assignments WHERE escola_id = ? AND professor_id = ? AND class_group_id = ? AND subject_id = ? AND ano_lectivo = ? AND activo = 1',
    [tenantId, professor_id, class_group_id, subject_id, ano_lectivo]
  )
  if (existe.rows.length) throw new Error('Esta atribuição já existe')
  const r = await db.query(
    'INSERT INTO teaching_assignments (escola_id, professor_id, class_group_id, subject_id, ano_lectivo, carga_horaria) VALUES (?, ?, ?, ?, ?, ?)',
    [tenantId, professor_id, class_group_id, subject_id, ano_lectivo, carga_horaria || 4]
  )
  const f = await db.query(
    `SELECT ta.*, u.nome AS professor_nome, cg.nome AS turma_nome, s.nome AS disciplina_nome
     FROM teaching_assignments ta
     JOIN utilizadores u ON ta.professor_id = u.id JOIN class_groups cg ON ta.class_group_id = cg.id JOIN subjects s ON ta.subject_id = s.id
     WHERE ta.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarAtribuicao = async (tenantId, id, dados) => {
  const permitidos = ['carga_horaria']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE teaching_assignments SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(`SELECT ta.*, u.nome AS professor_nome, cg.nome AS turma_nome, s.nome AS disciplina_nome FROM teaching_assignments ta JOIN utilizadores u ON ta.professor_id = u.id JOIN class_groups cg ON ta.class_group_id = cg.id JOIN subjects s ON ta.subject_id = s.id WHERE ta.id = ?`, [id])
  return f.rows[0]
}

const removerAtribuicao = async (tenantId, id) => {
  await db.query('UPDATE teaching_assignments SET activo = 0 WHERE id = ? AND escola_id = ?', [id, tenantId])
}

const listarProfessores = async (tenantId) => {
  const r = await db.query(
    `SELECT id, nome, email FROM utilizadores WHERE escola_id = ? AND role = 'professor' AND activo = 1 ORDER BY nome ASC`,
    [tenantId]
  )
  return r.rows
}

// ─── PERÍODOS LECTIVOS ────────────────────────────────────────────────────────
const listarPeriodos = async (tenantId, { ano_lectivo } = {}) => {
  let where = 'escola_id = ?'
  const params = [tenantId]
  if (ano_lectivo) { where += ' AND ano_lectivo = ?'; params.push(ano_lectivo) }
  const r = await db.query(`SELECT * FROM periodos_lectivos WHERE ${where} ORDER BY ano_lectivo DESC, tipo ASC`, params)
  return r.rows
}

const criarPeriodo = async (tenantId, dados) => {
  const { nome, ano_lectivo, tipo, data_inicio, data_fim, nota_minima, frequencia_minima } = dados
  const r = await db.query(
    `INSERT INTO periodos_lectivos (escola_id, nome, ano_lectivo, tipo, data_inicio, data_fim, nota_minima, frequencia_minima)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, ano_lectivo, tipo || '1_trimestre', data_inicio || null, data_fim || null, nota_minima || 10.0, frequencia_minima || 75.0]
  )
  const f = await db.query('SELECT * FROM periodos_lectivos WHERE id = ?', [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarPeriodo = async (tenantId, id, dados) => {
  const permitidos = ['nome','data_inicio','data_fim','nota_minima','frequencia_minima']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE periodos_lectivos SET ${campos} WHERE id = ? AND escola_id = ? AND status = 'aberto'`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query('SELECT * FROM periodos_lectivos WHERE id = ?', [id])
  return f.rows[0]
}

const fecharPeriodo = async (tenantId, id) => {
  const p = await db.query('SELECT * FROM periodos_lectivos WHERE id = ? AND escola_id = ?', [id, tenantId])
  if (!p.rows.length) throw new Error('Período não encontrado')
  if (p.rows[0].status === 'fechado') throw new Error('Período já está fechado')
  await db.query("UPDATE periodos_lectivos SET status = 'fechado' WHERE id = ? AND escola_id = ?", [id, tenantId])
  return { message: 'Período fechado com sucesso' }
}

const reabrirPeriodo = async (tenantId, id) => {
  await db.query("UPDATE periodos_lectivos SET status = 'aberto' WHERE id = ? AND escola_id = ?", [id, tenantId])
  return { message: 'Período reaberto' }
}

// ─── PLANOS CURRICULARES ──────────────────────────────────────────────────────
const listarPlanosCurriculares = async (tenantId, { grade_level_id, ano_lectivo } = {}) => {
  let where = 'pc.escola_id = ?'
  const params = [tenantId]
  if (grade_level_id) { where += ' AND pc.grade_level_id = ?'; params.push(grade_level_id) }
  if (ano_lectivo) { where += ' AND pc.ano_lectivo = ?'; params.push(ano_lectivo) }
  const r = await db.query(
    `SELECT pc.*, gl.nome AS classe_nome, s.nome AS disciplina_nome, s.codigo AS disciplina_codigo
     FROM planos_curriculares pc
     JOIN grade_levels gl ON pc.grade_level_id = gl.id
     JOIN subjects s ON pc.subject_id = s.id
     WHERE ${where}
     ORDER BY gl.ordem ASC, s.nome ASC`,
    params
  )
  return r.rows
}

const criarPlanoCurricular = async (tenantId, dados) => {
  const { grade_level_id, subject_id, tipo, carga_horaria, ano_lectivo } = dados
  const r = await db.query(
    `INSERT INTO planos_curriculares (escola_id, grade_level_id, subject_id, tipo, carga_horaria, ano_lectivo)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (escola_id, grade_level_id, subject_id, ano_lectivo) DO UPDATE SET tipo = EXCLUDED.tipo, carga_horaria = EXCLUDED.carga_horaria`,
    [tenantId, grade_level_id, subject_id, tipo || 'obrigatoria', carga_horaria || 4, ano_lectivo || null]
  )
  const f = await db.query(
    `SELECT pc.*, gl.nome AS classe_nome, s.nome AS disciplina_nome FROM planos_curriculares pc
     JOIN grade_levels gl ON pc.grade_level_id = gl.id JOIN subjects s ON pc.subject_id = s.id
     WHERE pc.id = ? OR (pc.escola_id = ? AND pc.grade_level_id = ? AND pc.subject_id = ?)`,
    [r.rows[0].insertId || 0, tenantId, grade_level_id, subject_id]
  )
  return f.rows[0]
}

const removerPlanoCurricular = async (tenantId, id) => {
  await db.query('DELETE FROM planos_curriculares WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── AVALIAÇÕES ───────────────────────────────────────────────────────────────
const listarAvaliacoes = async (tenantId, { periodo_id, class_group_id, subject_id } = {}) => {
  let where = 'a.escola_id = ?'
  const params = [tenantId]
  if (periodo_id) { where += ' AND a.periodo_id = ?'; params.push(periodo_id) }
  if (class_group_id) { where += ' AND a.class_group_id = ?'; params.push(class_group_id) }
  if (subject_id) { where += ' AND a.subject_id = ?'; params.push(subject_id) }
  const r = await db.query(
    `SELECT a.*,
            s.nome AS disciplina_nome,
            cg.nome AS turma_nome,
            p.nome AS periodo_nome, p.tipo AS periodo_tipo
     FROM avaliacoes a
     LEFT JOIN subjects s ON a.subject_id = s.id
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN periodos_lectivos p ON a.periodo_id = p.id
     WHERE ${where}
     ORDER BY a.data_programada ASC, a.nome ASC`,
    params
  )
  return r.rows
}

const criarAvaliacao = async (tenantId, dados) => {
  const { nome, tipo, subject_id, class_group_id, periodo_id, peso, data_programada } = dados
  const r = await db.query(
    `INSERT INTO avaliacoes (escola_id, nome, tipo, subject_id, class_group_id, periodo_id, peso, data_programada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, tipo || 'teste', subject_id || null, class_group_id || null, periodo_id || null, peso || 100, data_programada || null]
  )
  const f = await db.query(
    `SELECT a.*, s.nome AS disciplina_nome, cg.nome AS turma_nome, p.nome AS periodo_nome
     FROM avaliacoes a LEFT JOIN subjects s ON a.subject_id = s.id LEFT JOIN class_groups cg ON a.class_group_id = cg.id LEFT JOIN periodos_lectivos p ON a.periodo_id = p.id
     WHERE a.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarAvaliacao = async (tenantId, id, dados) => {
  const permitidos = ['nome','tipo','subject_id','class_group_id','periodo_id','peso','data_programada','status']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE avaliacoes SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(`SELECT a.*, s.nome AS disciplina_nome, cg.nome AS turma_nome FROM avaliacoes a LEFT JOIN subjects s ON a.subject_id = s.id LEFT JOIN class_groups cg ON a.class_group_id = cg.id WHERE a.id = ?`, [id])
  return f.rows[0]
}

const removerAvaliacao = async (tenantId, id) => {
  await db.query('DELETE FROM avaliacoes WHERE id = ? AND escola_id = ?', [id, tenantId])
}

// ─── VALIDAÇÃO DE NOTAS ───────────────────────────────────────────────────────
const listarValidacaoNotas = async (tenantId, { class_group_id, disciplina_id, trimestre } = {}) => {
  let where = 'n.escola_id = ?'
  const params = [tenantId]
  if (class_group_id) { where += ' AND n.turma_id = ?'; params.push(class_group_id) }
  if (disciplina_id) { where += ' AND n.disciplina_id = ?'; params.push(disciplina_id) }
  if (trimestre) { where += ' AND n.trimestre = ?'; params.push(trimestre) }

  const r = await db.query(
    `SELECT n.turma_id, n.disciplina_id, n.trimestre,
            s.nome AS disciplina_nome,
            COUNT(DISTINCT n.aluno_id) AS total_alunos_com_notas,
            COUNT(n.id) AS total_notas,
            ROUND(AVG(n.valor), 1) AS media_turma,
            MIN(n.valor) AS nota_min,
            MAX(n.valor) AS nota_max
     FROM notas n
     LEFT JOIN subjects s ON n.disciplina_id = s.id
     WHERE ${where}
     GROUP BY n.turma_id, n.disciplina_id, n.trimestre, s.nome
     ORDER BY n.trimestre ASC, s.nome ASC`,
    params
  )
  return r.rows
}

const obterNotasAluno = async (tenantId, alunoId, { class_group_id, trimestre } = {}) => {
  let where = 'n.escola_id = ? AND n.aluno_id = ?'
  const params = [tenantId, alunoId]
  if (class_group_id) { where += ' AND n.turma_id = ?'; params.push(class_group_id) }
  if (trimestre) { where += ' AND n.trimestre = ?'; params.push(trimestre) }
  const r = await db.query(
    `SELECT n.*, s.nome AS disciplina_nome, a.nome AS aluno_nome
     FROM notas n LEFT JOIN subjects s ON n.disciplina_id = s.id JOIN alunos a ON n.aluno_id = a.id
     WHERE ${where} ORDER BY s.nome ASC, n.trimestre ASC`,
    params
  )
  return r.rows
}

// ─── FREQUÊNCIA ───────────────────────────────────────────────────────────────
const obterFrequencia = async (tenantId, { class_group_id, disciplina_id } = {}) => {
  let where = 'p.escola_id = ?'
  const params = [tenantId]
  if (class_group_id) { where += ' AND p.turma_id = ?'; params.push(class_group_id) }
  if (disciplina_id) { where += ' AND p.disciplina_id = ?'; params.push(disciplina_id) }

  const r = await db.query(
    `SELECT p.turma_id, p.disciplina_id, p.aluno_id,
            a.nome AS aluno_nome,
            s.nome AS disciplina_nome,
            COUNT(*) AS total_aulas,
            SUM(p.presente) AS presencas,
            SUM(CASE WHEN p.presente = 0 THEN 1 ELSE 0 END) AS faltas,
            SUM(p.justificada) AS faltas_justificadas,
            ROUND((SUM(p.presente) / COUNT(*)) * 100, 1) AS taxa_presenca
     FROM presencas p
     JOIN alunos a ON p.aluno_id = a.id
     LEFT JOIN subjects s ON p.disciplina_id = s.id
     WHERE ${where}
     GROUP BY p.turma_id, p.disciplina_id, p.aluno_id, a.nome, s.nome
     ORDER BY s.nome ASC, a.nome ASC`,
    params
  )
  return r.rows
}

// ─── CONSELHOS DE CLASSE ──────────────────────────────────────────────────────
const listarConselhos = async (tenantId, { class_group_id, periodo_id } = {}) => {
  let where = 'cc.escola_id = ?'
  const params = [tenantId]
  if (class_group_id) { where += ' AND cc.class_group_id = ?'; params.push(class_group_id) }
  if (periodo_id) { where += ' AND cc.periodo_id = ?'; params.push(periodo_id) }
  const r = await db.query(
    `SELECT cc.*,
            cg.nome AS turma_nome,
            gl.nome AS classe_nome,
            p.nome AS periodo_nome,
            u.nome AS criado_por_nome
     FROM conselhos_classe cc
     JOIN class_groups cg ON cc.class_group_id = cg.id
     JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN periodos_lectivos p ON cc.periodo_id = p.id
     LEFT JOIN utilizadores u ON cc.criado_por = u.id
     WHERE ${where}
     ORDER BY cc.criado_em DESC`,
    params
  )
  return r.rows
}

const criarConselho = async (tenantId, userId, dados) => {
  const { class_group_id, periodo_id, data, observacoes, decisoes, alunos_risco } = dados
  const r = await db.query(
    `INSERT INTO conselhos_classe (escola_id, class_group_id, periodo_id, data, observacoes, decisoes, alunos_risco, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, class_group_id, periodo_id || null, data || null, observacoes || null, decisoes || null, alunos_risco || null, userId]
  )
  const f = await db.query(
    `SELECT cc.*, cg.nome AS turma_nome, p.nome AS periodo_nome
     FROM conselhos_classe cc JOIN class_groups cg ON cc.class_group_id = cg.id LEFT JOIN periodos_lectivos p ON cc.periodo_id = p.id
     WHERE cc.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarConselho = async (tenantId, id, dados) => {
  const permitidos = ['data','observacoes','decisoes','alunos_risco','status']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (!Object.keys(filtrado).length) return
  const campos = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE conselhos_classe SET ${campos} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query('SELECT cc.*, cg.nome AS turma_nome FROM conselhos_classe cc JOIN class_groups cg ON cc.class_group_id = cg.id WHERE cc.id = ?', [id])
  return f.rows[0]
}

// ─── RESULTADOS FINAIS ────────────────────────────────────────────────────────
const calcularResultados = async (tenantId, { class_group_id, periodo_id }) => {
  if (!class_group_id || !periodo_id) throw new Error('Turma e período são obrigatórios')

  const periodo = await db.query('SELECT * FROM periodos_lectivos WHERE id = ? AND escola_id = ?', [periodo_id, tenantId])
  if (!periodo.rows.length) throw new Error('Período não encontrado')
  const p = periodo.rows[0]

  const alunos = await db.query(
    `SELECT am.aluno_id, a.nome FROM aluno_matriculas am JOIN alunos a ON am.aluno_id = a.id
     WHERE am.class_group_id = ? AND am.escola_id = ? AND am.status = 'matriculado'`,
    [class_group_id, tenantId]
  )

  let processados = 0
  for (const al of alunos.rows) {
    const notasRes = await db.query(
      'SELECT AVG(valor) media FROM notas WHERE escola_id = ? AND aluno_id = ? AND turma_id = ?',
      [tenantId, al.aluno_id, class_group_id]
    )
    const freqRes = await db.query(
      `SELECT ROUND((SUM(presente)/COUNT(*))*100,1) AS taxa FROM presencas WHERE escola_id = ? AND aluno_id = ? AND turma_id = ?`,
      [tenantId, al.aluno_id, class_group_id]
    )
    const media = notasRes.rows[0].media || 0
    const freq = freqRes.rows[0].taxa || 0
    let situacao = 'pendente'
    if (media > 0 || freq > 0) {
      if (freq < p.frequencia_minima) situacao = 'reprovado'
      else if (media >= p.nota_minima) situacao = 'aprovado'
      else if (media >= p.nota_minima - 3) situacao = 'exame'
      else situacao = 'reprovado'
    }
    await db.query(
      `INSERT INTO resultados_finais (escola_id, aluno_id, class_group_id, periodo_id, media_final, frequencia_pct, situacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (escola_id, aluno_id, class_group_id, periodo_id) DO UPDATE SET media_final = EXCLUDED.media_final, frequencia_pct = EXCLUDED.frequencia_pct, situacao = EXCLUDED.situacao`,
      [tenantId, al.aluno_id, class_group_id, periodo_id, parseFloat(media.toFixed(1)), freq, situacao]
    )
    processados++
  }
  return { processados, total: alunos.rows.length }
}

const listarResultados = async (tenantId, { class_group_id, periodo_id, situacao } = {}) => {
  let where = 'rf.escola_id = ?'
  const params = [tenantId]
  if (class_group_id) { where += ' AND rf.class_group_id = ?'; params.push(class_group_id) }
  if (periodo_id) { where += ' AND rf.periodo_id = ?'; params.push(periodo_id) }
  if (situacao) { where += ' AND rf.situacao = ?'; params.push(situacao) }
  const r = await db.query(
    `SELECT rf.*,
            a.nome AS aluno_nome, a.numero_matricula,
            cg.nome AS turma_nome,
            p.nome AS periodo_nome, p.tipo AS periodo_tipo
     FROM resultados_finais rf
     JOIN alunos a ON rf.aluno_id = a.id
     JOIN class_groups cg ON rf.class_group_id = cg.id
     JOIN periodos_lectivos p ON rf.periodo_id = p.id
     WHERE ${where}
     ORDER BY a.nome ASC`,
    params
  )
  return r.rows
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────
const obterRelatorio = async (tenantId, tipo, { class_group_id, periodo_id, disciplina_id, ano_lectivo } = {}) => {
  if (tipo === 'desempenho_turma') {
    const r = await db.query(
      `SELECT cg.nome AS turma, gl.nome AS classe,
              COUNT(DISTINCT rf.aluno_id) AS total_alunos,
              ROUND(AVG(rf.media_final), 1) AS media_geral,
              SUM(CASE WHEN rf.situacao = 'aprovado' THEN 1 ELSE 0 END) AS aprovados,
              SUM(CASE WHEN rf.situacao = 'reprovado' THEN 1 ELSE 0 END) AS reprovados,
              SUM(CASE WHEN rf.situacao = 'exame' THEN 1 ELSE 0 END) AS exame,
              ROUND(SUM(CASE WHEN rf.situacao = 'aprovado' THEN 1 ELSE 0 END)/COUNT(*)*100, 1) AS taxa_aprovacao
       FROM resultados_finais rf
       JOIN class_groups cg ON rf.class_group_id = cg.id
       JOIN grade_levels gl ON cg.grade_level_id = gl.id
       WHERE rf.escola_id = ?
       ${periodo_id ? 'AND rf.periodo_id = ?' : ''}
       GROUP BY cg.id, cg.nome, gl.nome
       ORDER BY taxa_aprovacao DESC`,
      periodo_id ? [tenantId, periodo_id] : [tenantId]
    )
    return r.rows
  }

  if (tipo === 'desempenho_disciplina') {
    const r = await db.query(
      `SELECT s.nome AS disciplina,
              COUNT(n.id) AS total_notas,
              ROUND(AVG(n.valor), 1) AS media,
              MIN(n.valor) AS nota_min,
              MAX(n.valor) AS nota_max,
              SUM(CASE WHEN n.valor >= 10 THEN 1 ELSE 0 END) AS acima_media
       FROM notas n
       JOIN subjects s ON n.disciplina_id = s.id
       WHERE n.escola_id = ?
       GROUP BY s.id, s.nome
       ORDER BY media DESC`,
      [tenantId]
    )
    return r.rows
  }

  if (tipo === 'frequencia_geral') {
    const r = await db.query(
      `SELECT cg.nome AS turma,
              a.nome AS aluno,
              COUNT(*) AS total_aulas,
              SUM(p.presente) AS presencas,
              ROUND((SUM(p.presente)/COUNT(*))*100, 1) AS taxa_presenca
       FROM presencas p
       JOIN alunos a ON p.aluno_id = a.id
       JOIN class_groups cg ON p.turma_id = cg.id
       WHERE p.escola_id = ?
       ${class_group_id ? 'AND p.turma_id = ?' : ''}
       GROUP BY cg.id, cg.nome, a.id, a.nome
       ORDER BY taxa_presenca ASC`,
      class_group_id ? [tenantId, class_group_id] : [tenantId]
    )
    return r.rows
  }

  if (tipo === 'taxa_aprovacao') {
    const r = await db.query(
      `SELECT p.nome AS periodo, p.tipo,
              COUNT(*) AS total,
              SUM(CASE WHEN rf.situacao = 'aprovado' THEN 1 ELSE 0 END) AS aprovados,
              SUM(CASE WHEN rf.situacao = 'reprovado' THEN 1 ELSE 0 END) AS reprovados,
              SUM(CASE WHEN rf.situacao = 'exame' THEN 1 ELSE 0 END) AS exame,
              ROUND(SUM(CASE WHEN rf.situacao = 'aprovado' THEN 1 ELSE 0 END)/COUNT(*)*100, 1) AS taxa
       FROM resultados_finais rf
       JOIN periodos_lectivos p ON rf.periodo_id = p.id
       WHERE rf.escola_id = ?
       GROUP BY p.id, p.nome, p.tipo
       ORDER BY p.criado_em DESC`,
      [tenantId]
    )
    return r.rows
  }

  return []
}

// ─── RANKING ──────────────────────────────────────────────────────────────────
const obterRanking = async (tenantId, { class_group_id, periodo_id } = {}) => {
  let where = 'n.escola_id = ?'
  const params = [tenantId]
  if (class_group_id) { where += ' AND n.turma_id = ?'; params.push(class_group_id) }
  if (periodo_id) { where += ' AND n.trimestre = ?'; params.push(periodo_id) }
  const r = await db.query(
    `SELECT a.nome AS aluno, a.numero_matricula,
            COUNT(DISTINCT n.disciplina_id) AS total_disciplinas,
            ROUND(AVG(n.valor), 1) AS media,
            MAX(n.valor) AS nota_max,
            MIN(n.valor) AS nota_min
     FROM notas n
     JOIN alunos a ON n.aluno_id = a.id
     WHERE ${where}
     GROUP BY a.id, a.nome, a.numero_matricula
     ORDER BY media DESC
     LIMIT 50`,
    params
  )
  return r.rows
}

module.exports = {
  obterStats,
  listarClasses, criarClasse, atualizarClasse, removerClasse,
  listarSalas, criarSala, atualizarSala, removerSala,
  listarTurmas, criarTurma, atualizarTurma, removerTurma,
  listarDisciplinas, criarDisciplina, atualizarDisciplina, removerDisciplina,
  listarAtribuicoes, criarAtribuicao, atualizarAtribuicao, removerAtribuicao,
  listarProfessores,
  listarPeriodos, criarPeriodo, atualizarPeriodo, fecharPeriodo, reabrirPeriodo,
  listarPlanosCurriculares, criarPlanoCurricular, removerPlanoCurricular,
  listarAvaliacoes, criarAvaliacao, atualizarAvaliacao, removerAvaliacao,
  listarValidacaoNotas, obterNotasAluno,
  obterFrequencia,
  listarConselhos, criarConselho, atualizarConselho,
  calcularResultados, listarResultados,
  obterRelatorio,
  obterRanking,
}
