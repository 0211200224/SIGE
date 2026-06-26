const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')

// ─── STATS ────────────────────────────────────────────────────────────────────

const obterStats = async (tenantId) => {
  const [total, activos, suspensos, transferidos, novasMatriculas, docs, solicitacoes, turmas] = await Promise.all([
    db.query('SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ?', [tenantId]),
    db.query("SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ? AND status = 'activo'", [tenantId]),
    db.query("SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ? AND status = 'suspenso'", [tenantId]),
    db.query("SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ? AND status = 'transferido'", [tenantId]),
    db.query(
      "SELECT COUNT(*) AS n FROM aluno_matriculas WHERE escola_id = ? AND YEAR(criado_em) = YEAR(CURDATE())",
      [tenantId]
    ),
    db.query("SELECT COUNT(*) AS n FROM aluno_documentos WHERE escola_id = ? AND status = 'pendente'", [tenantId]),
    db.query("SELECT COUNT(*) AS n FROM solicitacoes WHERE escola_id = ? AND status = 'pendente'", [tenantId]),
    db.query('SELECT COUNT(*) AS n FROM class_groups WHERE escola_id = ? AND activo = 1', [tenantId]),
  ])
  return {
    total_alunos: total.rows[0].n,
    alunos_activos: activos.rows[0].n,
    alunos_suspensos: suspensos.rows[0].n,
    alunos_transferidos: transferidos.rows[0].n,
    novas_matriculas: novasMatriculas.rows[0].n,
    documentos_pendentes: docs.rows[0].n,
    solicitacoes_pendentes: solicitacoes.rows[0].n,
    total_turmas: turmas.rows[0].n,
  }
}

// ─── ALUNOS ───────────────────────────────────────────────────────────────────

const listarAlunos = async (tenantId, { search, status, class_group_id } = {}) => {
  let where = 'a.escola_id = ?'
  const params = [tenantId]
  if (search) {
    where += ' AND (a.nome LIKE ? OR a.numero_matricula LIKE ? OR a.telefone LIKE ?)'
    const s = `%${search}%`
    params.push(s, s, s)
  }
  if (status) { where += ' AND a.status = ?'; params.push(status) }
  if (class_group_id) { where += ' AND a.class_group_id = ?'; params.push(class_group_id) }

  const r = await db.query(
    `SELECT a.id, a.escola_id, a.nome, a.foto, a.data_nascimento, a.genero,
            a.telefone, a.email, a.bi, a.naturalidade, a.nacionalidade,
            a.endereco, a.nome_encarregado, a.tel_encarregado, a.parentesco,
            a.curso, a.turno, a.ano_lectivo,
            a.status, a.class_group_id, a.numero_matricula, a.criado_em,
            cg.nome AS turma_nome,
            gl.nome AS classe_nome,
            u.codigo AS codigo_acesso
     FROM alunos a
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN utilizadores u ON u.aluno_id = a.id AND u.escola_id = a.escola_id
     WHERE ${where}
     ORDER BY a.nome ASC`,
    params
  )
  return r.rows
}

const obterAluno = async (tenantId, id) => {
  const r = await db.query(
    `SELECT a.*,
            cg.nome AS turma_nome,
            gl.nome AS classe_nome,
            u.codigo AS codigo_acesso
     FROM alunos a
     LEFT JOIN class_groups cg ON a.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN utilizadores u ON u.aluno_id = a.id AND u.escola_id = a.escola_id
     WHERE a.id = ? AND a.escola_id = ?`,
    [id, tenantId]
  )
  if (!r.rows[0]) { const e = new Error('Aluno não encontrado'); e.status = 404; throw e }

  const [matriculas, docs, encarregados, solicitacoes, transferencias] = await Promise.all([
    db.query(
      `SELECT am.*, cg.nome AS turma_nome, gl.nome AS classe_nome
       FROM aluno_matriculas am
       LEFT JOIN class_groups cg ON am.class_group_id = cg.id
       LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
       WHERE am.aluno_id = ? AND am.escola_id = ?
       ORDER BY am.id DESC`,
      [id, tenantId]
    ),
    db.query(
      'SELECT * FROM aluno_documentos WHERE aluno_id = ? AND escola_id = ? ORDER BY criado_em DESC',
      [id, tenantId]
    ),
    db.query(
      `SELECT e.*, ae.principal
       FROM encarregados e
       JOIN aluno_encarregados ae ON ae.encarregado_id = e.id
       WHERE ae.aluno_id = ? AND e.escola_id = ?
       ORDER BY ae.principal DESC, e.nome ASC`,
      [id, tenantId]
    ),
    db.query(
      'SELECT * FROM solicitacoes WHERE aluno_id = ? AND escola_id = ? ORDER BY criado_em DESC LIMIT 10',
      [id, tenantId]
    ),
    db.query(
      `SELECT t.*,
              cgo.nome AS turma_origem_nome,
              cgd.nome AS turma_destino_nome
       FROM transferencias t
       LEFT JOIN class_groups cgo ON t.class_group_origem_id = cgo.id
       LEFT JOIN class_groups cgd ON t.class_group_destino_id = cgd.id
       WHERE t.aluno_id = ? AND t.escola_id = ?
       ORDER BY t.data DESC`,
      [id, tenantId]
    ),
  ])

  return {
    ...r.rows[0],
    matriculas: matriculas.rows,
    documentos: docs.rows,
    encarregados: encarregados.rows,
    solicitacoes: solicitacoes.rows,
    transferencias: transferencias.rows,
  }
}

