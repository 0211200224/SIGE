const express = require('express')
const router = express.Router()
const c = require('./pedagogico.controller')
const auth = require('../../middleware/auth')

router.use(auth)

// Stats
router.get('/stats', c.obterStats)

// Estrutura escolar
router.get('/classes', c.listarClasses)
router.post('/classes', c.criarClasse)
router.put('/classes/:id', c.atualizarClasse)
router.delete('/classes/:id', c.removerClasse)

router.get('/salas', c.listarSalas)
router.post('/salas', c.criarSala)
router.put('/salas/:id', c.atualizarSala)
router.delete('/salas/:id', c.removerSala)

router.get('/turmas', c.listarTurmas)
router.post('/turmas', c.criarTurma)
router.put('/turmas/:id', c.atualizarTurma)
router.delete('/turmas/:id', c.removerTurma)

// Currículo
router.get('/disciplinas', c.listarDisciplinas)
router.post('/disciplinas', c.criarDisciplina)
router.put('/disciplinas/:id', c.atualizarDisciplina)
router.delete('/disciplinas/:id', c.removerDisciplina)

// Distribuição docente
router.get('/atribuicoes', c.listarAtribuicoes)
router.post('/atribuicoes', c.criarAtribuicao)
router.put('/atribuicoes/:id', c.atualizarAtribuicao)
router.delete('/atribuicoes/:id', c.removerAtribuicao)
router.get('/professores', c.listarProfessores)

// Períodos lectivos
router.get('/periodos', c.listarPeriodos)
router.post('/periodos', c.criarPeriodo)
router.put('/periodos/:id', c.atualizarPeriodo)
router.patch('/periodos/:id/fechar', c.fecharPeriodo)
router.patch('/periodos/:id/reabrir', c.reabrirPeriodo)

// Planos curriculares
router.get('/planos', c.listarPlanosCurriculares)
router.post('/planos', c.criarPlanoCurricular)
router.delete('/planos/:id', c.removerPlanoCurricular)

// Avaliações
router.get('/avaliacoes', c.listarAvaliacoes)
router.post('/avaliacoes', c.criarAvaliacao)
router.put('/avaliacoes/:id', c.atualizarAvaliacao)
router.delete('/avaliacoes/:id', c.removerAvaliacao)

// Validação de notas
router.get('/validacao-notas', c.listarValidacaoNotas)
router.get('/validacao-notas/aluno/:alunoId', c.obterNotasAluno)

// Frequência
router.get('/frequencia', c.obterFrequencia)

// Conselhos de classe
router.get('/conselhos', c.listarConselhos)
router.post('/conselhos', c.criarConselho)
router.put('/conselhos/:id', c.atualizarConselho)

// Resultados finais
router.post('/resultados/calcular', c.calcularResultados)
router.get('/resultados', c.listarResultados)

// Relatórios
router.get('/relatorios/:tipo', c.obterRelatorio)

// Ranking
router.get('/ranking', c.obterRanking)

module.exports = router
