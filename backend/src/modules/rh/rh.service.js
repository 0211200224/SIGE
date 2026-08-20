const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')
const payroll = require('./payrollEngine')

// Campos fixos de ajuste manual já existentes na UI da folha (modal "Ajustar
// Vencimento"). Mapeados 1:1 para componentes "de sistema" na configuração da
// escola, para que o tratamento fiscal (sujeito_inss) de cada um seja
// configurável em RH > Configuração em vez de assumido pelo nome do campo em
// tempo de execução. Isto é uma decisão de modelação feita uma única vez aqui,
// não uma heurística sobre nomes escritos livremente pelo utilizador. Estes
// componentes já não vêm pré-criados (ver obterConfiguracao) — a escola
// adiciona-os manualmente em RH > Configuração, com estes ids exactos, se
// quiser que o tratamento fiscal de Bónus/Subsídios no ajuste manual seja
// diferente de 'a_confirmar'.
const SYSTEM_COMPONENT_IDS = {
  bonus: 'sys_bonus',
  subsidio_alimentacao: 'sys_subsidio_alimentacao',
  subsidio_transporte: 'sys_subsidio_transporte',
  subsidio_habitacao: 'sys_subsidio_habitacao',
}

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
  return r.rows
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

  // TO_CHAR devolve a data ja formatada como texto: evita que o driver pg
  // a converta para um objecto Date (que usaria a meia-noite no fuso
  // horario local do servidor e podia desviar o dia em 1, gerando uma
  // senha padrao errada).
  const fResult = await db.query(
    `SELECT *, TO_CHAR(data_nascimento, 'YYYY-MM-DD') AS data_nascimento_fmt
     FROM funcionarios WHERE id = ? AND escola_id = ?`,
    [funcionarioId, tenantId]
  )
  const func = fResult.rows[0]
  if (!func) throw new Error('Funcionário não encontrado')
  if (func) func.data_nascimento = func.data_nascimento_fmt

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

const METODOS_PAGAMENTO = ['banco', 'mpesa', 'emola']

const criar = async (tenantId, dados) => {
  const {
    nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
    data_nascimento, genero, endereco, role, departamento_id, cargo_id,
    salario_base, tipo_contrato, data_admissao, metodo_pagamento, banco, conta_bancaria,
    numero_dependentes, sujeito_inss
  } = dados
  const r = await db.query(
    `INSERT INTO funcionarios
      (escola_id, nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
       data_nascimento, genero, endereco, role, departamento_id, cargo_id,
       salario_base, tipo_contrato, data_admissao, metodo_pagamento, banco, conta_bancaria, numero_dependentes, sujeito_inss, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [tenantId, nome, foto || null, email || null, telefone || null, bi || null,
     nuit || null, numero_seguranca_social || null, data_nascimento || null,
     genero || null, endereco || null, role || null, departamento_id || null,
     cargo_id || null, salario_base || null, tipo_contrato || null,
     data_admissao || null, METODOS_PAGAMENTO.includes(metodo_pagamento) ? metodo_pagamento : 'banco',
     banco || null, conta_bancaria || null, parseInt(numero_dependentes) || 0,
     ['sim','nao','a_confirmar'].includes(sujeito_inss) ? sujeito_inss : 'a_confirmar']
  )
  return obterPorId(tenantId, r.rows[0].insertId)
}

const atualizar = async (tenantId, id, dados) => {
  const permitidos = [
    'nome','foto','email','telefone','bi','nuit','numero_seguranca_social',
    'numero_funcionario','data_nascimento','genero','estado_civil','endereco',
    'role','departamento_id','cargo_id','salario_base','tipo_contrato',
    'data_admissao','metodo_pagamento','banco','conta_bancaria','estado','numero_dependentes','sujeito_inss'
  ]
  // campos em branco (ex: data limpa no formulario) chegam como '' -- colunas
  // DATE/NUMERIC do Postgres rejeitam string vazia ("invalid input syntax"),
  // por isso convertemos para null, que e o valor correcto para "nao definido".
  const filtrado = Object.fromEntries(
    Object.entries(dados)
      .filter(([k]) => permitidos.includes(k))
      .map(([k, v]) => [k, v === '' ? null : v])
  )
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

const REGIMES_SALARIAIS = ['mensal', 'diario', 'horario']

const criarContrato = async (tenantId, dados) => {
  const { funcionario_id, tipo, data_inicio, data_fim, salario, regime_salarial, horas_semanais, observacoes, arquivo } = dados
  const regime = REGIMES_SALARIAIS.includes(regime_salarial) ? regime_salarial : 'mensal'
  const r = await db.query(
    `INSERT INTO contratos (escola_id, funcionario_id, tipo, data_inicio, data_fim, regime_salarial, salario, horas_semanais, observacoes, arquivo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, funcionario_id, tipo, data_inicio, data_fim || null, regime, salario, horas_semanais || 40, observacoes || null, arquivo || null]
  )
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [r.rows[0].insertId]
  )
  return f.rows[0]
}

