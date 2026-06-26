require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./config/database')

async function seed() {
  try {
    const hash = await bcrypt.hash('admin123', 12)
    await db.query(
      `INSERT IGNORE INTO utilizadores (id, escola_id, nome, email, password_hash, role)
       VALUES (1, 1, 'Director Admin', 'admin@sige.co.mz', ?, 'director')`,
      [hash]
    )
    console.log('Seed completo. Login: admin@sige.co.mz / admin123')
    process.exit(0)
  } catch (err) {
    console.error('Erro no seed:', err.message)
    process.exit(1)
  }
}

seed()
