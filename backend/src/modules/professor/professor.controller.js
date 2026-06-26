const svc = require('./professor.service')

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res, next) } catch (err) { next(err) }
}

const tid = (req) => req.user.escola_id || req.user.tenant_id
const pid = (req) => req.user.id

exports.minhasTurmas = h(async (req, res) => {
  res.json({ data: await svc.minhasTurmas(tid(req), pid(req)) })
})

exports.alunosDaTurma = h(async (req, res) => {
  res.json({ data: await svc.alunosDaTurma(tid(req), req.params.turmaId) })
})

exports.listarNotas = h(async (req, res) => {
  res.json({ data: await svc.listarNotas(tid(req), req.query) })
})

exports.lancarNotasLote = h(async (req, res) => {
  res.json({ data: await svc.lancarNotasLote(tid(req), pid(req), req.body) })
})

exports.listarPresencas = h(async (req, res) => {
  res.json({ data: await svc.listarPresencas(tid(req), req.query) })
})

exports.registarPresencas = h(async (req, res) => {
  res.json({ data: await svc.registarPresencas(tid(req), pid(req), req.body) })
})

exports.estatisticasPresenca = h(async (req, res) => {
  res.json({ data: await svc.estatisticasPresenca(tid(req), req.query) })
})

exports.obterPauta = h(async (req, res) => {
  res.json({ data: await svc.obterPauta(tid(req), req.query) })
})
