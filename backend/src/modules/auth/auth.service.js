const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../../config/database')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')
const { validarForcaSenha } = require('../../utils/passwordPolicy')
const { obterPortais } = require('../../utils/portais')

const login = async (codigo, password) => {
  // Aceita codigo OU email (retrocompatibilidade). Comparacao case-insensitive
  // porque o codigo gerado e sempre maiusculo (SIGLA.ROLE.NNN) mas o utilizador
  // pode digitar sem CAPS LOCK; a UI forca maiusculas visualmente, mas o valor
  // real enviado deve ser aceite independentemente da caixa usada ao digitar.
  // utilizadores nao tem coluna de foto propria -- a foto real vive em
  // funcionarios (staff) ou alunos (estudante), ligados por utilizador_id /
  // aluno_id. Sem este JOIN, a sidebar de qualquer portal (excepto
  // director/super_admin, que nao mostram foto de funcionario) ficava
  // sempre sem imagem, mesmo com a foto correctamente cadastrada.
  // Cada portal de uma conta tem o seu código (ex: ITA.DIR.001 e
  // ITA.PRF.004): todos entram na mesma conta, com a mesma senha, e o
  // código usado decide o portal onde a pessoa entra.
  const result = await db.query(
    `SELECT u.*, COALESCE(f.foto, a.foto) AS foto,
            up.portal AS portal_do_codigo, TO_CHAR(up.valido_ate, 'YYYY-MM-DD') AS portal_valido_ate,
            (up.valido_ate IS NOT NULL AND up.valido_ate < CURRENT_DATE) AS portal_expirado
     FROM utilizadores u
     LEFT JOIN funcionarios f ON f.utilizador_id = u.id
     LEFT JOIN alunos a ON a.id = u.aluno_id
     LEFT JOIN utilizador_portais up ON up.utilizador_id = u.id AND UPPER(up.codigo) = UPPER(?)
     WHERE (UPPER(u.codigo) = UPPER(?) OR UPPER(u.email) = UPPER(?) OR up.id IS NOT NULL) AND u.activo = 1`,
    [codigo, codigo, codigo]
  )
  const user = result.rows[0]
  if (!user) {
    const err = new Error('Código ou senha inválidos')
    err.status = 401
    throw err
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    const err = new Error('Código ou senha inválidos')
    err.status = 401
    throw err
  }

  // Só depois da senha certa, para não revelar que o código existe.
  if (user.portal_expirado) {
    const err = new Error(`O acesso temporário a este portal terminou em ${user.portal_valido_ate.split('-').reverse().join('/')}. Fale com o Diretor.`)
    err.status = 401
    throw err
  }

  const portais = await obterPortais(user.id, user.role)
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, portais, tenant_id: user.escola_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  // Portal onde entrar: o do código usado. Entrada por email não indica
  // nenhum -- quem tem vários portais escolhe no ecrã de portais.
  const portalEntrada = user.portal_do_codigo
    || (String(user.codigo || '').toUpperCase() === String(codigo).toUpperCase() ? user.role : null)

  const { password_hash, portal_do_codigo, portal_valido_ate, portal_expirado, ...userWithoutPassword } = user
  return { token, user: { ...userWithoutPassword, portais }, primeiro_login: !!user.primeiro_login, portal_entrada: portalEntrada }
}

