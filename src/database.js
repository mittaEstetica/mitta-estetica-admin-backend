import pg from 'pg'
import crypto from 'crypto'
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
})

function toPg(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

function stmtApi(queryFn) {
  return (sql) => {
    const pgSql = toPg(sql)
    return {
      async get(...args) {
        const { rows } = await queryFn(pgSql, args)
        return rows[0] || null
      },
      async all(...args) {
        const { rows } = await queryFn(pgSql, args)
        return rows
      },
      async run(...args) {
        const result = await queryFn(pgSql, args)
        return { changes: result.rowCount }
      },
    }
  }
}

const db = {
  prepare: stmtApi((sql, params) => pool.query(sql, params)),

  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const tx = { prepare: stmtApi((sql, params) => client.query(sql, params)) }
        const result = await fn(tx, ...args)
        await client.query('COMMIT')
        return result
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    }
  },

  async end() {
    await pool.end()
  },
}

export function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

const admin = await db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
if (!admin) {
  await db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, permissions, collaborator_id, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    'admin',
    hashPassword('admin'),
    'Administrador',
    'admin',
    '["*"]',
    null,
    true,
    new Date().toISOString(),
  )
} else {
  await db.prepare(`
    UPDATE users SET
      name = CASE WHEN name = '' THEN 'Administrador' ELSE name END,
      permissions = CASE WHEN permissions = '' THEN '["*"]' ELSE permissions END
    WHERE username = 'admin'
  `).run()
}

try {
  await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room TEXT DEFAULT 'sala1'`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_photos (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      photo TEXT NOT NULL,
      procedure_name TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      source TEXT DEFAULT '',
      status TEXT DEFAULT 'novo',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      lead_id TEXT,
      client_name TEXT NOT NULL,
      client_email TEXT DEFAULT '',
      procedure_name TEXT NOT NULL DEFAULT '',
      sessions INTEGER DEFAULT 1,
      total_value NUMERIC DEFAULT 0,
      payment_method TEXT DEFAULT '',
      status TEXT DEFAULT 'rascunho',
      sent_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount NUMERIC DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
} catch (e) {
  console.log('[Migration]', e.message)
}

export default db
