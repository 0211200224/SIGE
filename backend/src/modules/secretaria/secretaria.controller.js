const svc = require('./secretaria.service')

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res, next) } catch (err) { next(err) }
}

const tid = (req) => req.user.escola_id || req.user.tenant_id

// ─── STATS ────────────────────────────────────────────────────────────────────
exports.obterStats = h(async (req, res) => {
  res.json({ data: await svc.obterStats(tid(req)) })
})

// ─── ALUNOS ───────────────────────────────────────────────────────────────────
exports.listarAlunos = h(async (req, res) => {
  res.json({ data: await svc.listarAlunos(tid(req), req.query) })
})
exports.obterAluno = h(async (req, res) => {
  res.json({ data: await svc.obterAluno(tid(req), req.params.id) })
})
exports.criarAluno = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarAluno(tid(req), req.body) })
})
exports.atualizarAluno = h(async (req, res) => {
  res.json({ data: await svc.atualizarAluno(tid(req), req.params.id, req.body) })
})
exports.alterarStatusAluno = h(async (req, res) => {
  res.json({ data: await svc.alterarStatusAluno(tid(req), req.params.id, req.body.status) })
})

// ─── ENCARREGADOS ─────────────────────────────────────────────────────────────
exports.listarEncarregados = h(async (req, res) => {
  res.json({ data: await svc.listarEncarregados(tid(req), req.query) })
})
exports.criarEncarregado = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarEncarregado(tid(req), req.body) })
})
exports.atualizarEncarregado = h(async (req, res) => {
  res.json({ data: await svc.atualizarEncarregado(tid(req), req.params.id, req.body) })
})
exports.associarEncarregado = h(async (req, res) => {
  await svc.associarEncarregadoAluno(tid(req), req.params.alunoId, req.body.encarregado_id, req.body.principal)
  res.json({ message: 'Encarregado associado' })
})
exports.removerEncarregado = h(async (req, res) => {
  await svc.removerEncarregadoAluno(tid(req), req.params.alunoId, req.params.encarregadoId)
  res.json({ message: 'Encarregado removido' })
})

// ─── MATRÍCULAS ───────────────────────────────────────────────────────────────
exports.listarMatriculas = h(async (req, res) => {
  res.json({ data: await svc.listarMatriculas(tid(req), req.query) })
})
exports.criarMatricula = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarMatricula(tid(req), req.body) })
})
exports.cancelarMatricula = h(async (req, res) => {
  await svc.cancelarMatricula(tid(req), req.params.id)
  res.json({ message: 'Matrícula cancelada' })
})

// ─── TURMAS ───────────────────────────────────────────────────────────────────
exports.listarTurmas = h(async (req, res) => {
  res.json({ data: await svc.listarTurmasSecretaria(tid(req), req.query) })
})
exports.criarTurma = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarTurma(tid(req), req.body) })
})
exports.atualizarTurma = h(async (req, res) => {
  res.json({ data: await svc.atualizarTurma(tid(req), req.params.id, req.body) })
})
exports.listarClasses = h(async (req, res) => {
  res.json({ data: await svc.listarClasses(tid(req)) })
})

// ─── TRANSFERÊNCIAS ───────────────────────────────────────────────────────────
exports.listarTransferencias = h(async (req, res) => {
  res.json({ data: await svc.listarTransferencias(tid(req), req.query) })
})
exports.criarTransferencia = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarTransferencia(tid(req), req.body) })
})
exports.atualizarStatusTransferencia = h(async (req, res) => {
  res.json({ data: await svc.atualizarStatusTransferencia(tid(req), req.params.id, req.body.status) })
})

// ─── SOLICITAÇÕES ─────────────────────────────────────────────────────────────
exports.listarSolicitacoes = h(async (req, res) => {
  res.json({ data: await svc.listarSolicitacoes(tid(req), req.query) })
})
exports.criarSolicitacao = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarSolicitacao(tid(req), req.body) })
})
exports.atualizarSolicitacao = h(async (req, res) => {
  res.json({ data: await svc.atualizarSolicitacao(tid(req), req.params.id, req.body) })
})

// ─── DOCUMENTOS ───────────────────────────────────────────────────────────────
exports.listarDocumentos = h(async (req, res) => {
  res.json({ data: await svc.listarDocumentos(tid(req), req.query) })
})
exports.criarDocumento = h(async (req, res) => {
  res.status(201).json({ data: await svc.criarDocumento(tid(req), req.body) })
})
exports.atualizarStatusDocumento = h(async (req, res) => {
  res.json({ data: await svc.atualizarStatusDocumento(tid(req), req.params.id, req.body.status) })
})

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────
exports.obterRelatorio = h(async (req, res) => {
  res.json({ data: await svc.obterRelatorio(tid(req), req.params.tipo, req.query) })
})
