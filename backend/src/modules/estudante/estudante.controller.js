const svc = require('./estudante.service')

const perfil = async (req, res, next) => {
  try {
    const data = await svc.perfil(req.user.id, req.user.tenant_id)
    res.json({ data })
  } catch (e) { next(e) }
}

const notas = async (req, res, next) => {
  try {
    const data = await svc.notas(req.user.id, req.user.tenant_id)
    res.json({ data })
  } catch (e) { next(e) }
}

const presencas = async (req, res, next) => {
  try {
    const data = await svc.presencas(req.user.id, req.user.tenant_id)
    res.json({ data })
  } catch (e) { next(e) }
}

const financeiro = async (req, res, next) => {
  try {
    const data = await svc.financeiro(req.user.id, req.user.tenant_id)
    res.json({ data })
  } catch (e) { next(e) }
}

const boletim = async (req, res, next) => {
  try {
    const data = await svc.boletim(req.user.id, req.user.tenant_id)
    res.json({ data })
  } catch (e) { next(e) }
}

module.exports = { perfil, notas, presencas, financeiro, boletim }
