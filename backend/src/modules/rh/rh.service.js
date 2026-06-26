const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')

// ─── DEPARTAMENTOS ────────────────────────────────────────────────────────────

const listarDepartamentos = async (tenantId) => {
  const r = await db.query(
    `SELECT d.*, f.nome AS responsavel_nome
     FROM departamentos d
     LEFT JOIN funcionarios f ON d.responsavel_id = f.id
     WHERE d.escola_id = ? ORDER BY d.nome`,
    [tenantId]
  )
  return r.rows
}

const criarDepartamento = async (tenantId, dados) => {
  const { nome, descricao, responsavel_id } = dados
  const r = await db.query(
    'INSERT INTO departamentos (escola_id, nome, descricao, responsavel_id) VALUES (?, ?, ?, ?)',
    [tenantId, nome, descricao || null, responsavel_id || null]
  )
  const f = await db.query('SELECT * FROM departamentos WHERE id = ?', [r.rows[0].insertId])
  return f.rows[0]
}

const atualizarDepartamento = async (tenantId, id, dados) => {
  const { nome, descricao, responsavel_id, activo } = dados
  await db.query(
    'UPDATE departamentos SET nome=?, descricao=?, responsavel_id=?, activo=? WHERE id=? AND escola_id=?',
    [nome, descricao || null, responsavel_id || null, activo ?? 1, id, tenantId]
  )
  const f = await db.query('SELECT * FROM departamentos WHERE id = ?', [id])
  return f.rows[0]
}

const eliminarDepartamento = async (tenantId, id) => {
  await db.query('UPDATE departamentos SET activo=0 WHERE id=? AND escola_id=?', [id, tenantId])
}

// ─── CARGOS ──────────────────────────────────────────────────────────────────

const listarCargos = async (tenantId) => {
  const r = await db.query(
    `SELECT c.*, d.nome AS departamento_nome
     FROM cargos c
     LEFT JOIN departamentos d ON c.departamento_id = d.id
     WHERE c.escola_id = ? ORDER BY c.nome`,
    [tenantId]
  )
  return r.rows
}

