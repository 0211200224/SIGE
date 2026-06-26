const svc = require('./financeiro.service')
const h = (fn) => async (req, res, next) => { try { await fn(req, res, next) } catch (err) { next(err) } }
const tid = (req) => req.user.escola_id || req.user.tenant_id

module.exports = {
  obterStats:          h(async (req, res) => res.json(await svc.obterStats(tid(req)))),

  listarPlanos:        h(async (req, res) => res.json(await svc.listarPlanos(tid(req)))),
  criarPlano:          h(async (req, res) => res.status(201).json(await svc.criarPlano(tid(req), req.body))),
  atualizarPlano:      h(async (req, res) => res.json(await svc.atualizarPlano(tid(req), req.params.id, req.body))),
  gerarCobrancasPlano: h(async (req, res) => res.json(await svc.gerarCobrancasPlano(tid(req), req.body))),

  listarTaxas:         h(async (req, res) => res.json(await svc.listarTaxas(tid(req)))),
  criarTaxa:           h(async (req, res) => res.status(201).json(await svc.criarTaxa(tid(req), req.body))),
  atualizarTaxa:       h(async (req, res) => res.json(await svc.atualizarTaxa(tid(req), req.params.id, req.body))),
  desactivarTaxa:      h(async (req, res) => { await svc.desactivarTaxa(tid(req), req.params.id); res.json({ ok: true }) }),

  listarCobrancas:     h(async (req, res) => res.json(await svc.listarCobrancas(tid(req), req.query))),
  criarCobranca:       h(async (req, res) => res.status(201).json(await svc.criarCobranca(tid(req), req.body))),
  gerarCobrancasTurma: h(async (req, res) => res.json(await svc.gerarCobrancasTurma(tid(req), req.body))),
  cancelarCobranca:    h(async (req, res) => { await svc.cancelarCobranca(tid(req), req.params.id); res.json({ ok: true }) }),

  listarContas:        h(async (req, res) => res.json(await svc.listarContas(tid(req), req.query))),
  obterContaAluno:     h(async (req, res) => res.json(await svc.obterContaAluno(tid(req), req.params.alunoId, req.query))),

  listarPagamentos:    h(async (req, res) => res.json(await svc.listarPagamentos(tid(req), req.query))),
  registarPagamento:   h(async (req, res) => res.status(201).json(await svc.registarPagamento(tid(req), req.user.id, req.body))),
  moverParaAnalise:    h(async (req, res) => res.json(await svc.moverParaAnalise(tid(req), req.user.id, req.params.id))),
  confirmarPagamento:  h(async (req, res) => res.json(await svc.confirmarPagamento(tid(req), req.user.id, req.params.id))),
  rejeitarPagamento:   h(async (req, res) => res.json(await svc.rejeitarPagamento(tid(req), req.params.id, req.body.motivo))),

  listarRecibos:       h(async (req, res) => res.json(await svc.listarRecibos(tid(req), req.query))),
  obterRecibo:         h(async (req, res) => res.json(await svc.obterRecibo(tid(req), req.params.id))),

  listarDividas:       h(async (req, res) => res.json(await svc.listarDividas(tid(req)))),

  listarBolsas:        h(async (req, res) => res.json(await svc.listarBolsas(tid(req), req.query))),
  criarBolsa:          h(async (req, res) => res.status(201).json(await svc.criarBolsa(tid(req), req.body))),
  decidirBolsa:        h(async (req, res) => res.json(await svc.decidirBolsa(tid(req), req.user.id, req.params.id, req.body.decisao, req.body.motivo))),

  listarFechos:        h(async (req, res) => res.json(await svc.listarFechos(tid(req)))),
  realizarFecho:       h(async (req, res) => res.json(await svc.realizarFecho(tid(req), req.user.id, req.body))),

  obterRelatorio:      h(async (req, res) => res.json(await svc.obterRelatorio(tid(req), req.params.tipo, req.query))),

  // Retrocompat aliases
  resumo:              h(async (req, res) => res.json(await svc.obterStats(tid(req)))),
  aprovarPagamento:    h(async (req, res) => res.json(await svc.confirmarPagamento(tid(req), req.user.id, req.params.id))),
}
