const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sige_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
})

pool.getConnection()
  .then(conn => { console.log('Connected to MySQL database'); conn.release() })
  .catch(err => { console.error('MySQL connection error:', err.message); process.exit(-1) })

const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params)
  return { rows: Array.isArray(rows) ? rows : [rows] }
}

module.exports = { query, pool }