const atualizarContrato = async (tenantId, id, dados) => {
  const { tipo, data_inicio, data_fim, salario, regime_salarial, horas_semanais, estado, observacoes, arquivo } = dados
  const regime = REGIMES_SALARIAIS.includes(regime_salarial) ? regime_salarial : 'mensal'
  const setArquivo = arquivo !== undefined ? ', arquivo=?' : ''
  const params = [tipo, data_inicio, data_fim || null, regime, salario, horas_semanais || 40, estado || 'activo', observacoes || null]
  if (arquivo !== undefined) params.push(arquivo || null)
  params.push(id, tenantId)
  await db.query(
    `UPDATE contratos SET tipo=?, data_inicio=?, data_fim=?, regime_salarial=?, salario=?, horas_semanais=?, estado=?, observacoes=?${setArquivo}
     WHERE id=? AND escola_id=?`,
    params
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
  if (mes) { sql += ' AND EXTRACT(MONTH FROM fa.data) = ?'; params.push(mes) }
  if (ano) { sql += ' AND EXTRACT(YEAR FROM fa.data) = ?'; params.push(ano) }
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
  // Cria configuração por omissão se ainda não existir — sem nenhum
  // componente pré-criado (a pedido da escola: começa vazio, adiciona-se
  // quando precisar, em vez de vir sempre com Bónus/Subsídios por defeito).
  // Taxa legal de INSS Moçambique (Decreto n.º 53/2007): 7% do salário,
  // repartido em 3% trabalhador + 4% entidade.
  await db.query(
    `INSERT INTO rh_configuracao (escola_id, dias_uteis_mes, inss_trabalhador, inss_entidade, componentes)
     VALUES (?, 22, 3.00, 4.00, '[]')
     ON CONFLICT (escola_id) DO NOTHING`,
    [tenantId]
  )
  return { escola_id: tenantId, dias_uteis_mes: 22, inss_trabalhador: 3.00, inss_entidade: 4.00, componentes: [] }
}

const atualizarConfiguracao = async (tenantId, dados) => {
  const { dias_uteis_mes, inss_trabalhador, inss_entidade, componentes } = dados
  await db.query(
    `INSERT INTO rh_configuracao (escola_id, dias_uteis_mes, inss_trabalhador, inss_entidade, componentes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (escola_id) DO UPDATE SET
       dias_uteis_mes=EXCLUDED.dias_uteis_mes,
       inss_trabalhador=EXCLUDED.inss_trabalhador,
       inss_entidade=EXCLUDED.inss_entidade,
       componentes=EXCLUDED.componentes`,
    [tenantId, dias_uteis_mes || 22, inss_trabalhador || 3, inss_entidade || 4,
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
//
// Todo o cálculo fiscal (INSS, componentes) passa exclusivamente pelo motor
// único em payrollEngine.js — geração, edição manual e reprocessamento usam
// sempre a mesma função calcularSalarioFuncionario(). Não voltar a introduzir
// aqui nenhuma fórmula própria de INSS. IRPS é apurado manualmente pela
// escola, fora do sistema — não é calculado nem gravado por este módulo.

// Extrai dos componentes aplicados pelo motor os valores dos 4 campos de
// ajuste manual "clássicos" (usados na tabela/recibo da folha), por
// correspondência exacta de id de sistema — nunca por nome.
const extrairCamposLegado = (componentesAplicados) => {
  const porId = Object.fromEntries((componentesAplicados || []).map(c => [c.id, c.valor]))
  return {
    bonus: fmtDinheiro(porId[SYSTEM_COMPONENT_IDS.bonus]),
    subsidio_alimentacao: fmtDinheiro(porId[SYSTEM_COMPONENT_IDS.subsidio_alimentacao]),
    subsidio_transporte: fmtDinheiro(porId[SYSTEM_COMPONENT_IDS.subsidio_transporte]),
    subsidio_habitacao: fmtDinheiro(porId[SYSTEM_COMPONENT_IDS.subsidio_habitacao]),
  }
}
const fmtDinheiro = (v) => (parseFloat(v) || 0).toFixed(2)

// Auditoria do ciclo de vida da folha — reutiliza a tabela auditoria_log já
// usada noutros módulos (director), em vez de criar uma tabela nova.
const registarAuditoriaRh = async (tenantId, userId, modulo, acao, detalhes) => {
  try {
    await db.query(
      'INSERT INTO auditoria_log (escola_id, utilizador_id, modulo, acao, detalhes) VALUES (?, ?, ?, ?, ?)',
      [tenantId, userId || null, modulo, acao, detalhes || null]
    )
  } catch (_) { /* auditoria nunca deve bloquear a operação real */ }
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

  const cfg = await obterConfiguracao(tenantId)
  const diasUteis = cfg.dias_uteis_mes || 22

  const funcionarios = await db.query(
    `SELECT f.*,
       (SELECT ct.id FROM contratos ct
        WHERE ct.funcionario_id=f.id AND ct.escola_id=f.escola_id AND ct.estado='activo'
        ORDER BY ct.data_inicio DESC LIMIT 1) AS contrato_id,
       (SELECT ct.salario FROM contratos ct
        WHERE ct.funcionario_id=f.id AND ct.escola_id=f.escola_id AND ct.estado='activo'
        ORDER BY ct.data_inicio DESC LIMIT 1) AS salario_contrato,
       (SELECT ct.regime_salarial FROM contratos ct
        WHERE ct.funcionario_id=f.id AND ct.escola_id=f.escola_id AND ct.estado='activo'
        ORDER BY ct.data_inicio DESC LIMIT 1) AS regime_salarial_contrato
     FROM funcionarios f
     WHERE f.escola_id=? AND f.estado='activo'`,
    [tenantId]
  )

  // Faltas injustificadas do mês (soma de dias)
  const faltasResult = await db.query(
    `SELECT funcionario_id, COALESCE(SUM(dias), COUNT(*)) AS total_dias
     FROM faltas_rh
     WHERE escola_id=? AND EXTRACT(MONTH FROM data)=? AND EXTRACT(YEAR FROM data)=? AND tipo='injustificada'
     GROUP BY funcionario_id`,
    [tenantId, mes, ano]
  )
  const faltasMap = {}
  faltasResult.rows.forEach(f => { faltasMap[f.funcionario_id] = f.total_dias })

  const folhaResult = await db.query(
    `INSERT INTO folha_pagamento (escola_id, mes, ano, estado, processado_por, dias_uteis_utilizados, taxa_inss_trabalhador_utilizada, taxa_inss_entidade_utilizada)
     VALUES (?, ?, ?, 'rascunho', ?, ?, ?, ?)`,
    [tenantId, mes, ano, userId || null, diasUteis, cfg.inss_trabalhador, cfg.inss_entidade]
  )
  const folhaId = folhaResult.rows[0].insertId

  let totalBruto = 0, totalLiquido = 0, totalInss = 0, totalInssEntidade = 0

  for (const func of funcionarios.rows) {
    const regime = REGIMES_SALARIAIS.includes(func.regime_salarial_contrato) ? func.regime_salarial_contrato : 'mensal'
    const temContrato = !!func.salario_contrato
    // Regime diario/horario: o valor do contrato e' a TAXA por dia/hora, nao
    // um salario mensal -- a quantidade trabalhada e' sempre indicada
    // manualmente pelo RH ao ajustar a linha (nunca inferida), por isso a
    // folha nasce com valor 0 e um aviso, em vez de assumir um valor.
    const ehVariavel = regime === 'diario' || regime === 'horario'
    const taxaUnitaria = ehVariavel ? (parseFloat(func.salario_contrato) || 0) : null
    const salarioBase = ehVariavel ? 0 : (parseFloat(func.salario_contrato || func.salario_base) || 0)
    const diasFalta = ehVariavel ? 0 : parseFloat(faltasMap[func.id] || 0)

    const sujeitoInss = ['sim','nao'].includes(func.sujeito_inss) ? func.sujeito_inss : 'a_confirmar'

    const resultado = payroll.calcularSalarioFuncionario({
      salarioBase, diasUteis, diasFalta, tipoFalta: 'injustificada',
      componentesRecorrentes: cfg.componentes,
      eventosManuais: [],
      taxaInssTrabalhador: cfg.inss_trabalhador, taxaInssEntidade: cfg.inss_entidade, sujeitoInss,
      outrasDeducoes: 0, temContrato,
    })

    totalBruto += resultado.bruto_total
    totalLiquido += resultado.valor_liquido
    totalInss += resultado.inss_trabalhador
    totalInssEntidade += resultado.inss_entidade

    const camposLegado = extrairCamposLegado(resultado.componentes_aplicados)
    const notas = []
    if (diasFalta > 0) notas.push(`${diasFalta} dia(s) de falta injustificada deduzido(s)`)
    const avisos = [...resultado.avisos]
    if (ehVariavel) avisos.push(`Regime ${regime === 'diario' ? 'diário' : 'horário'}: indique os ${regime === 'diario' ? 'dias' : 'horas'} trabalhados em "Ajustar" para calcular o salário.`)

    await db.query(
      `INSERT INTO salarios
        (escola_id, funcionario_id, mes, ano, valor_bruto, bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao,
         inss_trabalhador, inss_entidade, descontos, valor_liquido, estado, folha_id, observacoes, avisos,
         contrato_id, regime_salarial, taxa_unitaria, quantidade_trabalhada, sujeito_inss_utilizado,
         metodo_pagamento_utilizado, banco_utilizado, conta_pagamento_utilizada,
         dias_falta, tipo_falta, dias_uteis_utilizados, taxa_inss_trabalhador, taxa_inss_entidade,
         base_inss, componentes_aplicados)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, func.id, mes, ano,
        resultado.bruto_apos_faltas.toFixed(2), camposLegado.bonus, camposLegado.subsidio_alimentacao,
        camposLegado.subsidio_transporte, camposLegado.subsidio_habitacao,
        resultado.inss_trabalhador.toFixed(2), resultado.inss_entidade.toFixed(2),
        resultado.inss_trabalhador.toFixed(2), resultado.valor_liquido.toFixed(2),
        folhaId, notas.length ? notas.join('; ') : null, avisos.length ? avisos.join('; ') : null,
        func.contrato_id || null, regime, taxaUnitaria !== null ? taxaUnitaria.toFixed(2) : null, ehVariavel ? '0' : null, sujeitoInss,
        func.metodo_pagamento || 'banco', func.banco || null, func.conta_bancaria || null,
        diasFalta.toFixed(2), 'injustificada', diasUteis,
        resultado.taxa_inss_trabalhador, resultado.taxa_inss_entidade,
        resultado.base_inss.toFixed(2), JSON.stringify(resultado.componentes_aplicados),
      ]
    )
  }

  await db.query(
    `UPDATE folha_pagamento SET
       total_bruto=?, total_liquido=?, total_inss=?, total_inss_entidade=?,
       total_funcionarios=?, estado='rascunho'
     WHERE id=?`,
    [totalBruto.toFixed(2), totalLiquido.toFixed(2), totalInss.toFixed(2), totalInssEntidade.toFixed(2),
     funcionarios.rows.length, folhaId]
  )

  await registarAuditoriaRh(tenantId, userId, 'folha_pagamento', 'gerar', `Folha ${mes}/${ano} gerada (${funcionarios.rows.length} funcionário(s)).`)

  return obterFolha(tenantId, folhaId)
}

// Recalculate totals from lines and set to 'processado'
const processarFolha = async (tenantId, id, userId) => {
  const folha = await db.query('SELECT * FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado === 'pago') throw new Error('Folha já paga, não pode ser reprocessada')

  const linhas = await db.query(
    `SELECT valor_bruto, bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao,
            inss_trabalhador, inss_entidade, outras_deducoes, valor_liquido
     FROM salarios WHERE folha_id=?`,
    [id]
  )

  let totalBruto = 0, totalLiquido = 0, totalInss = 0, totalInssEntidade = 0
  for (const l of linhas.rows) {
    const brutoTotal = parseFloat(l.valor_bruto) + parseFloat(l.bonus || 0)
      + parseFloat(l.subsidio_alimentacao || 0) + parseFloat(l.subsidio_transporte || 0)
      + parseFloat(l.subsidio_habitacao || 0)
    totalBruto += brutoTotal
    totalLiquido += parseFloat(l.valor_liquido)
    totalInss += parseFloat(l.inss_trabalhador)
    totalInssEntidade += parseFloat(l.inss_entidade || 0)
  }

  await db.query(
    `UPDATE folha_pagamento SET
       total_bruto=?, total_liquido=?, total_inss=?, total_inss_entidade=?, estado='processado'
     WHERE id=? AND escola_id=?`,
    [totalBruto.toFixed(2), totalLiquido.toFixed(2), totalInss.toFixed(2), totalInssEntidade.toFixed(2), id, tenantId]
  )
  await db.query(`UPDATE salarios SET estado='processado' WHERE folha_id=?`, [id])
  await registarAuditoriaRh(tenantId, userId, 'folha_pagamento', 'processar', `Folha ${folha.rows[0].mes}/${folha.rows[0].ano} finalizada e processada.`)
  return obterFolha(tenantId, id)
}

const eliminarFolha = async (tenantId, id, userId) => {
  const folha = await db.query('SELECT estado, mes, ano FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado !== 'rascunho') throw new Error('Só é possível eliminar folhas em rascunho')
  await db.query('DELETE FROM salarios WHERE folha_id=?', [id])
  await db.query('DELETE FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  await registarAuditoriaRh(tenantId, userId, 'folha_pagamento', 'eliminar', `Folha ${folha.rows[0].mes}/${folha.rows[0].ano} (rascunho) eliminada.`)
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

const pagarFolha = async (tenantId, id, userId) => {
  const folha = await db.query('SELECT estado, mes, ano FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado !== 'processado') throw new Error('Só é possível marcar como paga uma folha já processada')

  await db.query(
    `UPDATE folha_pagamento SET estado='pago' WHERE id=? AND escola_id=?`,
    [id, tenantId]
  )
  await db.query(
    `UPDATE salarios SET estado='pago' WHERE folha_id=?`,
    [id]
  )
  await registarAuditoriaRh(tenantId, userId, 'folha_pagamento', 'pagar', `Folha ${folha.rows[0].mes}/${folha.rows[0].ano} marcada como paga.`)
  return obterFolha(tenantId, id)
}

// ─── FOLHA MANUAL (ajuste de bónus/subsídios numa linha em rascunho) ──────────
//
// Recalcula a linha inteira pelo mesmo motor usado na geração — nunca uma
// fórmula reduzida. Os parâmetros que não fazem parte deste ajuste (taxa de
// INSS, dias úteis) são os que ficaram gravados quando a folha foi gerada,
// não os "actuais" — para que dois ajustes na mesma folha nunca fiquem
// calculados com regras diferentes.
const atualizarLinhaSalario = async (tenantId, salarioId, dados) => {
  const { bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao, outras_deducoes, observacoes, quantidade_trabalhada } = dados
  const row = await db.query(
    `SELECT s.*, fp.estado AS folha_estado
     FROM salarios s JOIN folha_pagamento fp ON fp.id = s.folha_id
     WHERE s.id=? AND s.escola_id=?`,
    [salarioId, tenantId]
  )
  if (!row.rows[0]) throw new Error('Registo não encontrado')
  const s = row.rows[0]
  if (s.folha_estado !== 'rascunho') throw new Error('Só é possível ajustar linhas de uma folha em rascunho')

  // Regime diario/horario: o "salario base" desta linha nao e' o valor
  // congelado na geracao (que nasce a 0) -- e' taxa_unitaria x quantidade
  // trabalhada, indicada agora pelo RH. Regime mensal mantem o
  // comportamento original (usa o bruto ja congelado na geracao).
  const ehVariavel = s.regime_salarial === 'diario' || s.regime_salarial === 'horario'
  const qtdTrabalhada = ehVariavel
    ? (quantidade_trabalhada !== undefined ? parseFloat(quantidade_trabalhada) || 0 : parseFloat(s.quantidade_trabalhada) || 0)
    : null
  const salarioBaseAjuste = ehVariavel ? (parseFloat(s.taxa_unitaria) || 0) * qtdTrabalhada : parseFloat(s.valor_bruto)

  const cfg = await obterConfiguracao(tenantId)
  const compPorId = Object.fromEntries((cfg.componentes || []).map(c => [c.id, c]))

  // Recorrentes já aplicados na geração (congelados) + os 4 campos manuais
  // clássicos, com o tratamento fiscal vindo da configuração actual dos
  // componentes de sistema (id fixo, nunca por nome).
  const recorrentesCongelados = (Array.isArray(s.componentes_aplicados) ? s.componentes_aplicados : JSON.parse(s.componentes_aplicados || '[]'))
    .filter(c => c.origem === 'recorrente')

  const camposManuais = [
    { campo: 'bonus', id: SYSTEM_COMPONENT_IDS.bonus, valor: bonus },
    { campo: 'subsidio_alimentacao', id: SYSTEM_COMPONENT_IDS.subsidio_alimentacao, valor: subsidio_alimentacao },
    { campo: 'subsidio_transporte', id: SYSTEM_COMPONENT_IDS.subsidio_transporte, valor: subsidio_transporte },
    { campo: 'subsidio_habitacao', id: SYSTEM_COMPONENT_IDS.subsidio_habitacao, valor: subsidio_habitacao },
  ]
  const eventosManuais = camposManuais.map(({ campo, id, valor }) => {
    const compCfg = compPorId[id] || {}
    return {
      id, nome: compCfg.nome || campo, tipo: 'bonus', valor: parseFloat(valor) || 0,
      sujeito_inss: compCfg.sujeito_inss || 'a_confirmar',
    }
  })

  const resultado = payroll.calcularSalarioFuncionario({
    salarioBase: salarioBaseAjuste, diasUteis: s.dias_uteis_utilizados || 22, diasFalta: 0,
    componentesRecorrentes: [], // já congelados em recorrentesCongelados, passados como eventos
    eventosManuais: [...recorrentesCongelados, ...eventosManuais],
    taxaInssTrabalhador: s.taxa_inss_trabalhador, taxaInssEntidade: s.taxa_inss_entidade,
    sujeitoInss: s.sujeito_inss_utilizado,
    outrasDeducoes: parseFloat(outras_deducoes) || 0, temContrato: true,
  })

  const avisos = [...resultado.avisos]
  if (ehVariavel && qtdTrabalhada <= 0) {
    avisos.push(`Regime ${s.regime_salarial === 'diario' ? 'diário' : 'horário'}: indique os ${s.regime_salarial === 'diario' ? 'dias' : 'horas'} trabalhados para calcular o salário.`)
  }

  await db.query(
    `UPDATE salarios SET bonus=?, subsidio_alimentacao=?, subsidio_transporte=?, subsidio_habitacao=?,
       outras_deducoes=?, inss_trabalhador=?, inss_entidade=?, descontos=?, valor_liquido=?,
       base_inss=?, componentes_aplicados=?, observacoes=?, avisos=?${ehVariavel ? ', valor_bruto=?, quantidade_trabalhada=?' : ''}
     WHERE id=?`,
    [
      fmtDinheiro(bonus), fmtDinheiro(subsidio_alimentacao), fmtDinheiro(subsidio_transporte), fmtDinheiro(subsidio_habitacao),
      (parseFloat(outras_deducoes) || 0).toFixed(2), resultado.inss_trabalhador.toFixed(2), resultado.inss_entidade.toFixed(2),
      resultado.inss_trabalhador.toFixed(2), resultado.valor_liquido.toFixed(2),
      resultado.base_inss.toFixed(2), JSON.stringify(resultado.componentes_aplicados),
      observacoes ?? s.observacoes, avisos.length ? avisos.join('; ') : null,
      ...(ehVariavel ? [resultado.bruto_apos_faltas.toFixed(2), qtdTrabalhada.toFixed(2)] : []),
      salarioId
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
       WHERE escola_id=? AND funcionario_id=? AND EXTRACT(MONTH FROM data)=? AND EXTRACT(YEAR FROM data)=?
       GROUP BY tipo`,
      [tenantId, id, mes, ano]
    ),
    db.query(
      `SELECT id, mes, ano, valor_bruto, valor_liquido, inss_trabalhador, bonus, estado
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
    db.query("SELECT COUNT(*) AS n FROM funcionarios WHERE escola_id=? AND estado='activo'", [tenantId]),
    db.query('SELECT COUNT(*) AS n FROM departamentos WHERE escola_id=? AND activo=1', [tenantId]),
    db.query("SELECT COUNT(*) AS n FROM contratos WHERE escola_id=? AND estado='activo'", [tenantId]),
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
