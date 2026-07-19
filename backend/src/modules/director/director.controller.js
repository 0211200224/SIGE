const svc = require('./director.service')

const handle = (fn) => async (req, res, next) => {
  try { await fn(req, res) } catch (e) { next(e) }
}

// Dashboard Executivo
exports.dashboardExecutivo = handle(async (req, res) => {
  const data = await svc.dashboardExecutivo(req.tenantId)
  res.json(data)
})

// Utilizadores
exports.listarUtilizadores = handle(async (req, res) => {
  const data = await svc.listarUtilizadores(req.tenantId, req.query)
  res.json(data)
})

exports.ativarUtilizador = handle(async (req, res) => {
  await svc.atualizarEstadoUtilizador(req.tenantId, req.params.id, true)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'utilizadores', `Ativou utilizador #${req.params.id}`, null, req.ip)
  res.json({ sucesso: true })
})

exports.desativarUtilizador = handle(async (req, res) => {
  await svc.atualizarEstadoUtilizador(req.tenantId, req.params.id, false)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'utilizadores', `Desativou utilizador #${req.params.id}`, null, req.ip)
  res.json({ sucesso: true })
})

exports.atualizarRoleUtilizador = handle(async (req, res) => {
  const { role } = req.body
  await svc.atualizarRoleUtilizador(req.tenantId, req.params.id, role)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'utilizadores', `Alterou role utilizador #${req.params.id} para ${role}`, null, req.ip)
  res.json({ sucesso: true })
})

exports.resetarSenhaUtilizador = handle(async (req, res) => {
  const resultado = await svc.resetarSenhaUtilizador(req.tenantId, req.params.id)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'utilizadores', `Repôs a senha do utilizador #${req.params.id}`, null, req.ip)
  res.json({ sucesso: true, ...resultado })
})

// Políticas Académicas
exports.obterPoliticasAcademicas = handle(async (req, res) => {
  const data = await svc.obterPoliticasAcademicas(req.tenantId)
  res.json(data)
})

exports.salvarPoliticasAcademicas = handle(async (req, res) => {
  await svc.salvarPoliticasAcademicas(req.tenantId, req.body)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'politicas', 'Actualizou políticas académicas', null, req.ip)
  res.json({ sucesso: true })
})

// Políticas Financeiras
exports.obterPoliticasFinanceiras = handle(async (req, res) => {
  const data = await svc.obterPoliticasFinanceiras(req.tenantId)
  res.json(data)
})

exports.salvarPoliticasFinanceiras = handle(async (req, res) => {
  await svc.salvarPoliticasFinanceiras(req.tenantId, req.body)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'politicas', 'Actualizou políticas financeiras', null, req.ip)
  res.json({ sucesso: true })
})

// Políticas Administrativas
exports.obterPoliticasAdministrativas = handle(async (req, res) => {
  const data = await svc.obterPoliticasAdministrativas(req.tenantId)
  res.json(data)
})

exports.salvarPoliticasAdministrativas = handle(async (req, res) => {
  await svc.salvarPoliticasAdministrativas(req.tenantId, req.body)
  await svc.registarAuditoria(req.tenantId, req.user.id, req.user.nome, 'politicas', 'Actualizou políticas administrativas', null, req.ip)
  res.json({ sucesso: true })
})

// Aprovações
exports.listarAprovacoes = handle(async (req, res) => {
  const data = await svc.listarAprovacoes(req.tenantId, req.query)
  res.json(data)
})

exports.criarSolicitacao = handle(async (req, res) => {
  const data = await svc.criarSolicitacao(req.tenantId, req.body, req.user.id)
  res.status(201).json(data)
})

exports.decidirSolicitacao = handle(async (req, res) => {
  const { estado, observacao } = req.body
  await svc.decidirSolicitacao(req.tenantId, req.params.id, estado, observacao)
  await svc.registarAuditoria(
    req.tenantId, req.user.id, req.user.nome, 'aprovacoes',
    `${estado === 'aprovado' ? 'Aprovou' : 'Rejeitou'} solicitação #${req.params.id}`,
    observacao, req.ip
  )
  res.json({ sucesso: true })
})

// Auditoria
exports.listarAuditoria = handle(async (req, res) => {
  const data = await svc.listarAuditoria(req.tenantId, req.query)
  res.json(data)
})

// Relatórios
exports.relatorioExecutivo = handle(async (req, res) => {
  const data = await svc.relatorioExecutivo(req.tenantId, req.params.tipo)
  res.json(data)
})

// Indicadores
exports.indicadoresInstitucionais = handle(async (req, res) => {
  const data = await svc.indicadoresInstitucionais(req.tenantId)
  res.json(data)
})
