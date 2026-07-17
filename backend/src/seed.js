require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./config/database')

const SUPER_ADMIN_CODIGO = 'SIGE.ADM.001'
const SUPER_ADMIN_SENHA = 'admin123'

async function seed() {
  try {
    const hash = await bcrypt.hash(SUPER_ADMIN_SENHA, 12)
    await db.query(
      `INSERT INTO utilizadores (id, escola_id, nome, email, password_hash, role, codigo, primeiro_login)
       VALUES (1, NULL, 'Super Admin', NULL, ?, 'super_admin', ?, 1)
       ON CONFLICT (id) DO NOTHING`,
      [hash, SUPER_ADMIN_CODIGO]
    )
    console.log(`Seed completo. Login: ${SUPER_ADMIN_CODIGO} / ${SUPER_ADMIN_SENHA}`)
    process.exit(0)
  } catch (err) {
    console.error('Erro no seed:', err.message)
    process.exit(1)
  }
}

seed()
