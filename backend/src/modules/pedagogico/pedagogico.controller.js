const svc = require('./pedagogico.service')

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res, next) } catch (err) { next(err) }
}
const tid = (req) => req.user.escola_id || req.user.tenant_id

// STATS
exports.obterStats = h(async (req, res) => res.json({ data: await svc.obterStats(tid(req)) }))

// CLASSES
exports.listarClasses = h(async (req, res) => res.json({ data: await svc.listarClasses(tid(req)) }))
exports.criarClasse = h(async (req, res) => res.status(201).json({ data: await svc.criarClasse(tid(req), req.body) }))
exports.atualizarClasse = h(async (req, res) => res.json({ data: await svc.atualizarClasse(tid(req), req.params.id, req.body) }))
exports.removerClasse = h(async (req, res) => { await svc.removerClasse(tid(req), req.params.id); res.json({ message: 'Classe removida' }) })

// SALAS
exports.listarSalas = h(async (req, res) => res.json({ data: await svc.listarSalas(tid(req)) }))
exports.criarSala = h(async (req, res) => res.status(201).json({ data: await svc.criarSala(tid(req), req.body) }))
exports.atualizarSala = h(async (req, res) => res.json({ data: await svc.atualizarSala(tid(req), req.params.id, req.body) }))
exports.removerSala = h(async (req, res) => { await svc.removerSala(tid(req), req.params.id); res.json({ message: 'Sala removida' }) })

// TURMAS
exports.listarTurmas = h(async (req, res) => res.json({ data: await svc.listarTurmas(tid(req)) }))
exports.criarTurma = h(async (req, res) => res.status(201).json({ data: await svc.criarTurma(tid(req), req.body) }))
exports.atualizarTurma = h(async (req, res) => res.json({ data: await svc.atualizarTurma(tid(req), req.params.id, req.body) }))
exports.removerTurma = h(async (req, res) => { await svc.removerTurma(tid(req), req.params.id); res.json({ message: 'Turma removida' }) })

// DISCIPLINAS
exports.listarDisciplinas = h(async (req, res) => res.json({ data: await svc.listarDisciplinas(tid(req)) }))
exports.criarDisciplina = h(async (req, res) => res.status(201).json({ data: await svc.criarDisciplina(tid(req), req.body) }))
exports.atualizarDisciplina = h(async (req, res) => res.json({ data: await svc.atualizarDisciplina(tid(req), req.params.id, req.body) }))
exports.removerDisciplina = h(async (req, res) => { await svc.removerDisciplina(tid(req), req.params.id); res.json({ message: 'Disciplina removida' }) })

// ATRIBUIÇÕES
exports.listarAtribuicoes = h(async (req, res) => res.json({ data: await svc.listarAtribuicoes(tid(req), req.query) }))
exports.criarAtribuicao = h(async (req, res) => res.status(201).json({ data: await svc.criarAtribuicao(tid(req), req.body) }))
exports.atualizarAtribuicao = h(async (req, res) => res.json({ data: await svc.atualizarAtribuicao(tid(req), req.params.id, req.body) }))
exports.removerAtribuicao = h(async (req, res) => { await svc.removerAtribuicao(tid(req), req.params.id); res.json({ message: 'Atribuição removida' }) })

// PROFESSORES
exports.listarProfessores = h(async (req, res) => res.json({ data: await svc.listarProfessores(tid(req)) }))

// PERÍODOS
exports.listarPeriodos = h(async (req, res) => res.json({ data: await svc.listarPeriodos(tid(req), req.query) }))
exports.criarPeriodo = h(async (req, res) => res.status(201).json({ data: await svc.criarPeriodo(tid(req), req.body) }))
exports.atualizarPeriodo = h(async (req, res) => res.json({ data: await svc.atualizarPeriodo(tid(req), req.params.id, req.body) }))
exports.fecharPeriodo = h(async (req, res) => res.json(await svc.fecharPeriodo(tid(req), req.params.id)))
exports.reabrirPeriodo = h(async (req, res) => res.json(await svc.reabrirPeriodo(tid(req), req.params.id)))

// PLANOS CURRICULARES
exports.listarPlanosCurriculares = h(async (req, res) => res.json({ data: await svc.listarPlanosCurriculares(tid(req), req.query) }))
exports.criarPlanoCurricular = h(async (req, res) => res.status(201).json({ data: await svc.criarPlanoCurricular(tid(req), req.body) }))
exports.removerPlanoCurricular = h(async (req, res) => { await svc.removerPlanoCurricular(tid(req), req.params.id); res.json({ message: 'Removido' }) })

// AVALIAÇÕES
exports.listarAvaliacoes = h(async (req, res) => res.json({ data: await svc.listarAvaliacoes(tid(req), req.query) }))
exports.criarAvaliacao = h(async (req, res) => res.status(201).json({ data: await svc.criarAvaliacao(tid(req), req.body) }))
exports.atualizarAvaliacao = h(async (req, res) => res.json({ data: await svc.atualizarAvaliacao(tid(req), req.params.id, req.body) }))
exports.removerAvaliacao = h(async (req, res) => { await svc.removerAvaliacao(tid(req), req.params.id); res.json({ message: 'Avaliação removida' }) })

// VALIDAÇÃO DE NOTAS
exports.listarValidacaoNotas = h(async (req, res) => res.json({ data: await svc.listarValidacaoNotas(tid(req), req.query) }))
exports.obterNotasAluno = h(async (req, res) => res.json({ data: await svc.obterNotasAluno(tid(req), req.params.alunoId, req.query) }))

// FREQUÊNCIA
exports.obterFrequencia = h(async (req, res) => res.json({ data: await svc.obterFrequencia(tid(req), req.query) }))

// CONSELHOS DE CLASSE
exports.listarConselhos = h(async (req, res) => res.json({ data: await svc.listarConselhos(tid(req), req.query) }))
exports.criarConselho = h(async (req, res) => res.status(201).json({ data: await svc.criarConselho(tid(req), req.user.id, req.body) }))
exports.atualizarConselho = h(async (req, res) => res.json({ data: await svc.atualizarConselho(tid(req), req.params.id, req.body) }))

// RESULTADOS FINAIS
exports.calcularResultados = h(async (req, res) => res.json({ data: await svc.calcularResultados(tid(req), req.body) }))
exports.listarResultados = h(async (req, res) => res.json({ data: await svc.listarResultados(tid(req), req.query) }))

// RELATÓRIOS
exports.obterRelatorio = h(async (req, res) => res.json({ data: await svc.obterRelatorio(tid(req), req.params.tipo, req.query) }))

// RANKING
exports.obterRanking = h(async (req, res) => res.json({ data: await svc.obterRanking(tid(req), req.query) }))