const criarCargo = async (tenantId, dados) => {
  const { nome, departamento_id, salario_base, descricao } = dados
  const r = await db.query(
    'INSERT INTO cargos (escola_id, nome, departamento_id, salario_base, descricao) VALUES (?, ?, ?, ?, ?)',
    [tenantId, nome, departamento_id || null, salario_base || null, descricao || null]
  )
  const f = await db.query(
    `SELECT c.*, d.nome AS departamento_nome FROM cargos c LEFT JOIN departamentos d ON c.departamento_id = d.id WHERE c.id = ?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarCargo = async (tenantId, id, dados) => {
  const { nome, departamento_id, salario_base, descricao, activo } = dados
  await db.query(
    'UPDATE cargos SET nome=?, departamento_id=?, salario_base=?, descricao=?, activo=? WHERE id=? AND escola_id=?',
    [nome, departamento_id || null, salario_base || null, descricao || null, activo ?? 1, id, tenantId]
  )
  const f = await db.query(
    `SELECT c.*, d.nome AS departamento_nome FROM cargos c LEFT JOIN departamentos d ON c.departamento_id = d.id WHERE c.id = ?`,
    [id]
  )
  return f.rows[0]
}

const eliminarCargo = async (tenantId, id) => {
  await db.query('UPDATE cargos SET activo=0 WHERE id=? AND escola_id=?', [id, tenantId])
}

// ─── FUNCIONÁRIOS ─────────────────────────────────────────────────────────────

const listar = async (tenantId, filters = {}) => {
  const { departamento_id, estado, cargo_id, nome } = filters
  let sql = `SELECT f.*, d.nome AS departamento_nome, c.nome AS cargo_nome
             FROM funcionarios f
             LEFT JOIN departamentos d ON f.departamento_id = d.id
             LEFT JOIN cargos c ON f.cargo_id = c.id
             WHERE f.escola_id = ?`
  const params = [tenantId]
  if (departamento_id) { sql += ' AND f.departamento_id = ?'; params.push(departamento_id) }
  if (cargo_id) { sql += ' AND f.cargo_id = ?'; params.push(cargo_id) }
  if (estado) { sql += ' AND f.estado = ?'; params.push(estado) }
  if (nome) { sql += ' AND f.nome LIKE ?'; params.push(`%${nome}%`) }
  sql += ' ORDER BY f.nome ASC'
  const r = await db.query(sql, params)
  return r.rows.map(f => ({ ...f, foto: undefined })) // exclude foto from list
}

const obterPorId = async (tenantId, id) => {
  const r = await db.query(
    `SELECT f.*, d.nome AS departamento_nome, c.nome AS cargo_nome,
            u.id AS utilizador_id, u.codigo AS utilizador_codigo,
            u.role AS utilizador_role, u.activo AS utilizador_activo,
            u.email AS utilizador_email
     FROM funcionarios f
     LEFT JOIN departamentos d ON f.departamento_id = d.id
     LEFT JOIN cargos c ON f.cargo_id = c.id
     LEFT JOIN utilizadores u ON f.utilizador_id = u.id
     WHERE f.id = ? AND f.escola_id = ?`,
    [id, tenantId]
  )
  return r.rows[0]
}

const criarAcesso = async (tenantId, funcionarioId, role) => {
  const rolesPermitidos = ['secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']
  if (!rolesPermitidos.includes(role)) {
    const err = new Error('Role inválido para acesso ao sistema')
    err.status = 400
    throw err
  }

  const fResult = await db.query(
    'SELECT * FROM funcionarios WHERE id = ? AND escola_id = ?',
    [funcionarioId, tenantId]
  )
  const func = fResult.rows[0]
  if (!func) throw new Error('Funcionário não encontrado')

  if (func.utilizador_id) {
    const err = new Error('Este funcionário já tem acesso ao sistema')
    err.status = 409
    throw err
  }

  const codigo = await gerarCodigo(tenantId, role)
  const senhaFinal = func.data_nascimento ? senhaDeNascimento(func.data_nascimento) : 'sige2024'
  const hash = await bcrypt.hash(senhaFinal, 12)

  // email pode ser null — utilizadores exige UNIQUE mas permite NULL repetido em MySQL
  const uResult = await db.query(
    `INSERT INTO utilizadores (escola_id, nome, email, password_hash, role, codigo, primeiro_login, data_nascimento)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [tenantId, func.nome, func.email || null, hash, role, codigo, func.data_nascimento || null]
  )
  const utilizadorId = uResult.rows[0].insertId

  await db.query(
    'UPDATE funcionarios SET utilizador_id = ? WHERE id = ? AND escola_id = ?',
    [utilizadorId, funcionarioId, tenantId]
  )

  return { utilizador_id: utilizadorId, codigo, role, senha_padrao: senhaFinal, primeiro_login: true }
}

const revogarAcesso = async (tenantId, funcionarioId) => {
  const fResult = await db.query(
    'SELECT utilizador_id FROM funcionarios WHERE id = ? AND escola_id = ?',
    [funcionarioId, tenantId]
  )
  const func = fResult.rows[0]
  if (!func) throw new Error('Funcionário não encontrado')
  if (!func.utilizador_id) {
    const err = new Error('Este funcionário não tem acesso ao sistema')
    err.status = 404
    throw err
  }

  await db.query('UPDATE utilizadores SET activo = 0 WHERE id = ?', [func.utilizador_id])
  return { revogado: true }
}

const reativarAcesso = async (tenantId, funcionarioId) => {
  const fResult = await db.query(
    'SELECT utilizador_id FROM funcionarios WHERE id = ? AND escola_id = ?',
    [funcionarioId, tenantId]
  )
  const func = fResult.rows[0]
  if (!func) throw new Error('Funcionário não encontrado')
  if (!func.utilizador_id) {
    const err = new Error('Este funcionário não tem acesso ao sistema')
    err.status = 404
    throw err
  }

  await db.query('UPDATE utilizadores SET activo = 1 WHERE id = ?', [func.utilizador_id])
  return { reativado: true }
}

