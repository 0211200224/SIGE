const db = require('../../config/database')
const bcrypt = require('bcryptjs')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')
const payroll = require('./payrollEngine')
const { PORTAIS_EQUIPA } = require('../../utils/portais')

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
            u.email AS utilizador_email,
            (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                      'portal', up.portal, 'codigo', up.codigo, 'valido_ate', TO_CHAR(up.valido_ate, 'YYYY-MM-DD'),
                      'expirado', up.valido_ate IS NOT NULL AND up.valido_ate < CURRENT_DATE
                    ) ORDER BY up.concedido_em), '[]')
             FROM utilizador_portais up WHERE up.utilizador_id = u.id) AS utilizador_portais_extra
     FROM funcionarios f
     LEFT JOIN departamentos d ON f.departamento_id = d.id
     LEFT JOIN cargos c ON f.cargo_id = c.id
     LEFT JOIN utilizadores u ON f.utilizador_id = u.id
     WHERE f.id = ? AND f.escola_id = ?`,
    [id, tenantId]
  )
  return r.rows[0]
}

// `role` = portal principal (onde a conta entra por omissão); `portaisExtra`
// = outros portais a que também tem acesso, de forma definitiva -- uma só
// conta e um só código, em vez de um cadastro por portal.
const criarAcesso = async (tenantId, funcionarioId, role, portaisExtra = [], concedidoPor = null) => {
  if (!PORTAIS_EQUIPA.includes(role)) {
    const err = new Error('Role inválido para acesso ao sistema')
    err.status = 400
    throw err
  }
  const extras = [...new Set((Array.isArray(portaisExtra) ? portaisExtra : []).filter(p => p !== role))]
  if (extras.some(p => !PORTAIS_EQUIPA.includes(p))) {
    const err = new Error('Portal inválido na lista de portais adicionais')
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

  // Cada portal adicional recebe o seu próprio código (ex: ITA.PRF.004) --
  // mesma conta e mesma senha, mas o perfil distingue-se pelo código.
  const codigos = [{ portal: role, codigo }]
  for (const portal of extras) {
    const codigoExtra = await gerarCodigo(tenantId, portal)
    await db.query(
      `INSERT INTO utilizador_portais (escola_id, utilizador_id, portal, valido_ate, concedido_por, codigo)
       VALUES (?, ?, ?, NULL, ?, ?) ON CONFLICT (utilizador_id, portal) DO NOTHING`,
      [tenantId, utilizadorId, portal, concedidoPor, codigoExtra]
    )
    codigos.push({ portal, codigo: codigoExtra })
  }

  return { utilizador_id: utilizadorId, codigo, codigos, role, portais: [role, ...extras], senha_padrao: senhaFinal, primeiro_login: true }
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

const erroValidacao = (mensagem, status = 400) => {
  const err = new Error(mensagem)
  err.status = status
  return err
}

// BI guardado sempre no mesmo formato (sem espaços, maiúsculas), para que
// "110100123456 a" e "110100123456A" sejam reconhecidos como o mesmo BI.
const normalizarBi = (bi) => (bi || '').toString().replace(/\s+/g, '').toUpperCase()

const garantirBiUnico = async (tenantId, biNorm, ignorarId = null) => {
  if (!biNorm) throw erroValidacao('O número do BI é obrigatório.')
  const r = await db.query(
    `SELECT id, nome FROM funcionarios
     WHERE escola_id = ? AND UPPER(REPLACE(TRIM(bi), ' ', '')) = ? ${ignorarId ? 'AND id <> ?' : ''}`,
    ignorarId ? [tenantId, biNorm, ignorarId] : [tenantId, biNorm]
  )
  if (r.rows[0]) throw erroValidacao(`Já existe um funcionário registado com este BI (${r.rows[0].nome}).`, 409)
}

// Números móveis em Moçambique: M-Pesa (Vodacom) 84/85, E-Mola (Movitel)
// 86/87 -- 9 dígitos. Aceita o indicativo 258/+258 e guarda só os 9 dígitos,
// que é o formato das folhas E-Mola/M-Pesa que a escola entrega.
const normalizarNumeroMovel = (v) => (v || '').toString().replace(/[\s-]/g, '').replace(/^\+?258/, '')
const PREFIXO_MOVEL = { mpesa: /^8[45]\d{7}$/, emola: /^8[67]\d{7}$/ }

// A conta de pagamento é o que decide se o salário chega ao funcionário --
// por isso é validada aqui e não só no formulário. Devolve os valores já
// normalizados para gravar.
const validarDadosPagamento = ({ metodo_pagamento, banco, conta_bancaria }) => {
  const metodo = METODOS_PAGAMENTO.includes(metodo_pagamento) ? metodo_pagamento : 'banco'
  if (metodo === 'banco') {
    const nomeBanco = (banco || '').trim()
    if (!nomeBanco) throw erroValidacao('Seleccione o banco onde o salário é depositado.')
    if (/^\d+$/.test(nomeBanco)) throw erroValidacao('No campo "Banco" indique o nome do banco (ex: BIM), não o número da conta.')
    const conta = (conta_bancaria || '').replace(/[\s-]/g, '')
    if (!conta) throw erroValidacao('O número da conta bancária é obrigatório.')
    if (!/^\d{5,25}$/.test(conta)) throw erroValidacao('Número de conta bancária inválido — use só algarismos.')
    return { metodo_pagamento: metodo, banco: nomeBanco, conta_bancaria: conta }
  }
  const numero = normalizarNumeroMovel(conta_bancaria)
  const nomeMetodo = metodo === 'mpesa' ? 'M-Pesa' : 'E-Mola'
  if (!numero) throw erroValidacao(`O número ${nomeMetodo} é obrigatório.`)
  if (!PREFIXO_MOVEL[metodo].test(numero)) {
    throw erroValidacao(`Número ${nomeMetodo} inválido — deve ter 9 algarismos e começar por ${metodo === 'mpesa' ? '84 ou 85' : '86 ou 87'}.`)
  }
  return { metodo_pagamento: metodo, banco: null, conta_bancaria: numero }
}

const criar = async (tenantId, dados) => {
  const {
    nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
    data_nascimento, genero, endereco, role, departamento_id, cargo_id,
    salario_base, tipo_contrato, data_admissao,
    numero_dependentes, sujeito_inss
  } = dados
  if (!nome || !nome.trim()) throw erroValidacao('O nome é obrigatório.')
  const biNorm = normalizarBi(bi)
  await garantirBiUnico(tenantId, biNorm)
  const { metodo_pagamento, banco, conta_bancaria } = validarDadosPagamento(dados)
  const r = await db.query(
    `INSERT INTO funcionarios
      (escola_id, nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
       data_nascimento, genero, endereco, role, departamento_id, cargo_id,
       salario_base, tipo_contrato, data_admissao, metodo_pagamento, banco, conta_bancaria, numero_dependentes, sujeito_inss, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [tenantId, nome.trim(), foto || null, email || null, telefone || null, biNorm,
     nuit || null, numero_seguranca_social || null, data_nascimento || null,
     genero || null, endereco || null, role || null, departamento_id || null,
     cargo_id || null, salario_base || null, tipo_contrato || null,
     data_admissao || null, metodo_pagamento,
     banco, conta_bancaria, parseInt(numero_dependentes) || 0,
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

  // Mesmas regras do registo -- o BI e a conta de pagamento continuam
  // obrigatórios e válidos ao editar. Uma alteração só ao estado (activar/
  // inactivar) não mexe nestes campos e por isso não é bloqueada.
  if ('bi' in filtrado) {
    filtrado.bi = normalizarBi(filtrado.bi)
    await garantirBiUnico(tenantId, filtrado.bi, id)
  }
  if (['metodo_pagamento', 'banco', 'conta_bancaria'].some(k => k in dados)) {
    const atual = await db.query('SELECT metodo_pagamento, banco, conta_bancaria FROM funcionarios WHERE id = ? AND escola_id = ?', [id, tenantId])
    if (!atual.rows[0]) throw erroValidacao('Funcionário não encontrado', 404)
    Object.assign(filtrado, validarDadosPagamento({ ...atual.rows[0], ...filtrado }))
  }
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

// Quem determina se um contrato ja expirou e' sempre o proprio sistema, a
// partir da data_fim -- nunca uma pessoa a escolher manualmente "expirado"
// num ecra. Chamado em qualquer leitura que decida algo com base no estado
// (listagem, folha de pagamento, resumo do funcionario), para nunca usar um
// contrato "activo" que, pela data, ja devia ter terminado.
const marcarContratosExpirados = async (tenantId) => {
  await db.query(
    "UPDATE contratos SET estado = 'expirado' WHERE escola_id = ? AND estado = 'activo' AND data_fim IS NOT NULL AND data_fim < CURRENT_DATE",
    [tenantId]
  )
}

const listarContratos = async (tenantId, filters = {}) => {
  await marcarContratosExpirados(tenantId)
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

// Contrato individual com os dados do funcionario necessarios ao documento
// formal impresso (foto, documento de identificacao, cargo) -- listarContratos
// so traz o nome, insuficiente para esse documento.
const obterContrato = async (tenantId, id) => {
  await marcarContratosExpirados(tenantId)
  const r = await db.query(
    `SELECT ct.*,
            f.nome AS funcionario_nome, f.foto AS funcionario_foto, f.bi, f.nuit,
            f.data_nascimento, f.endereco, f.numero_seguranca_social,
            c.nome AS cargo_nome, d.nome AS departamento_nome
     FROM contratos ct
     JOIN funcionarios f ON ct.funcionario_id = f.id
     LEFT JOIN cargos c ON f.cargo_id = c.id
     LEFT JOIN departamentos d ON f.departamento_id = d.id
     WHERE ct.id = ? AND ct.escola_id = ?`,
    [id, tenantId]
  )
  if (!r.rows[0]) { const e = new Error('Contrato não encontrado'); e.status = 404; throw e }
  return r.rows[0]
}

const REGIMES_SALARIAIS = ['mensal', 'diario', 'horario']

// A escola paga por dia (ou salário mensal fixo), nunca por hora -- o regime
// horário só continua a ser lido em contratos antigos, não é aceite em novos.
const garantirRegimeAceite = (regime) => {
  if (regime === 'horario') throw erroValidacao('O regime por hora não é usado nesta escola — escolha Diário ou Mensal.')
}

const criarContrato = async (tenantId, dados) => {
  const { funcionario_id, tipo, data_inicio, data_fim, salario, regime_salarial, horas_semanais, observacoes, arquivo } = dados
  garantirRegimeAceite(regime_salarial)
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

// Nunca aceita um "estado" vindo do pedido -- editar um contrato e' para
// corrigir dados (datas, salario, tipo), nao para mudar a fase em que esta.
// Activo->expirado e' automatico (marcarContratosExpirados); rescindir e'
// renovar sao acoes proprias (rescindirContrato/renovarContrato), para
// nunca se perder o motivo ou o contrato seguinte que a mudanca implica.
const atualizarContrato = async (tenantId, id, dados) => {
  const { tipo, data_inicio, data_fim, salario, regime_salarial, horas_semanais, observacoes, arquivo } = dados
  const regime = REGIMES_SALARIAIS.includes(regime_salarial) ? regime_salarial : 'mensal'
  const setArquivo = arquivo !== undefined ? ', arquivo=?' : ''
  const params = [tipo, data_inicio, data_fim || null, regime, salario, horas_semanais || 40, observacoes || null]
  if (arquivo !== undefined) params.push(arquivo || null)
  params.push(id, tenantId)
  await db.query(
    `UPDATE contratos SET tipo=?, data_inicio=?, data_fim=?, regime_salarial=?, salario=?, horas_semanais=?, observacoes=?${setArquivo}
     WHERE id=? AND escola_id=?`,
    params
  )
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [id]
  )
  return f.rows[0]
}

// Rescisao antecipada -- a unica transicao de estado que e' mesmo uma
// decisao humana (a escola decide terminar o contrato antes do data_fim).
const rescindirContrato = async (tenantId, id, motivo) => {
  const atual = await db.query('SELECT observacoes, estado FROM contratos WHERE id=? AND escola_id=?', [id, tenantId])
  if (!atual.rows[0]) throw new Error('Contrato não encontrado')
  if (['rescindido', 'renovado'].includes(atual.rows[0].estado)) throw new Error('Este contrato já não está activo')
  const novaObs = [atual.rows[0].observacoes, motivo ? `Rescindido: ${motivo}` : 'Rescindido'].filter(Boolean).join(' | ')
  await db.query("UPDATE contratos SET estado='rescindido', observacoes=? WHERE id=? AND escola_id=?", [novaObs, id, tenantId])
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [id]
  )
  return f.rows[0]
}

// Renovacao -- cria o contrato seguinte (sempre activo) e marca o actual
// como 'renovado', nunca os dois "activo" ao mesmo tempo para o mesmo
// funcionario (gerarFolha so deve encontrar um).
const renovarContrato = async (tenantId, id, dados) => {
  const atual = await db.query('SELECT * FROM contratos WHERE id=? AND escola_id=?', [id, tenantId])
  if (!atual.rows[0]) throw new Error('Contrato não encontrado')
  const c = atual.rows[0]
  if (!['activo', 'expirado'].includes(c.estado)) throw new Error('Só é possível renovar um contrato activo ou expirado')
  const { tipo, data_inicio, data_fim, salario, regime_salarial, horas_semanais, observacoes } = dados
  if (!data_inicio || !salario) throw new Error('Data de início e salário são obrigatórios')
  garantirRegimeAceite(regime_salarial)
  const regime = REGIMES_SALARIAIS.includes(regime_salarial) ? regime_salarial : c.regime_salarial
  const r = await db.query(
    `INSERT INTO contratos (escola_id, funcionario_id, tipo, data_inicio, data_fim, regime_salarial, salario, horas_semanais, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, c.funcionario_id, tipo || c.tipo, data_inicio, data_fim || null, regime, salario, horas_semanais || c.horas_semanais, observacoes || null]
  )
  await db.query("UPDATE contratos SET estado='renovado' WHERE id=? AND escola_id=?", [id, tenantId])
  const f = await db.query(
    `SELECT ct.*, f.nome AS funcionario_nome FROM contratos ct JOIN funcionarios f ON ct.funcionario_id=f.id WHERE ct.id=?`,
    [r.rows[0].insertId]
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

// conta_debito_salarios / nome_ordenante: conta da escola de onde sai o
// dinheiro, usada na linha de débito ("D") do ficheiro de transferência do
// banco. Quando não vêm no pedido, mantêm-se os valores já gravados.
const atualizarConfiguracao = async (tenantId, dados) => {
  const { dias_uteis_mes, inss_trabalhador, inss_entidade, componentes, conta_debito_salarios, nome_ordenante } = dados
  const contaDebito = conta_debito_salarios === undefined ? undefined : ((conta_debito_salarios || '').replace(/[\s-]/g, '') || null)
  if (contaDebito && !/^\d{5,25}$/.test(contaDebito)) throw erroValidacao('Conta de débito inválida — use só algarismos.')
  await db.query(
    `INSERT INTO rh_configuracao (escola_id, dias_uteis_mes, inss_trabalhador, inss_entidade, componentes, conta_debito_salarios, nome_ordenante)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (escola_id) DO UPDATE SET
       dias_uteis_mes=EXCLUDED.dias_uteis_mes,
       inss_trabalhador=EXCLUDED.inss_trabalhador,
       inss_entidade=EXCLUDED.inss_entidade,
       componentes=EXCLUDED.componentes,
       conta_debito_salarios=${contaDebito === undefined ? 'rh_configuracao.conta_debito_salarios' : 'EXCLUDED.conta_debito_salarios'},
       nome_ordenante=${nome_ordenante === undefined ? 'rh_configuracao.nome_ordenante' : 'EXCLUDED.nome_ordenante'}`,
    [tenantId, dias_uteis_mes || 22, inss_trabalhador || 3, inss_entidade || 4,
     JSON.stringify(componentes || []), contaDebito || null, (nome_ordenante || '').trim() || null]
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

  // Garante que nenhum contrato ja expirado pela data ainda conta como
  // 'activo' aqui -- sem isto, a folha podia usar um contrato que, pela
  // data_fim, ja devia ter terminado.
  await marcarContratosExpirados(tenantId)

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
    // Regime diário: o valor do contrato é o valor POR DIA. Os dias pagos
    // partem dos dias úteis do mês menos as faltas injustificadas registadas
    // -- o RH só ajusta as excepções (ex: entrou a meio do mês), em vez de
    // ter de escrever os dias de cada diarista um a um.
    // Regime horário (legado, já não oferecido no registo): mantém-se a 0 e
    // com aviso, porque as horas nunca são inferíveis.
    const ehVariavel = regime === 'diario' || regime === 'horario'
    const taxaUnitaria = ehVariavel ? (parseFloat(func.salario_contrato) || 0) : null
    const faltasInjust = parseFloat(faltasMap[func.id] || 0)
    const qtdTrabalhada = regime === 'diario' ? Math.max(0, diasUteis - faltasInjust) : (regime === 'horario' ? 0 : null)
    const salarioBase = ehVariavel ? (taxaUnitaria * qtdTrabalhada) : (parseFloat(func.salario_contrato || func.salario_base) || 0)
    const diasFalta = ehVariavel ? 0 : faltasInjust

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
    if (faltasInjust > 0) notas.push(`${faltasInjust} dia(s) de falta injustificada deduzido(s)`)
    const avisos = [...resultado.avisos]
    if (regime === 'horario') avisos.push('Regime horário: indique as horas trabalhadas em "Ajustar" para calcular o salário.')

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
        func.contrato_id || null, regime, taxaUnitaria !== null ? taxaUnitaria.toFixed(2) : null, qtdTrabalhada !== null ? qtdTrabalhada.toFixed(2) : null, sujeitoInss,
        func.metodo_pagamento || 'banco', func.banco || null, func.conta_bancaria || null,
        faltasInjust.toFixed(2), 'injustificada', diasUteis,
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

// Recalcula e grava os totais agregados (folha_pagamento.total_*) a partir
// das linhas reais em `salarios`. Único ponto que soma as linhas para a
// folha -- usado tanto ao processar a folha como ao gravar qualquer ajuste
// manual numa linha em rascunho, para que o resumo nunca fique desactualizado
// em relação aos valores individuais (não altera `estado`).
const recalcularTotaisFolha = async (tenantId, folhaId) => {
  const linhas = await db.query(
    `SELECT valor_bruto, bonus, subsidio_alimentacao, subsidio_transporte, subsidio_habitacao,
            inss_trabalhador, inss_entidade, outras_deducoes, valor_liquido
     FROM salarios WHERE folha_id=?`,
    [folhaId]
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
       total_bruto=?, total_liquido=?, total_inss=?, total_inss_entidade=?
     WHERE id=? AND escola_id=?`,
    [totalBruto.toFixed(2), totalLiquido.toFixed(2), totalInss.toFixed(2), totalInssEntidade.toFixed(2), folhaId, tenantId]
  )
}

// Recalcula os totais a partir das linhas e marca a folha como 'processado'
const processarFolha = async (tenantId, id, userId) => {
  const folha = await db.query('SELECT * FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw new Error('Folha não encontrada')
  if (folha.rows[0].estado === 'pago') throw new Error('Folha já paga, não pode ser reprocessada')

  // Nenhuma folha avança com problemas que impedem o pagamento correcto
  // (conta em falta/inválida, líquido negativo...) -- ver analisarFolha.
  const actual = await obterFolha(tenantId, id)
  const nBloq = actual.analise.bloqueantes.length
  if (nBloq > 0) {
    throw erroValidacao(`A folha tem ${nBloq} problema(s) por resolver na análise (ex: ${actual.analise.bloqueantes[0].funcionario_nome} — ${actual.analise.bloqueantes[0].mensagem}). Corrija-os antes de processar.`)
  }

  await recalcularTotaisFolha(tenantId, id)
  await db.query(`UPDATE folha_pagamento SET estado='processado' WHERE id=? AND escola_id=?`, [id, tenantId])
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

const num = (v) => parseFloat(v) || 0
const NOME_METODO = { banco: 'Banco', mpesa: 'M-Pesa', emola: 'E-Mola' }

// Valor por dia e dias pagos de uma linha, no formato das folhas da escola
// (colunas "Valor D/H" e "Qtd. D/H"). Diário: vem directamente da linha.
// Mensal: salário do contrato / dias úteis, e dias úteis menos faltas.
const valorDiaEDias = (l) => {
  if (l.regime_salarial === 'diario' || l.regime_salarial === 'horario') {
    return { valor_dia: num(l.taxa_unitaria), dias_pagos: num(l.quantidade_trabalhada) }
  }
  const diasUteis = num(l.dias_uteis_utilizados) || 22
  const diasPagos = Math.max(0, diasUteis - num(l.dias_falta))
  const salarioMensal = num(l.salario_contrato) || (diasPagos > 0 ? num(l.valor_bruto) * diasUteis / diasPagos : 0)
  return { valor_dia: salarioMensal / diasUteis, dias_pagos: diasPagos }
}

// Cada documento de pagamento é um "grupo": E-Mola, M-Pesa, ou um por banco
// (o ficheiro de transferência em lote é sempre de um banco só).
const grupoPagamento = (metodo, banco) => (
  metodo === 'banco' ? `banco:${(banco || 'Sem banco').trim().toUpperCase()}` : metodo
)
const tituloGrupo = (grupo) => (
  grupo.startsWith('banco:') ? `Banco — ${grupo.slice(6)}` : NOME_METODO[grupo] || grupo
)

const enriquecerLinha = (l) => {
  const metodo = l.metodo_pagamento_utilizado || 'banco'
  const acrescimos = num(l.bonus) + num(l.subsidio_alimentacao) + num(l.subsidio_transporte) + num(l.subsidio_habitacao)
  const descontos = num(l.inss_trabalhador) + num(l.outras_deducoes)
  return {
    ...l, ...valorDiaEDias(l), acrescimos, descontos,
    metodo_pagamento_utilizado: metodo,
    grupo_pagamento: grupoPagamento(metodo, l.banco_utilizado),
  }
}

const resumirGrupos = (linhas) => {
  const grupos = {}
  for (const l of linhas) {
    const g = (grupos[l.grupo_pagamento] ||= {
      chave: l.grupo_pagamento, metodo: l.metodo_pagamento_utilizado, titulo: tituloGrupo(l.grupo_pagamento),
      funcionarios: 0, total_bruto: 0, total_liquido: 0,
    })
    g.funcionarios += 1
    g.total_bruto += num(l.valor_bruto)
    g.total_liquido += num(l.valor_liquido)
  }
  const ordem = { emola: 0, mpesa: 1 }
  return Object.values(grupos).sort((a, b) => (ordem[a.chave] ?? 2) - (ordem[b.chave] ?? 2) || a.chave.localeCompare(b.chave))
}

// Análise minuciosa da folha antes de processar/pagar. "Bloqueantes" impedem
// processar (o dinheiro não chegaria a quem deve, ou o valor está errado);
// "alertas" exigem atenção mas podem ser legítimos (ex: funcionário com 0
// dias por estar de licença sem vencimento).
const analisarFolha = async (tenantId, folhaId, linhas) => {
  const bloqueantes = []
  const alertas = []
  const add = (lista, l, mensagem) => lista.push({
    salario_id: l?.id || null, funcionario_id: l?.funcionario_id || null,
    funcionario_nome: l?.funcionario_nome || null, mensagem,
  })
  const porConta = {}

  for (const l of linhas) {
    const metodo = l.metodo_pagamento_utilizado
    const conta = (l.conta_pagamento_utilizada || '').replace(/\s+/g, '')
    if (!conta) {
      add(bloqueantes, l, metodo === 'banco' ? 'Sem número de conta bancária.' : `Sem número ${NOME_METODO[metodo]}.`)
    } else if (metodo !== 'banco' && !PREFIXO_MOVEL[metodo].test(normalizarNumeroMovel(conta))) {
      add(bloqueantes, l, `Número ${NOME_METODO[metodo]} inválido (${conta}) — deve ter 9 algarismos e começar por ${metodo === 'mpesa' ? '84/85' : '86/87'}.`)
    } else if (metodo === 'banco' && (!l.banco_utilizado || /^\d+$/.test(l.banco_utilizado.trim()))) {
      add(bloqueantes, l, 'Banco não indicado (ou com um número no lugar do nome do banco).')
    }
    if (conta) (porConta[`${metodo}:${conta}`] ||= []).push(l)

    if (num(l.valor_liquido) < 0) add(bloqueantes, l, 'Salário líquido negativo — as deduções são maiores do que o bruto.')
    if (l.regime_salarial === 'horario' && !(num(l.quantidade_trabalhada) > 0)) add(bloqueantes, l, 'Regime horário sem horas trabalhadas indicadas.')

    if (!l.contrato_id) add(alertas, l, 'Sem contrato activo — calculado sem contrato.')
    if (l.sujeito_inss_utilizado === 'a_confirmar') add(alertas, l, 'Sujeição a INSS ainda por confirmar no cadastro.')
    if (l.dias_pagos === 0) add(alertas, l, 'Zero dias pagos neste mês.')
    else if (num(l.valor_liquido) === 0) add(alertas, l, 'Salário líquido igual a zero.')
    const brutoTotal = num(l.valor_bruto) + l.acrescimos
    if (brutoTotal > 0 && l.descontos / brutoTotal > 0.5) {
      add(alertas, l, `Descontos elevados: ${Math.round(l.descontos * 100 / brutoTotal)}% do bruto (${l.descontos.toFixed(2)} MT).`)
    }
  }

  for (const [chave, ls] of Object.entries(porConta)) {
    if (ls.length < 2) continue
    const nomes = ls.map(x => x.funcionario_nome).join(', ')
    ls.forEach(l => add(alertas, l, `A mesma conta (${chave.split(':')[1]}) está associada a ${ls.length} funcionários: ${nomes}.`))
  }

  const faltam = await db.query(
    `SELECT f.id, f.nome FROM funcionarios f
     WHERE f.escola_id = ? AND f.estado = 'activo'
       AND EXISTS (SELECT 1 FROM contratos ct WHERE ct.funcionario_id = f.id AND ct.estado = 'activo')
       AND NOT EXISTS (SELECT 1 FROM salarios s WHERE s.folha_id = ? AND s.funcionario_id = f.id)`,
    [tenantId, folhaId]
  )
  faltam.rows.forEach(f => alertas.push({
    salario_id: null, funcionario_id: f.id, funcionario_nome: f.nome,
    mensagem: 'Funcionário activo com contrato que não está nesta folha (registado depois de a folha ser gerada).',
  }))

  return { bloqueantes, alertas }
}

const obterFolha = async (tenantId, id) => {
  const folha = await db.query('SELECT * FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) return null
  const r = await db.query(
    `SELECT s.*, f.nome AS funcionario_nome, f.bi AS funcionario_bi, f.cargo_id, f.departamento_id,
            c.nome AS cargo_nome, ct.salario AS salario_contrato
     FROM salarios s
     JOIN funcionarios f ON s.funcionario_id = f.id
     LEFT JOIN cargos c ON f.cargo_id = c.id
     LEFT JOIN contratos ct ON ct.id = s.contrato_id
     WHERE s.folha_id = ? AND s.escola_id = ? ORDER BY f.nome`,
    [id, tenantId]
  )
  const linhas = r.rows.map(enriquecerLinha)
  const analise = await analisarFolha(tenantId, id, linhas)
  return { ...folha.rows[0], linhas, analise, grupos_pagamento: resumirGrupos(linhas) }
}

// ─── DOCUMENTOS DE PAGAMENTO (Excel) ──────────────────────────────────────────
// E-Mola / M-Pesa: folha salarial no formato que a escola já usa (Valor D/H,
// Qtd. D/H, Bruto, INSS %, Líquido com +acréscimos/-descontos).
// Banco: ficheiro de transferência em lote (CONTA, NOME, VALOR, NR_DOCUMENTO,
// DESC, TRAN, MOEDA) com uma linha de crédito por funcionário e, no fim, a
// linha de débito da conta da escola pelo total -- o formato do BIM.
const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const exportarFolhaExcel = async (tenantId, id, grupo) => {
  const ExcelJS = require('exceljs')
  const folha = await obterFolha(tenantId, id)
  if (!folha) throw erroValidacao('Folha não encontrada', 404)
  if (folha.estado === 'rascunho') throw erroValidacao('Processe a folha antes de gerar os documentos de pagamento.')
  const linhas = folha.linhas.filter(l => l.grupo_pagamento === grupo)
  if (!linhas.length) throw erroValidacao('Não há funcionários neste grupo de pagamento.')

  const escola = (await db.query('SELECT nome, sigla FROM escolas WHERE id = ?', [tenantId])).rows[0] || {}
  const cfg = await obterConfiguracao(tenantId)
  const mesNome = MESES_NOME[folha.mes - 1]
  const descricao = `Salario/${mesNome.toUpperCase()} ${folha.ano}`
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIGE'
  const FMT = '#,##0.00'
  const VERDE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6C6' } }
  const r2 = (v) => Math.round(num(v) * 100) / 100

  if (grupo.startsWith('banco:')) {
    const banco = grupo.slice(6)
    const ws = wb.addWorksheet(`Pagamento ${banco}`.slice(0, 31))
    ws.columns = [
      { header: 'CONTA', key: 'conta', width: 18 },
      { header: 'NOME', key: 'nome', width: 34 },
      { header: 'VALOR', key: 'valor', width: 14 },
      { header: 'NR_DOCUMENTO', key: 'doc', width: 15 },
      { header: 'DESC', key: 'desc', width: 24 },
      { header: 'TRAN', key: 'tran', width: 8 },
      { header: 'MOEDA', key: 'moeda', width: 8 },
    ]
    ws.getRow(1).font = { bold: true }
    // Só quem recebe alguma coisa entra no lote do banco (uma transferência
    // de 0 MT seria rejeitada).
    const pagar = linhas.filter(l => r2(l.valor_liquido) > 0)
    let total = 0
    for (const l of pagar) {
      total += r2(l.valor_liquido)
      ws.addRow({ conta: String(l.conta_pagamento_utilizada || ''), nome: l.funcionario_nome, valor: r2(l.valor_liquido), doc: 0, desc: descricao, tran: 'C', moeda: 0 })
    }
    if (cfg.conta_debito_salarios) {
      const debito = ws.addRow({
        conta: String(cfg.conta_debito_salarios), nome: cfg.nome_ordenante || escola.sigla || escola.nome,
        valor: Math.round(total * 100) / 100, doc: 0, desc: descricao, tran: 'D', moeda: 0,
      })
      debito.font = { bold: true }
    }
    ws.getColumn('valor').numFmt = '0.00'
    ws.getColumn('conta').numFmt = '@'
    return { buffer: await wb.xlsx.writeBuffer(), nomeFicheiro: `pagamento_${banco.replace(/[^A-Z0-9]+/gi, '_')}_${mesNome}_${folha.ano}.xlsx` }
  }

  const titulo = `FOLHA SALARIAL - ${NOME_METODO[grupo].toUpperCase()}`
  const ws = wb.addWorksheet(NOME_METODO[grupo])
  ws.columns = [
    { key: 'ord', width: 6 }, { key: 'nome', width: 34 }, { key: 'conta', width: 14 },
    { key: 'valor_dia', width: 13 }, { key: 'dias', width: 9 }, { key: 'bruto', width: 14 },
    { key: 'inss', width: 9 }, { key: 'acres', width: 14 }, { key: 'desc', width: 14 }, { key: 'liquido', width: 15 },
  ]
  ws.mergeCells('A1:J1'); ws.getCell('A1').value = escola.nome || 'Escola'
  ws.mergeCells('A2:J2'); ws.getCell('A2').value = titulo
  ;['A1', 'A2'].forEach(c => { ws.getCell(c).alignment = { horizontal: 'center' }; ws.getCell(c).font = { bold: true, size: c === 'A1' ? 13 : 11 } })
  ws.getCell('A3').value = 'Ano:'; ws.getCell('B3').value = folha.ano
  ws.getCell('A4').value = 'Mês:'; ws.getCell('B4').value = mesNome
  ;['A3', 'A4'].forEach(c => { ws.getCell(c).font = { bold: true } })

  const cab = ws.getRow(6)
  cab.values = ['Ord.', 'Nome do funcionário', 'Conta', 'Valor D/H', 'Qtd. D/H', 'Valor Bruto', 'INSS %', 'Acréscimos (+)', 'Descontos (-)', 'Valor Líquido']
  cab.font = { bold: true }
  cab.eachCell(c => { c.fill = VERDE; c.alignment = { horizontal: 'center' } })

  const tot = { bruto: 0, acres: 0, desc: 0, liquido: 0 }
  linhas.forEach((l, i) => {
    tot.bruto += r2(l.valor_bruto); tot.acres += r2(l.acrescimos); tot.desc += r2(l.descontos); tot.liquido += r2(l.valor_liquido)
    ws.addRow({
      ord: i + 1, nome: l.funcionario_nome, conta: String(l.conta_pagamento_utilizada || ''),
      valor_dia: r2(l.valor_dia), dias: num(l.dias_pagos), bruto: r2(l.valor_bruto),
      inss: num(l.inss_trabalhador) > 0 ? num(l.taxa_inss_trabalhador) / 100 : 0,
      acres: r2(l.acrescimos), desc: r2(l.descontos), liquido: r2(l.valor_liquido),
    })
  })
  const linhaTotal = ws.addRow({ ord: 'TOTAL:', bruto: tot.bruto, acres: tot.acres, desc: tot.desc, liquido: tot.liquido })
  linhaTotal.font = { bold: true }
  linhaTotal.eachCell(c => { c.fill = VERDE })
  ;['valor_dia', 'bruto', 'acres', 'desc', 'liquido'].forEach(k => { ws.getColumn(k).numFmt = FMT })
  ws.getColumn('inss').numFmt = '0.00%'
  ws.getColumn('conta').numFmt = '@'
  return { buffer: await wb.xlsx.writeBuffer(), nomeFicheiro: `Salarios_${mesNome}_${NOME_METODO[grupo]}_${folha.ano}.xlsx` }
}

// Os dados de pagamento ficam congelados na linha quando a folha é gerada.
// Se o RH corrigir a conta/número de um funcionário depois disso (por ex.
// a pedido da análise), esta acção volta a copiar do cadastro -- só em
// rascunho, nunca numa folha já processada/paga.
const sincronizarPagamentoFolha = async (tenantId, id, userId) => {
  const folha = await db.query('SELECT estado, mes, ano FROM folha_pagamento WHERE id=? AND escola_id=?', [id, tenantId])
  if (!folha.rows[0]) throw erroValidacao('Folha não encontrada', 404)
  if (folha.rows[0].estado !== 'rascunho') throw erroValidacao('Só é possível actualizar dados de pagamento numa folha em rascunho')
  const r = await db.query(
    `UPDATE salarios s SET
       metodo_pagamento_utilizado = f.metodo_pagamento,
       banco_utilizado = f.banco,
       conta_pagamento_utilizada = f.conta_bancaria
     FROM funcionarios f
     WHERE s.funcionario_id = f.id AND s.folha_id = ? AND s.escola_id = ?
     RETURNING s.id`,
    [id, tenantId]
  )
  await registarAuditoriaRh(tenantId, userId, 'folha_pagamento', 'sincronizar_pagamento',
    `Dados de pagamento da folha ${folha.rows[0].mes}/${folha.rows[0].ano} actualizados a partir do cadastro (${r.rows.length} linha(s)).`)
  return obterFolha(tenantId, id)
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
  // Mantém o resumo da folha (total_bruto/total_inss/total_liquido) sincronizado
  // com os valores individuais imediatamente após cada ajuste gravado — antes só
  // era recalculado ao processar a folha, deixando o resumo desactualizado
  // enquanto a folha ainda estava em rascunho.
  await recalcularTotaisFolha(tenantId, s.folha_id)
  const f = await db.query('SELECT * FROM salarios WHERE id=?', [salarioId])
  return f.rows[0]
}

// ─── RESUMO FUNCIONÁRIO ───────────────────────────────────────────────────────

const obterResumoFuncionario = async (tenantId, id) => {
  await marcarContratosExpirados(tenantId)
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
  listarContratos, obterContrato, criarContrato, atualizarContrato, rescindirContrato, renovarContrato,
  listarFerias, criarFerias, atualizarEstadoFerias,
  listarFaltas, criarFalta, eliminarFalta,
  listarFolhas, gerarFolha, obterFolha, pagarFolha, processarFolha, eliminarFolha, atualizarLinhaSalario,
  sincronizarPagamentoFolha, exportarFolhaExcel,
  obterStats,
}
