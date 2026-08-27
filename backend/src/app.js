const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./modules/auth/auth.routes')
const escolasRoutes = require('./modules/escolas/escolas.routes')
const alunosRoutes = require('./modules/alunos/alunos.routes')
const notasRoutes = require('./modules/notas/notas.routes')
const presencasRoutes = require('./modules/presencas/presencas.routes')
const financeiroRoutes = require('./modules/financeiro/financeiro.routes')
const rhRoutes = require('./modules/rh/rh.routes')
const relatoriosRoutes = require('./modules/relatorios/relatorios.routes')
const pedagogicoRoutes = require('./modules/pedagogico/pedagogico.routes')
const secretariaRoutes = require('./modules/secretaria/secretaria.routes')
const professorRoutes = require('./modules/professor/professor.routes')
const estudanteRoutes = require('./modules/estudante/estudante.routes')
const directorRoutes = require('./modules/director/director.routes')
const notificacoesRoutes = require('./modules/notificacoes/notificacoes.routes')
const { traduzirErroPostgres } = require('./utils/pgErrorTranslator')

const app = express()

// Cabeçalhos de segurança HTTP base (CSP desligado -- a API não serve HTML/
// assets, só JSON; o frontend é uma app separada com o seu próprio CSP).
app.use(helmet({ contentSecurityPolicy: false }))

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Limite geral -- protecção base contra abuso/varrimento em toda a API.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tente novamente dentro de alguns minutos.' },
}))


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/escolas', escolasRoutes)
app.use('/api/alunos', alunosRoutes)
app.use('/api/notas', notasRoutes)
app.use('/api/presencas', presencasRoutes)
app.use('/api/financeiro', financeiroRoutes)
app.use('/api/rh', rhRoutes)
app.use('/api/relatorios', relatoriosRoutes)
app.use('/api/pedagogico', pedagogicoRoutes)
app.use('/api/secretaria', secretariaRoutes)
app.use('/api/professor', professorRoutes)
app.use('/api/estudante', estudanteRoutes)
app.use('/api/diretor', directorRoutes)
app.use('/api/notificacoes', notificacoesRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)

  // Erros lançados deliberadamente pelos serviços (new Error('mensagem em
  // português')) não têm err.code -- a sua mensagem já é a final, tal como
  // sempre foi. Só um erro cru do driver Postgres (err.code = SQLSTATE) passa
  // por tradução; se o código não for reconhecido, cai num fallback seguro
  // em vez de mostrar texto técnico em inglês ao utilizador.
  const traduzido = traduzirErroPostgres(err)
  let mensagem = err.message || 'Erro interno do servidor'
  if (traduzido) mensagem = traduzido
  else if (err.code) mensagem = 'Ocorreu um erro ao processar o pedido. Tente novamente ou contacte o suporte.'

  res.status(err.status || 500).json({ error: mensagem })
})

module.exports = app