const criar = async (tenantId, dados) => {
  const {
    nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
    data_nascimento, genero, endereco, role, departamento_id, cargo_id,
    salario_base, tipo_contrato, data_admissao, banco, conta_bancaria
  } = dados
  const r = await db.query(
    `INSERT INTO funcionarios
      (escola_id, nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
       data_nascimento, genero, endereco, role, departamento_id, cargo_id,
       salario_base, tipo_contrato, data_admissao, banco, conta_bancaria, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [tenantId, nome, foto || null, email || null, telefone || null, bi || null,
     nuit || null, numero_seguranca_social || null, data_nascimento || null,
     genero || null, endereco || null, role || null, departamento_id || null,
     cargo_id || null, salario_base || null, tipo_contrato || null,
     data_admissao || null, banco || null, conta_bancaria || null]
  )
  return obterPorId(tenantId, r.rows[0].insertId)
}

const atualizar = async (tenantId, id, dados) => {
  const permitidos = [
    'nome','foto','email','telefone','bi','nuit','numero_seguranca_social',
    'data_nascimento','genero','endereco','role','departamento_id','cargo_id',
    'salario_base','tipo_contrato','data_admissao','banco','conta_bancaria','estado'
  ]
  const filtrado = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)))
  if (Object.keys(filtrado).length === 0) return obterPorId(tenantId, id)
  const fields = Object.keys(filtrado).map(k => `${k} = ?`).join(', ')
  await db.query(
    `UPDATE funcionarios SET ${fields} WHERE id = ? AND escola_id = ?`,
    [...Object.values(filtrado), id, tenantId]
  )
  return obterPorId(tenantId, id)
}

const obterFoto = async (tenantId, id) => {
  const r = await db.query('SELECT foto FROM funcionarios WHERE id = ? AND escola_id = ?', [id, tenantId])
  return r.rows[0]?.foto
}

// ─── CONTRATOS ────────────────────────────────────────────────────────────────

const listarContratos = async (tenantId, filters = {}) => {
  const { funcionario_id, estado } = filters
  let sql = `SELECT ct.*, f.nome AS funcionario_nome
             FROM contratos ct
             JOIN funcionarios f ON ct.funcionario_id = f.id
             WHERE ct.escola_id = ?`
  const params = [tenantId]
  if (funcionario_id) { sql += ' AND ct.funcionario_id = ?'; params.push(funcionario_id) }
  if (estado) { sql += ' AND ct.estado = ?'; params.push(estado) }
  sql += ' ORDER BY ct.data_inicio DESC'
  const r = await db.query(sql, params)
  return r.rows
}

const criarContrato = async (tenantId, dados) => {
  const { funcionario_id, tipo, data_inicio, data_fim, salario, horas_semanais, observacoes } = dados
  const r = await db.query(
    `INSERT INTO contratos (escola_id, funcionario_id, tipo, data_inicio, data_fim, salario, horas_semanais, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, funcionario_id, tipo, data_inicio, data_fim || null, salario, horas_semanais || 40, observacoes || null]
  )
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarContrato = async (tenantId, id, dados) => {
  const { tipo, data_inicio, data_fim, salario, horas_semanais, estado, observacoes } = dados
  await db.query(
    `UPDATE contratos SET tipo=?, data_inicio=?, data_fim=?, salario=?, horas_semanais=?, estado=?, observacoes=?
     WHERE id=? AND escola_id=?`,
    [tipo, data_inicio, data_fim || null, salario, horas_semanais || 40, estado || 'activo', observacoes || null, id, tenantId]
  )
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [id]
  )
  return f.rows[0]
}

// ─── FÉRIAS ───────────────────────────────────────────────────────────────────

const listarFerias = async (tenantId, filters = {}) => {
  const { funcionario_id, ano, estado } = filters
  let sql = `SELECT fe.*, f.nome AS funcionario_nome
             FROM ferias fe
             JOIN funcionarios f ON fe.funcionario_id = f.id
             WHERE fe.escola_id = ?`
  const params = [tenantId]
  if (funcionario_id) { sql += ' AND fe.funcionario_id = ?'; params.push(funcionario_id) }
  if (ano) { sql += ' AND fe.ano = ?'; params.push(ano) }
  if (estado) { sql += ' AND fe.estado = ?'; params.push(estado) }
  sql += ' ORDER BY fe.data_inicio DESC'
  const r = await db.query(sql, params)
  return r.rows
}