const refresh = async (userPayload) => {
  const portais = await obterPortais(userPayload.id, userPayload.role)
  const token = jwt.sign(
    { id: userPayload.id, email: userPayload.email, role: userPayload.role, portais, tenant_id: userPayload.tenant_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  return { token }
}

// Devolve sempre os portais actuais (não os do token) -- é o que permite um
// portal concedido/retirado pelo Diretor reflectir-se sem novo login.
const getUserById = async (id) => {
  const result = await db.query(
    `SELECT u.id, u.nome, u.email, u.codigo, u.role, u.escola_id, u.primeiro_login, u.criado_em, u.activo,
            COALESCE(f.foto, a.foto) AS foto
     FROM utilizadores u
     LEFT JOIN funcionarios f ON f.utilizador_id = u.id
     LEFT JOIN alunos a ON a.id = u.aluno_id
     WHERE u.id = ?`,
    [id]
  )
  const user = result.rows[0]
  if (!user) return null
  return { ...user, portais: await obterPortais(user.id, user.role) }
}

const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await db.query('SELECT password_hash FROM utilizadores WHERE id = ?', [userId])
  const user = result.rows[0]
  if (!user) throw new Error('Utilizador não encontrado')

  const isValid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isValid) {
    const err = new Error('Senha actual incorrecta')
    err.status = 400
    throw err
  }

  const erroSenha = validarForcaSenha(newPassword)
  if (erroSenha) {
    const err = new Error(erroSenha)
    err.status = 400
    throw err
  }

  const newHash = await bcrypt.hash(newPassword, 12)
  await db.query(
    'UPDATE utilizadores SET password_hash = ?, primeiro_login = 0 WHERE id = ?',
    [newHash, userId]
  )
}

const changePasswordFirstLogin = async (userId, newPassword) => {
  const erroSenha = validarForcaSenha(newPassword)
  if (erroSenha) {
    const err = new Error(erroSenha)
    err.status = 400
    throw err
  }
  const newHash = await bcrypt.hash(newPassword, 12)
  await db.query(
    'UPDATE utilizadores SET password_hash = ?, primeiro_login = 0 WHERE id = ?',
    [newHash, userId]
  )
}

// Roles que correspondem a um funcionario real da escola (aluno fica de fora,
// tem o seu proprio fluxo em secretaria.service.js).
const ROLES_FUNCIONARIO = ['director', 'secretaria', 'professor', 'financeiro', 'rh', 'pedagogico']

const register = async (dados) => {
  const {
    nome, email, password, role, escola_id, data_nascimento,
    // Campos de funcionario (opcionais) — o director e' um funcionario como
    // qualquer outro, so e' criado primeiro para dar acesso aos restantes.
    foto, telefone, bi, nuit, numero_seguranca_social, genero, endereco,
    departamento_id, cargo_id, salario_base, tipo_contrato, data_admissao,
    banco, conta_bancaria,
  } = dados

  if (email) {
    const existing = await db.query('SELECT id FROM utilizadores WHERE email = ?', [email])
    if (existing.rows[0]) {
      const err = new Error('Email já registado')
      err.status = 409
      throw err
    }
  }

  // Gerar código automático
  const codigo = await gerarCodigo(escola_id, role)

  // Senha: password fornecida OU data de nascimento OU padrão
  const senhaFinal = password || (data_nascimento ? senhaDeNascimento(data_nascimento) : 'sige2024')
  const hash = await bcrypt.hash(senhaFinal, 12)

  const result = await db.query(
    'INSERT INTO utilizadores (escola_id, nome, email, password_hash, role, codigo, primeiro_login, data_nascimento) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    [escola_id, nome, email || null, hash, role, codigo, data_nascimento || null]
  )
  const utilizadorId = result.rows[0].insertId

  if (ROLES_FUNCIONARIO.includes(role)) {
    await db.query(
      `INSERT INTO funcionarios
        (escola_id, utilizador_id, nome, foto, email, telefone, bi, nuit, numero_seguranca_social,
         data_nascimento, genero, endereco, role, departamento_id, cargo_id,
         salario_base, tipo_contrato, data_admissao, banco, conta_bancaria, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
      [escola_id, utilizadorId, nome, foto || null, email || null, telefone || null, bi || null,
       nuit || null, numero_seguranca_social || null, data_nascimento || null, genero || null,
       endereco || null, role, departamento_id || null, cargo_id || null, salario_base || null,
       tipo_contrato || null, data_admissao || null, banco || null, conta_bancaria || null]
    )
  }

  const user = await db.query(
    'SELECT id, nome, email, codigo, role, escola_id, primeiro_login FROM utilizadores WHERE id = ?',
    [utilizadorId]
  )
  return { ...user.rows[0], senha_padrao: senhaFinal }
}

module.exports = { login, refresh, getUserById, changePassword, changePasswordFirstLogin, register }
