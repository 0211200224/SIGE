require('dotenv').config()

// Falhar já no arranque se faltar alguma variável crítica -- melhor um
// crash imediato e óbvio do que o servidor arrancar "com sucesso" e só
// rebentar no primeiro pedido autenticado (ex: JWT_SECRET em falta).
const OBRIGATORIAS = ['DATABASE_URL', 'JWT_SECRET']
const emFalta = OBRIGATORIAS.filter(k => !process.env[k])
if (emFalta.length) {
  console.error(`Variáveis de ambiente obrigatórias em falta: ${emFalta.join(', ')}`)
  process.exit(1)
}

const app = require('./app')

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`SIGE Backend running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