const criarFerias = async (tenantId, dados) => {
  const { funcionario_id, ano, data_inicio, data_fim, observacoes } = dados
  const d1 = new Date(data_inicio)
  const d2 = new Date(data_fim)
  const dias = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
  const r = await db.query(
    `INSERT INTO ferias (escola_id, funcionario_id, ano, data_inicio, data_fim, dias, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, funcionario_id, ano, data_inicio, data_fim, dias, observacoes || null]
  )
  const f = await db.query(
    `SELECT fe.*, fu.nome AS funcionario_nome FROM ferias fe JOIN funcionarios fu ON fe.funcionario_id=fu.id WHERE fe.id=?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarEstadoFerias = async (tenantId, id, estado, aprovado_por) => {
  await db.query(
    'UPDATE ferias SET estado=?, aprovado_por=? WHERE id=? AND escola_id=?',
    [estado, aprovado_por || null, id, tenantId]
  )
  const f = await db.query('SELECT * FROM ferias WHERE id=?', [id])
  return f.rows[0]
}

// ─── FALTAS ───────────────────────────────────────────────────────────────────

const listarFaltas = async (tenantId, filters = {}) => {
  const { funcionario_id, mes, ano, tipo } = filters
  let sql = `SELECT fa.*, f.nome AS funcionario_nome
             FROM faltas_rh fa
             JOIN funcionarios f ON fa.funcionario_id = f.id
             WHERE fa.escola_id = ?`
  const params = [tenantId]
  if (funcionario_id) { sql += ' AND fa.funcionario_id = ?'; params.push(funcionario_id) }
  if (mes) { sql += ' AND MONTH(fa.data) = ?'; params.push(mes) }
  if (ano) { sql += ' AND YEAR(fa.data) = ?'; params.push(ano) }
  if (tipo) { sql += ' AND fa.tipo = ?'; params.push(tipo) }
  sql += ' ORDER BY fa.data DESC'
  const r = await db.query(sql, params)
  return r.rows
}

const criarFalta = async (tenantId, dados) => {
  const { funcionario_id, data, tipo, observacoes } = dados
  const r = await db.query(
    'INSERT INTO faltas_rh (escola_id, funcionario_id, data, tipo, observacoes) VALUES (?, ?, ?, ?, ?)',
    [tenantId, funcionario_id, data, tipo || 'injustificada', observacoes || null]
  )
  const f = await db.query(
    `SELECT fa.*, fu.nome AS funcionario_nome FROM faltas_rh fa JOIN funcionarios fu ON fa.funcionario_id=fu.id WHERE fa.id=?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const eliminarFalta = async (tenantId, id) => {
  await db.query('DELETE FROM faltas_rh WHERE id=? AND escola_id=?', [id, tenantId])
}

// ─── CONFIGURAÇÃO SALARIAL ────────────────────────────────────────────────────

const obterConfiguracao = async (tenantId) => {
  const r = await db.query('SELECT * FROM rh_configuracao WHERE escola_id=?', [tenantId])
  if (r.rows[0]) {
    const cfg = r.rows[0]
    if (typeof cfg.componentes === 'string') cfg.componentes = JSON.parse(cfg.componentes || '[]')
    cfg.componentes = cfg.componentes || []
    return cfg
  }
  // Create default if missing
  await db.query(
    `INSERT IGNORE INTO rh_configuracao (escola_id, dias_uteis_mes, inss_trabalhador, inss_entidade, calcular_irps, componentes)
     VALUES (?, 22, 3.00, 4.00, 1, '[]')`,
    [tenantId]
  )
  return { escola_id: tenantId, dias_uteis_mes: 22, inss_trabalhador: 3.00, inss_entidade: 4.00, calcular_irps: 1, componentes: [] }
}

const atualizarConfiguracao = async (tenantId, dados) => {
  const { dias_uteis_mes, inss_trabalhador, inss_entidade, calcular_irps, componentes } = dados
  await db.query(
    `INSERT INTO rh_configuracao (escola_id, dias_uteis_mes, inss_trabalhador, inss_entidade, calcular_irps, componentes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dias_uteis_mes=VALUES(dias_uteis_mes),
       inss_trabalhador=VALUES(inss_trabalhador),
       inss_entidade=VALUES(inss_entidade),
       calcular_irps=VALUES(calcular_irps),
       componentes=VALUES(componentes)`,
    [tenantId, dias_uteis_mes || 22, inss_trabalhador || 3, inss_entidade || 4,
     calcular_irps !== undefined ? calcular_irps : 1,
     JSON.stringify(componentes || [])]
  )
  return obterConfiguracao(tenantId)
}

// ─── DOCUMENTOS DO FUNCIONÁRIO ────────────────────────────────────────────────

const listarDocumentosFuncionario = async (tenantId, funcionarioId) => {
  const r = await db.query(
    `SELECT id, escola_id, funcionario_id, tipo, nome, data_doc, data_validade, observacoes, criado_em
     FROM funcionario_documentos WHERE escola_id=? AND funcionario_id=? ORDER BY criado_em DESC`,
    [tenantId, funcionarioId]
  )
  return r.rows
}

const criarDocumentoFuncionario = async (tenantId, dados) => {
  const { funcionario_id, tipo, nome, data_doc, data_validade, arquivo, observacoes } = dados
  const r = await db.query(
    `INSERT INTO funcionario_documentos (escola_id, funcionario_id, tipo, nome, data_doc, data_validade, arquivo, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, funcionario_id, tipo, nome || null, data_doc || null, data_validade || null, arquivo || null, observacoes || null]
  )
  const f = await db.query(
    `SELECT id, escola_id, funcionario_id, tipo, nome, data_doc, data_validade, observacoes, criado_em
     FROM funcionario_documentos WHERE id=?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const obterDocumentoFuncionario = async (tenantId, id) => {
  const r = await db.query('SELECT * FROM funcionario_documentos WHERE id=? AND escola_id=?', [id, tenantId])
  return r.rows[0] || null
}

const eliminarDocumentoFuncionario = async (tenantId, id) => {
  await db.query('DELETE FROM funcionario_documentos WHERE id=? AND escola_id=?', [id, tenantId])
}

// ─── FOLHA DE PAGAMENTO ───────────────────────────────────────────────────────

// Tabela IRPS simplificada (Moçambique)
const calcularIRPS = (rendimentoTributavel) => {
  if (rendimentoTributavel <= 20249) return 0
  if (rendimentoTributavel <= 30374) return (rendimentoTributavel - 20249) * 0.10
  if (rendimentoTributavel <= 50624) return 1012.50 + (rendimentoTributavel - 30374) * 0.15
  if (rendimentoTributavel <= 70874) return 4050.00 + (rendimentoTributavel - 50624) * 0.20
  if (rendimentoTributavel <= 101249) return 8100.00 + (rendimentoTributavel - 70874) * 0.25
  return 15693.75 + (rendimentoTributavel - 101249) * 0.32
}

const listarFolhas = async (tenantId) => {
  const r = await db.query(
    'SELECT * FROM folha_pagamento WHERE escola_id = ? ORDER BY ano DESC, mes DESC',
    [tenantId]
  )
  return r.rows
}

const gerarFolha = async (tenantId, mes, ano, userId) => {
  const existe = await db.query(
    'SELECT id FROM folha_pagamento WHERE escola_id=? AND mes=? AND ano=?',
    [tenantId, mes, ano]
  )
  if (existe.rows.length > 0) throw new Error('Folha já existe para este período')

  // Load dynamic salary config
  const cfg = await obterConfiguracao(tenantId)
  const inssRate = parseFloat(cfg.inss_trabalhador) / 100
  const inssEntidadeRate = parseFloat(cfg.inss_entidade) / 100
  const diasUteis = cfg.dias_uteis_mes || 22
  const usarIRPS = !!cfg.calcular_irps
  const componentes = cfg.componentes || []
  const compObrigatorios = componentes.filter(c => c.obrigatorio)

  const funcionarios = await db.query(
    `SELECT f.*,
       (SELECT ct.salario FROM contratos ct
        WHERE ct.funcionario_id=f.id AND ct.escola_id=f.escola_id AND ct.estado='activo'
        ORDER BY ct.data_inicio DESC LIMIT 1) AS salario_contrato
     FROM funcionarios f
     WHERE f.escola_id=? AND f.estado='activo'`,
    [tenantId]
  )

  // Faltas injustificadas do mês (soma de dias)
  const faltasResult = await db.query(
    `SELECT funcionario_id, COALESCE(SUM(dias), COUNT(*)) AS total_dias
     FROM faltas_rh
     WHERE escola_id=? AND MONTH(data)=? AND YEAR(data)=? AND tipo='injustificada'
     GROUP BY funcionario_id`,
    [tenantId, mes, ano]
  )
  const faltasMap = {}
  faltasResult.rows.forEach(f => { faltasMap[f.funcionario_id] = f.total_dias })

  const folhaResult = await db.query(
    `INSERT INTO folha_pagamento (escola_id, mes, ano, estado, processado_por)
     VALUES (?, ?, ?, 'rascunho', ?)`,
    [tenantId, mes, ano, userId || null]
  )
  const folhaId = folhaResult.rows[0].insertId

  let totalBruto = 0, totalLiquido = 0, totalInss = 0, totalIrps = 0

  for (const func of funcionarios.rows) {
    // Prefer salary from active contract; fall back to employee's salario_base field
    const salarioBase = parseFloat(func.salario_contrato || func.salario_base) || 0
    const temContrato = !!func.salario_contrato
    const diasFalta = parseFloat(faltasMap[func.id] || 0)
    const deducaoFalta = (salarioBase / diasUteis) * diasFalta

    // Apply obligatory bonus components
    let bonusObrig = 0
    let subsidioAlim = 0, subsidioTransp = 0, subsidioHab = 0
    for (const c of compObrigatorios) {
      const val = c.percentual ? salarioBase * (parseFloat(c.valor) / 100) : parseFloat(c.valor || 0)
      if (c.tipo === 'bonus') {
        if (c.nome?.toLowerCase().includes('aliment')) subsidioAlim += val
        else if (c.nome?.toLowerCase().includes('transp')) subsidioTransp += val
        else if (c.nome?.toLowerCase().includes('habit')) subsidioHab += val
        else bonusObrig += val
      }
    }

    const bruto = salarioBase - deducaoFalta
    const brutoTotal = bruto + bonusObrig + subsidioAlim + subsidioTransp + subsidioHab
    const inss = brutoTotal * inssRate
    const inssEntidade = brutoTotal * inssEntidadeRate
    const irps = usarIRPS ? calcularIRPS(brutoTotal - inss) : 0
    const liquido = brutoTotal - inss - irps

    totalBruto += brutoTotal
    totalLiquido += liquido
    totalInss += inss
    totalIrps += irps

    const obs = []
    if (!temContrato) obs.push('Sem contrato activo — usando salário base do cadastro')
    if (diasFalta > 0) obs.push(`${diasFalta} dia(s) de falta injustificada deduzido(s)`)

    await db.query(
      `INSERT INTO salarios
        (escola_id, funcionario_id, mes, ano, valor_bruto, bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao,
         inss_trabalhador, inss_entidade, irps, descontos, valor_liquido, estado, folha_id, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho', ?, ?)`,
      [
        tenantId, func.id, mes, ano,
        bruto.toFixed(2), bonusObrig.toFixed(2), subsidioAlim.toFixed(2),
        subsidioTransp.toFixed(2), subsidioHab.toFixed(2),
        inss.toFixed(2), inssEntidade.toFixed(2), irps.toFixed(2),
        (inss + irps).toFixed(2), liquido.toFixed(2),
        folhaId, obs.length ? obs.join('; ') : null
      ]
    )
  }

  await db.query(
    `UPDATE folha_pagamento SET
       total_bruto=?, total_liquido=?, total_inss=?, total_irps=?,
       total_funcionarios=?, estado='rascunho'
     WHERE id=?`,
    [totalBruto.toFixed(2), totalLiquido.toFixed(2), totalInss.toFixed(2), totalIrps.toFixed(2),
     funcionarios.rows.length, folhaId]
  )

  return obterFolha(tenantId, folhaId)
}

// Recalculate totals from lines and set to 'processado'
const processarFolha = async (tenantId, id) => {
  const folha = await db.query('SELECT * FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado === 'pago') throw new Error('Folha já paga, não pode ser reprocessada')

  const linhas = await db.query(
    `SELECT valor_bruto, bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao,
            inss_trabalhador, irps, outras_deducoes, valor_liquido
     FROM salarios WHERE folha_id=?`,
    [id]
  )

  let totalBruto = 0, totalLiquido = 0, totalInss = 0, totalIrps = 0
  for (const l of linhas.rows) {
    const brutoTotal = parseFloat(l.valor_bruto) + parseFloat(l.bonus || 0)
      + parseFloat(l.subsidio_alimentacao || 0) + parseFloat(l.subsidio_transporte || 0)
      + parseFloat(l.subsidio_habitacao || 0)
    totalBruto += brutoTotal
    totalLiquido += parseFloat(l.valor_liquido)
    totalInss += parseFloat(l.inss_trabalhador)
    totalIrps += parseFloat(l.irps)
  }

  await db.query(
    `UPDATE folha_pagamento SET
       total_bruto=?, total_liquido=?, total_inss=?, total_irps=?, estado='processado'
     WHERE id=? AND escola_id=?`,
    [totalBruto.toFixed(2), totalLiquido.toFixed(2), totalInss.toFixed(2), totalIrps.toFixed(2), id, tenantId]
  )
  await db.query(`UPDATE salarios SET estado='processado' WHERE folha_id=?`, [id])
  return obterFolha(tenantId, id)
}

const eliminarFolha = async (tenantId, id) => {
  const folha = await db.query('SELECT estado FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado !== 'rascunho') throw new Error('Só é possível eliminar folhas em rascunho')
  await db.query('DELETE FROM salarios WHERE folha_id=?', [id])
  await db.query('DELETE FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
}

const obterFolha = async (tenantId, id) => {
  const folha = await db.query('SELECT * FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) return null
  const linhas = await db.query(
    `SELECT s.*, f.nome AS funcionario_nome, f.cargo_id, f.departamento_id, c.nome AS cargo_nome
     FROM salarios s
     JOIN funcionarios f ON s.funcionario_id = f.id
     LEFT JOIN cargos c ON f.cargo_id = c.id
     WHERE s.folha_id = ? ORDER BY f.nome`,
    [id]
  )
  return { ...folha.rows[0], linhas: linhas.rows }
}

const pagarFolha = async (tenantId, id) => {
  await db.query(
    `UPDATE folha_pagamento SET estado='pago' WHERE id=? AND escola_id=?`,
    [id, tenantId]
  )
  await db.query(
    `UPDATE salarios SET estado='pago' WHERE folha_id=?`,
    [id]
  )
  return obterFolha(tenantId, id)
}

// ─── FOLHA MANUAL (add bonus/subsidies) ──────────────────────────────────────

const atualizarLinhaSalario = async (tenantId, salarioId, dados) => {
  const { bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao, outras_deducoes, observacoes } = dados
  const row = await db.query('SELECT * FROM salarios WHERE id=? AND escola_id=?', [salarioId, tenantId])
  if (!row.rows[0]) throw new Error('Registo não encontrado')
  const s = row.rows[0]

  const brutoNovo = parseFloat(s.valor_bruto)
    + parseFloat(bonus || 0)
    + parseFloat(subsidio_alimentacao || 0)
    + parseFloat(subsidio_transporte || 0)
    + parseFloat(subsidio_habitacao || 0)

  const inss = brutoNovo * 0.03
  const irps = calcularIRPS(brutoNovo - inss)
  const deducoes = inss + irps + parseFloat(outras_deducoes || 0)
  const liquido = brutoNovo - deducoes

  await db.query(
    `UPDATE salarios SET bonus=?, subsidio_alimentacao=?, subsidio_transporte=?, subsidio_habitacao=?,
       outras_deducoes=?, inss_trabalhador=?, irps=?, descontos=?, valor_liquido=?, observacoes=?
     WHERE id=?`,
    [
      bonus || 0, subsidio_alimentacao || 0, subsidio_transporte || 0, subsidio_habitacao || 0,
      outras_deducoes || 0, inss.toFixed(2), irps.toFixed(2), deducoes.toFixed(2), liquido.toFixed(2),
      observacoes || s.observacoes, salarioId
    ]
  )
  const f = await db.query('SELECT * FROM salarios WHERE id=?', [salarioId])
  return f.rows[0]
}

// ─── RESUMO FUNCIONÁRIO ───────────────────────────────────────────────────────

const obterResumoFuncionario = async (tenantId, id) => {
  const agora = new Date()
  const mes = agora.getMonth() + 1
  const ano = agora.getFullYear()

  const [contrato, faltasMes, ultimoSalario] = await Promise.all([
    db.query(
      `SELECT id, tipo, data_inicio, data_fim, salario, horas_semanais, estado
       FROM contratos WHERE escola_id=? AND funcionario_id=? AND estado='activo'
       ORDER BY data_inicio DESC LIMIT 1`,
      [tenantId, id]
    ),
    db.query(
      `SELECT COUNT(*) AS total, tipo FROM faltas_rh
       WHERE escola_id=? AND funcionario_id=? AND MONTH(data)=? AND YEAR(data)=?
       GROUP BY tipo`,
      [tenantId, id, mes, ano]
    ),
    db.query(
      `SELECT id, mes, ano, valor_bruto, valor_liquido, inss_trabalhador, irps, bonus, estado
       FROM salarios WHERE escola_id=? AND funcionario_id=?
       ORDER BY ano DESC, mes DESC LIMIT 1`,
      [tenantId, id]
    ),
  ])

  return {
    contrato_activo: contrato.rows[0] || null,
    faltas_mes: faltasMes.rows,
    ultimo_salario: ultimoSalario.rows[0] || null,
  }
}

// ─── STATS (portal) ──────────────────────────────────────────────────────────

const obterStats = async (tenantId) => {
  const [total, activos, depts, contratos] = await Promise.all([
    db.query('SELECT COUNT(*) AS n FROM funcionarios WHERE escola_id=?', [tenantId]),
    db.query('SELECT COUNT(*) AS n FROM funcionarios WHERE escola_id=? AND estado="activo"', [tenantId]),
    db.query('SELECT COUNT(*) AS n FROM departamentos WHERE escola_id=? AND activo=1', [tenantId]),
    db.query('SELECT COUNT(*) AS n FROM contratos WHERE escola_id=? AND estado="activo"', [tenantId]),
  ])
  return {
    total: total.rows[0].n,
    activos: activos.rows[0].n,
    departamentos: depts.rows[0].n,
    contratos_activos: contratos.rows[0].n,
  }
}

module.exports = {
  listarDepartamentos, criarDepartamento, atualizarDepartamento, eliminarDepartamento,
  listarCargos, criarCargo, atualizarCargo, eliminarCargo,
  listar, obterPorId, criar, atualizar, obterFoto,
  criarAcesso, revogarAcesso, reativarAcesso,
  obterResumoFuncionario,
  obterConfiguracao, atualizarConfiguracao,
  listarDocumentosFuncionario, criarDocumentoFuncionario, obterDocumentoFuncionario, eliminarDocumentoFuncionario,
  listarContratos, criarContrato, atualizarContrato,
  listarFerias, criarFerias, atualizarEstadoFerias,
  listarFaltas, criarFalta, eliminarFalta,
  listarFolhas, gerarFolha, obterFolha, pagarFolha, processarFolha, eliminarFolha, atualizarLinhaSalario,
  obterStats,
}
