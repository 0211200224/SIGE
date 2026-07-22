const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../../config/database')
const { gerarCodigo, senhaDeNascimento } = require('../../utils/codigoGenerator')

const login = async (codigo, password) => {
  // Aceita codigo OU email (retrocompatibilidade)
  const result = await db.query(
    'SELECT * FROM utilizadores WHERE (codigo = ? OR email = ?) AND activo = 1',
    [codigo, codigo]
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

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tenant_id: user.escola_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const { password_hash, ...userWithoutPassword } = user
  return { token, user: userWithoutPassword, primeiro_login: !!user.primeiro_login }
}

const refresh = async (userPayload) => {
  const token = jwt.sign(
    { id: userPayload.id, email: userPayload.email, role: userPayload.role, tenant_id: userPayload.tenant_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  return { token }
}

const getUserById = async (id) => {
  const result = await db.query(
    'SELECT id, nome, email, codigo, role, escola_id, primeiro_login, criado_em FROM utilizadores WHERE id = ?',
    [id]
  )
  return result.rows[0]
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

  const newHash = await bcrypt.hash(newPassword, 12)
  await db.query(
    'UPDATE utilizadores SET password_hash = ?, primeiro_login = 0 WHERE id = ?',
    [newHash, userId]
  )
}

const changePasswordFirstLogin = async (userId, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('A senha deve ter pelo menos 6 caracteres')
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
