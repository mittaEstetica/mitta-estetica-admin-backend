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

export default db