const criarAluno = async (tenantId, dados) => {
  const {
    nome, foto, data_nascimento, genero, naturalidade, nacionalidade, bi,
    telefone, email, endereco, curso, turno, ano_lectivo,
    nome_encarregado, tel_encarregado, parentesco, class_group_id,
  } = dados

  const count = await db.query('SELECT COUNT(*) AS n FROM alunos WHERE escola_id = ?', [tenantId])
  const seq = String(Number(count.rows[0].n) + 1).padStart(4, '0')
  const ano = new Date().getFullYear()
  const numero_matricula = `${tenantId}-${ano}-${seq}`

  const r = await db.query(
    `INSERT INTO alunos (escola_id, nome, foto, data_nascimento, genero, naturalidade, nacionalidade, bi,
       telefone, email, endereco, curso, turno, ano_lectivo,
       nome_encarregado, tel_encarregado, parentesco, class_group_id, numero_matricula, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [tenantId, nome, foto || null, data_nascimento || null, genero || null,
     naturalidade || null, nacionalidade || 'Moçambicana', bi || null,
     telefone || null, email || null, endereco || null,
     curso || null, turno || null, ano_lectivo || String(ano),
     nome_encarregado || null, tel_encarregado || null,
     parentesco || null, class_group_id || null, numero_matricula]
  )
  const alunoId = r.rows[0].insertId

  try {
    const codigo = await gerarCodigo(tenantId, 'aluno')
    const senhaPadrao = data_nascimento ? senhaDeNascimento(data_nascimento) : 'sige2024'
    const hash = await bcrypt.hash(senhaPadrao, 12)
    await db.query(
      'INSERT INTO utilizadores (escola_id, nome, password_hash, role, codigo, aluno_id, primeiro_login, data_nascimento) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      [tenantId, nome, hash, 'aluno', codigo, alunoId, data_nascimento || null]
    )
    const aluno = await obterAluno(tenantId, alunoId)
    return { ...aluno, codigo_acesso: codigo, senha_padrao: senhaPadrao }
  } catch (_) {
    return obterAluno(tenantId, alunoId)
  }
}

const atualizarAluno = async (tenantId, id, dados) => {
  const permitidos = [
    'nome','foto','data_nascimento','genero','naturalidade','nacionalidade','bi',
    'telefone','email','endereco','curso','turno','ano_lectivo',
    'nome_encarregado','tel_encarregado','parentesco','class_group_id','status'
  ]
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (Object.keys(filtrado).length === 0) return obterAluno(tenantId, id)
  const fields = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(
    `UPDATE alunos SET ${fields} WHERE id = ? AND escola_id = ?`,
    [...Object.values(filtrado), id, tenantId]
  )
  return obterAluno(tenantId, id)
}

const alterarStatusAluno = async (tenantId, id, status) => {
  const validos = ['activo', 'inactivo', 'suspenso', 'transferido', 'concluido', 'desistente']
  if (!validos.includes(status)) throw new Error('Status inválido')
  await db.query('UPDATE alunos SET status = ? WHERE id = ? AND escola_id = ?', [status, id, tenantId])
  return obterAluno(tenantId, id)
}

// ─── ENCARREGADOS ─────────────────────────────────────────────────────────────

const listarEncarregados = async (tenantId, { search, aluno_id } = {}) => {
  if (aluno_id) {
    const r = await db.query(
      `SELECT e.*, ae.principal
       FROM encarregados e
       JOIN aluno_encarregados ae ON ae.encarregado_id = e.id
       WHERE ae.aluno_id = ? AND e.escola_id = ?
       ORDER BY ae.principal DESC, e.nome ASC`,
      [aluno_id, tenantId]
    )
    return r.rows
  }
  let where = 'escola_id = ?'
  const params = [tenantId]
  if (search) { where += ' AND nome LIKE ?'; params.push(`%${search}%`) }
  const r = await db.query(`SELECT * FROM encarregados WHERE ${where} ORDER BY nome ASC`, params)
  return r.rows
}

const criarEncarregado = async (tenantId, dados) => {
  const { nome, parentesco, telefone, email, endereco, profissao, aluno_id, principal } = dados
  const r = await db.query(
    'INSERT INTO encarregados (escola_id, nome, parentesco, telefone, email, endereco, profissao) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [tenantId, nome, parentesco || 'Pai/Mãe', telefone || null, email || null, endereco || null, profissao || null]
  )
  const encarregadoId = r.rows[0].insertId
  if (aluno_id) {
    await db.query(
      'INSERT IGNORE INTO aluno_encarregados (aluno_id, encarregado_id, principal) VALUES (?, ?, ?)',
      [aluno_id, encarregadoId, principal ? 1 : 0]
    )
  }
  const f = await db.query('SELECT * FROM encarregados WHERE id = ?', [encarregadoId])
  return f.rows[0]
}

const atualizarEncarregado = async (tenantId, id, dados) => {
  const { nome, parentesco, telefone, email, endereco, profissao } = dados
  await db.query(
    'UPDATE encarregados SET nome=?, parentesco=?, telefone=?, email=?, endereco=?, profissao=? WHERE id=? AND escola_id=?',
    [nome, parentesco || 'Pai/Mãe', telefone || null, email || null, endereco || null, profissao || null, id, tenantId]
  )
  const f = await db.query('SELECT * FROM encarregados WHERE id = ?', [id])
  return f.rows[0]
}

const associarEncarregadoAluno = async (tenantId, alunoId, encarregadoId, principal) => {
  await db.query(
    'INSERT INTO aluno_encarregados (aluno_id, encarregado_id, principal) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE principal = VALUES(principal)',
    [alunoId, encarregadoId, principal ? 1 : 0]
  )
}

const removerEncarregadoAluno = async (tenantId, alunoId, encarregadoId) => {
  await db.query('DELETE FROM aluno_encarregados WHERE aluno_id = ? AND encarregado_id = ?', [alunoId, encarregadoId])
}

// ─── MATRÍCULAS ───────────────────────────────────────────────────────────────

const listarMatriculas = async (tenantId, { ano_lectivo, status, class_group_id } = {}) => {
  let where = 'am.escola_id = ?'
  const params = [tenantId]
  if (ano_lectivo) { where += ' AND am.ano_lectivo = ?'; params.push(ano_lectivo) }
  if (status) { where += ' AND am.status = ?'; params.push(status) }
  if (class_group_id) { where += ' AND am.class_group_id = ?'; params.push(class_group_id) }

  const r = await db.query(
    `SELECT am.*,
            a.nome AS aluno_nome, a.numero_matricula AS aluno_numero, a.genero, a.status AS aluno_status,
            cg.nome AS turma_nome, cg.turno,
            gl.nome AS classe_nome
     FROM aluno_matriculas am
     JOIN alunos a ON am.aluno_id = a.id
     LEFT JOIN class_groups cg ON am.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     WHERE ${where}
     ORDER BY am.id DESC`,
    params
  )
  return r.rows
}

const criarMatricula = async (tenantId, dados) => {
  const { aluno_id, class_group_id, ano_lectivo, turno, observacoes } = dados

  const existe = await db.query(
    "SELECT id FROM aluno_matriculas WHERE aluno_id = ? AND ano_lectivo = ? AND status NOT IN ('cancelado')",
    [aluno_id, ano_lectivo]
  )
  if (existe.rows[0]) {
    const e = new Error('Aluno já tem matrícula activa para este ano lectivo'); e.status = 409; throw e
  }

  const count = await db.query('SELECT COUNT(*) AS n FROM aluno_matriculas WHERE escola_id = ?', [tenantId])
  const seq = String(Number(count.rows[0].n) + 1).padStart(5, '0')
  const numero_matricula = `MAT-${ano_lectivo}-${seq}`

  const r = await db.query(
    `INSERT INTO aluno_matriculas (escola_id, aluno_id, class_group_id, ano_lectivo, numero_matricula, turno, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, aluno_id, class_group_id, ano_lectivo, numero_matricula, turno || null, observacoes || null]
  )
  await db.query(
    'UPDATE alunos SET class_group_id = ?, ano_lectivo = ?, status = "activo" WHERE id = ? AND escola_id = ?',
    [class_group_id, ano_lectivo, aluno_id, tenantId]
  )
  const f = await db.query(
    `SELECT am.*, a.nome AS aluno_nome, cg.nome AS turma_nome, gl.nome AS classe_nome
     FROM aluno_matriculas am
     JOIN alunos a ON am.aluno_id = a.id
     LEFT JOIN class_groups cg ON am.class_group_id = cg.id
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     WHERE am.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const cancelarMatricula = async (tenantId, id) => {
  await db.query(
    "UPDATE aluno_matriculas SET status = 'cancelado' WHERE id = ? AND escola_id = ?",
    [id, tenantId]
  )
}

// ─── TURMAS (visão + gestão secretaria) ───────────────────────────────────────

const listarTurmasSecretaria = async (tenantId, filtros = {}) => {
  const { ano_lectivo } = filtros
  let where = 'cg.escola_id = ? AND cg.activo = 1'
  const params = [tenantId]
  if (ano_lectivo) { where += ' AND cg.ano_lectivo = ?'; params.push(ano_lectivo) }
  const r = await db.query(
    `SELECT cg.*,
            gl.nome AS classe_nome, gl.nivel_ensino,
            s.nome AS sala_nome,
            COUNT(am.id) AS total_alunos
     FROM class_groups cg
     LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
     LEFT JOIN salas s ON cg.room_id = s.id
     LEFT JOIN aluno_matriculas am ON am.class_group_id = cg.id AND am.status NOT IN ('cancelado')
     WHERE ${where}
     GROUP BY cg.id, gl.nome, gl.nivel_ensino, s.nome
     ORDER BY gl.ordem ASC, cg.nome ASC`,
    params
  )
  return r.rows
}

const criarTurma = async (tenantId, dados) => {
  const { grade_level_id, nome, turno, capacidade, ano_lectivo, room_id } = dados
  const r = await db.query(
    `INSERT INTO class_groups (escola_id, grade_level_id, nome, turno, capacidade, ano_lectivo, room_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, grade_level_id, nome, turno || 'Manhã', capacidade || 30, ano_lectivo, room_id || null]
  )
  const f = await db.query(
    `SELECT cg.*, gl.nome AS classe_nome FROM class_groups cg LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id WHERE cg.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarTurma = async (tenantId, id, dados) => {
  const permitidos = ['nome', 'turno', 'capacidade', 'ano_lectivo', 'room_id', 'grade_level_id', 'activo']
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (Object.keys(filtrado).length === 0) return
  const fields = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(`UPDATE class_groups SET ${fields} WHERE id = ? AND escola_id = ?`, [...Object.values(filtrado), id, tenantId])
  const f = await db.query(
    `SELECT cg.*, gl.nome AS classe_nome FROM class_groups cg LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id WHERE cg.id = ?`,
    [id]
  )
  return f.rows[0]
}

const listarClasses = async (tenantId) => {
  const r = await db.query('SELECT * FROM grade_levels WHERE escola_id = ? AND activo = 1 ORDER BY ordem ASC', [tenantId])
  return r.rows
}

// ─── TRANSFERÊNCIAS ───────────────────────────────────────────────────────────

const listarTransferencias = async (tenantId, { aluno_id, tipo, status } = {}) => {
  let where = 't.escola_id = ?'
  const params = [tenantId]
  if (aluno_id) { where += ' AND t.aluno_id = ?'; params.push(aluno_id) }
  if (tipo) { where += ' AND t.tipo = ?'; params.push(tipo) }
  if (status) { where += ' AND t.status = ?'; params.push(status) }
  const r = await db.query(
    `SELECT t.*,
            a.nome AS aluno_nome, a.numero_matricula,
            cgo.nome AS turma_origem_nome,
            cgd.nome AS turma_destino_nome
     FROM transferencias t
     JOIN alunos a ON t.aluno_id = a.id
     LEFT JOIN class_groups cgo ON t.class_group_origem_id = cgo.id
     LEFT JOIN class_groups cgd ON t.class_group_destino_id = cgd.id
     WHERE ${where}
     ORDER BY t.criado_em DESC`,
    params
  )
  return r.rows
}

const criarTransferencia = async (tenantId, dados) => {
  const {
    aluno_id, tipo, class_group_origem_id, class_group_destino_id,
    escola_origem, escola_destino, motivo, data, observacoes
  } = dados

  const r = await db.query(
    `INSERT INTO transferencias
       (escola_id, aluno_id, tipo, class_group_origem_id, class_group_destino_id,
        escola_origem, escola_destino, motivo, data, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, aluno_id, tipo,
     class_group_origem_id || null, class_group_destino_id || null,
     escola_origem || null, escola_destino || null,
     motivo || null, data || new Date().toISOString().slice(0, 10),
     observacoes || null]
  )

  // Actualizar turma do aluno se mudança interna
  if ((tipo === 'mudanca_turma' || tipo === 'interna') && class_group_destino_id) {
    await db.query(
      'UPDATE alunos SET class_group_id = ? WHERE id = ? AND escola_id = ?',
      [class_group_destino_id, aluno_id, tenantId]
    )
  }
  // Marcar como transferido se saída externa
  if (tipo === 'externa_saida') {
    await db.query(
      "UPDATE alunos SET status = 'transferido' WHERE id = ? AND escola_id = ?",
      [aluno_id, tenantId]
    )
  }

  const f = await db.query(
    `SELECT t.*, a.nome AS aluno_nome, a.numero_matricula
     FROM transferencias t JOIN alunos a ON t.aluno_id = a.id WHERE t.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarStatusTransferencia = async (tenantId, id, status) => {
  await db.query(
    'UPDATE transferencias SET status = ? WHERE id = ? AND escola_id = ?',
    [status, id, tenantId]
  )
  const f = await db.query('SELECT * FROM transferencias WHERE id = ?', [id])
  return f.rows[0]
}

// ─── SOLICITAÇÕES ─────────────────────────────────────────────────────────────

const listarSolicitacoes = async (tenantId, { aluno_id, tipo, status } = {}) => {
  let where = 's.escola_id = ?'
  const params = [tenantId]
  if (aluno_id) { where += ' AND s.aluno_id = ?'; params.push(aluno_id) }
  if (tipo) { where += ' AND s.tipo = ?'; params.push(tipo) }
  if (status) { where += ' AND s.status = ?'; params.push(status) }
  const r = await db.query(
    `SELECT s.*, a.nome AS aluno_nome, a.numero_matricula
     FROM solicitacoes s
     JOIN alunos a ON s.aluno_id = a.id
     WHERE ${where}
     ORDER BY s.criado_em DESC`,
    params
  )
  return r.rows
}

const criarSolicitacao = async (tenantId, dados) => {
  const { aluno_id, tipo, observacoes } = dados
  const r = await db.query(
    'INSERT INTO solicitacoes (escola_id, aluno_id, tipo, observacoes) VALUES (?, ?, ?, ?)',
    [tenantId, aluno_id, tipo, observacoes || null]
  )
  const f = await db.query(
    `SELECT s.*, a.nome AS aluno_nome FROM solicitacoes s JOIN alunos a ON s.aluno_id = a.id WHERE s.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarSolicitacao = async (tenantId, id, dados) => {
  const { status, numero_doc, data_conclusao, observacoes } = dados
  await db.query(
    'UPDATE solicitacoes SET status=?, numero_doc=?, data_conclusao=?, observacoes=? WHERE id=? AND escola_id=?',
    [status, numero_doc || null, data_conclusao || null, observacoes || null, id, tenantId]
  )
  const f = await db.query(
    `SELECT s.*, a.nome AS aluno_nome FROM solicitacoes s JOIN alunos a ON s.aluno_id = a.id WHERE s.id = ?`,
    [id]
  )
  return f.rows[0]
}

// ─── DOCUMENTOS / ARQUIVO ─────────────────────────────────────────────────────

const listarDocumentos = async (tenantId, { aluno_id, status, tipo } = {}) => {
  let where = 'ad.escola_id = ?'
  const params = [tenantId]
  if (aluno_id) { where += ' AND ad.aluno_id = ?'; params.push(aluno_id) }
  if (status) { where += ' AND ad.status = ?'; params.push(status) }
  if (tipo) { where += ' AND ad.tipo = ?'; params.push(tipo) }
  const r = await db.query(
    `SELECT ad.id, ad.escola_id, ad.aluno_id, ad.tipo, ad.descricao, ad.data_doc, ad.status, ad.criado_em,
            a.nome AS aluno_nome, a.numero_matricula
     FROM aluno_documentos ad
     JOIN alunos a ON ad.aluno_id = a.id
     WHERE ${where}
     ORDER BY ad.criado_em DESC`,
    params
  )
  return r.rows
}

const criarDocumento = async (tenantId, dados) => {
  const { aluno_id, tipo, descricao, arquivo, data_doc } = dados
  const r = await db.query(
    'INSERT INTO aluno_documentos (escola_id, aluno_id, tipo, descricao, arquivo, data_doc) VALUES (?, ?, ?, ?, ?, ?)',
    [tenantId, aluno_id, tipo, descricao || null, arquivo || null, data_doc || null]
  )
  const f = await db.query(
    `SELECT ad.*, a.nome AS aluno_nome FROM aluno_documentos ad JOIN alunos a ON ad.aluno_id = a.id WHERE ad.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarStatusDocumento = async (tenantId, id, status) => {
  await db.query('UPDATE aluno_documentos SET status = ? WHERE id = ? AND escola_id = ?', [status, id, tenantId])
  const f = await db.query('SELECT * FROM aluno_documentos WHERE id = ?', [id])
  return f.rows[0]
}

const obterArquivoDocumento = async (tenantId, id) => {
  const r = await db.query('SELECT arquivo FROM aluno_documentos WHERE id = ? AND escola_id = ?', [id, tenantId])
  return r.rows[0]?.arquivo || null
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────

const obterRelatorio = async (tenantId, tipo, filtros = {}) => {
  const { ano_lectivo } = filtros

  if (tipo === 'alunos_por_turma') {
    const r = await db.query(
      `SELECT cg.nome AS turma, gl.nome AS classe, cg.turno,
              COUNT(am.id) AS total
       FROM class_groups cg
       LEFT JOIN grade_levels gl ON cg.grade_level_id = gl.id
       LEFT JOIN aluno_matriculas am ON am.class_group_id = cg.id
         AND am.status NOT IN ('cancelado')
         ${ano_lectivo ? 'AND am.ano_lectivo = ?' : ''}
       WHERE cg.escola_id = ? AND cg.activo = 1
       GROUP BY cg.id, gl.nome, cg.turno
       ORDER BY gl.ordem, cg.nome`,
      ano_lectivo ? [ano_lectivo, tenantId] : [tenantId]
    )
    return r.rows
  }

  if (tipo === 'alunos_por_status') {
    const r = await db.query(
      `SELECT status, COUNT(*) AS total FROM alunos WHERE escola_id = ? GROUP BY status`,
      [tenantId]
    )
    return r.rows
  }

  if (tipo === 'matriculas_por_ano') {
    const r = await db.query(
      `SELECT ano_lectivo, COUNT(*) AS total,
              SUM(CASE WHEN status = 'matriculado' THEN 1 ELSE 0 END) AS matriculados,
              SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
       FROM aluno_matriculas WHERE escola_id = ?
       GROUP BY ano_lectivo ORDER BY ano_lectivo DESC`,
      [tenantId]
    )
    return r.rows
  }

  if (tipo === 'transferencias') {
    const r = await db.query(
      `SELECT tipo, status, COUNT(*) AS total FROM transferencias
       WHERE escola_id = ? ${ano_lectivo ? 'AND YEAR(data) = ?' : ''}
       GROUP BY tipo, status`,
      ano_lectivo ? [tenantId, ano_lectivo] : [tenantId]
    )
    return r.rows
  }

  return []
}

module.exports = {
  obterStats,
  listarAlunos, obterAluno, criarAluno, atualizarAluno, alterarStatusAluno,
  listarEncarregados, criarEncarregado, atualizarEncarregado,
  associarEncarregadoAluno, removerEncarregadoAluno,
  listarMatriculas, criarMatricula, cancelarMatricula,
  listarTurmasSecretaria, criarTurma, atualizarTurma, listarClasses,
  listarTransferencias, criarTransferencia, atualizarStatusTransferencia,
  listarSolicitacoes, criarSolicitacao, atualizarSolicitacao,
  listarDocumentos, criarDocumento, atualizarStatusDocumento, obterArquivoDocumento,
  obterRelatorio,
}
