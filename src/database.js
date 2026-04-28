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

// Migrations
try {
  // Create all tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL,
      collaborator_id TEXT,
      active BOOLEAN DEFAULT true,
      created_at TEXT NOT NULL
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      cpf TEXT DEFAULT '',
      birth_date TEXT DEFAULT '',
      address TEXT DEFAULT '',
      photo TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      package_id TEXT,
      collaborator_id TEXT,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      room TEXT DEFAULT 'sala1',
      status TEXT DEFAULT 'scheduled',
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
      created_at TEXT NOT NULL,
      paid BOOLEAN DEFAULT false,
      receipt_url TEXT
    )
  `)

  // ... other tables (simplified for now to ensure seeding works)
  await pool.query(`CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, patient_id TEXT, collaborator_id TEXT, name TEXT, services TEXT, total_sessions INTEGER, completed_sessions INTEGER, total_value NUMERIC, session_value NUMERIC, paid_value NUMERIC, status TEXT, created_at TEXT)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS stock_items (id TEXT PRIMARY KEY, name TEXT, category TEXT, quantity INTEGER, min_quantity INTEGER, unit TEXT, cost_price NUMERIC, created_at TEXT)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, stock_item_id TEXT, type TEXT, quantity INTEGER, reason TEXT, appointment_id TEXT, created_at TEXT)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS commissions (id TEXT PRIMARY KEY, collaborator_id TEXT, package_id TEXT, appointment_id TEXT, session_value NUMERIC, commission_percent NUMERIC, collaborator_amount NUMERIC, clinic_amount NUMERIC, created_at TEXT)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, created_at TEXT NOT NULL)`)
  
  // Initial Seeding for Services
  const { rows: serviceCount } = await pool.query('SELECT count(*) FROM services')
  if (parseInt(serviceCount[0].count) === 0) {
    console.log('Seeding initial services...')
    const FACIAL = [
      'Limpeza de Pele', 'Peeling Químico', 'Microagulhamento', 'Microcorrentes',
      'Radiofrequência Facial', 'Massagem Craniana', 'Drenagem Facial (Pós-operatória)', 'Método Mitta'
    ]
    const CORPORAL = [
      'Ultrassom/US (Gordura e Celulite)', 'Corrente Russa (Diástase, Tonificação, Metabolização)',
      'Terapia Combinada (US + Corrente Russa)', 'Radiofrequência (Celulite e Flacidez)',
      'Criolipólise', 'Massagem Relaxante', 'Massagem Terapêutica', 'Massagem com Pedras Quentes',
      'Massagem com Velas', 'Drenagem Linfática', 'Drenagem + Modeladora Local', 'Método Mitta'
    ]
    const now = new Date().toISOString()
    for (const name of FACIAL) {
      await pool.query('INSERT INTO services (id, name, category, created_at) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), name, 'facial', now])
    }
    for (const name of CORPORAL) {
      await pool.query('INSERT INTO services (id, name, category, created_at) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), name, 'corporal', now])
    }
    console.log('Services seeded!')
  }

  console.log('Database initialized successfully')
} catch (e) {
  console.log('[Migration Error]', e.message)
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
}

export default db
