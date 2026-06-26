const authService = require('./auth.service')
const { success, error, badRequest } = require('../../utils/response')

const login = async (req, res) => {
  try {
    const { codigo, email, password } = req.body
    const identificador = codigo || email
    if (!identificador || !password) {
      return badRequest(res, 'Código e senha são obrigatórios')
    }
    const result = await authService.login(identificador, password)
    return success(res, result, 'Login bem-sucedido')
  } catch (err) {
    return error(res, err.message, err.status || 401)
  }
}

const refresh = async (req, res) => {
  try {
    const result = await authService.refresh(req.user)
    return success(res, result, 'Token renovado')
  } catch (err) {
    return error(res, err.message, 500)
  }
}

const logout = async (req, res) => {
  return success(res, null, 'Sessão terminada')
}

const me = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id)
    return success(res, user)
  } catch (err) {
    return error(res, err.message, 500)
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return badRequest(res, 'Campos obrigatórios em falta')
    await authService.changePassword(req.user.id, currentPassword, newPassword)
    return success(res, null, 'Senha alterada com sucesso')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

const changePasswordFirstLogin = async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword) return badRequest(res, 'Nova senha é obrigatória')
    await authService.changePasswordFirstLogin(req.user.id, newPassword)
    return success(res, null, 'Senha definida com sucesso')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

const register = async (req, res) => {
  try {
    const { nome, email, role, escola_id, data_nascimento } = req.body
    if (!nome || !role || !escola_id) return badRequest(res, 'Nome, perfil e escola são obrigatórios')
    const user = await authService.register({ nome, email, role, escola_id, data_nascimento })
    return success(res, user, 'Utilizador criado com sucesso', 201)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

module.exports = { login, refresh, logout, me, changePassword, changePasswordFirstLogin, register }
