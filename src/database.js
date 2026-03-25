import Database from 'better-sqlite3'
import crypto from 'crypto'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbDir = join(__dirname, '..', 'data')
mkdirSync(dbDir, { recursive: true })

const db = new Database(join(dbDir, 'mitta.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
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
  );

  CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    commission_percent REAL NOT NULL DEFAULT 0,
    role TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    collaborator_id TEXT,
    name TEXT NOT NULL,
    services TEXT NOT NULL DEFAULT '[]',
    total_sessions INTEGER NOT NULL DEFAULT 1,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    session_value REAL NOT NULL DEFAULT 0,
    paid_value REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    collaborator_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    appointment_id TEXT NOT NULL,
    session_value REAL NOT NULL DEFAULT 0,
    commission_percent REAL NOT NULL DEFAULT 0,
    collaborator_amount REAL NOT NULL DEFAULT 0,
    clinic_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    quantity REAL NOT NULL DEFAULT 0,
    min_quantity REAL NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'unidade',
    cost_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    stock_item_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    reason TEXT DEFAULT '',
    appointment_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    package_id TEXT,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled',
    stock_used TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'admin',
    permissions TEXT NOT NULL DEFAULT '["*"]',
    collaborator_id TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`)

// Migrate existing packages table to add new columns if they don't exist
try {
  db.exec(`ALTER TABLE packages ADD COLUMN collaborator_id TEXT`)
} catch (_) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE packages ADD COLUMN session_value REAL NOT NULL DEFAULT 0`)
} catch (_) { /* column already exists */ }
// Migrate collaborators to add password_hash
try {
  db.exec(`ALTER TABLE collaborators ADD COLUMN password_hash TEXT DEFAULT ''`)
} catch (_) { /* column already exists */ }
// Migrate appointments to add collaborator_id
try { db.exec(`ALTER TABLE appointments ADD COLUMN collaborator_id TEXT`) } catch (_) { /* already exists */ }
// Migrate users table for new columns
try { db.exec(`ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''`) } catch (_) { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '["*"]'`) } catch (_) { /* already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1`) } catch (_) { /* already exists */ }

export function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
if (!adminExists) {
  db.prepare(`
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
    1,
    new Date().toISOString(),
  )
} else {
  // Ensure existing admin has name + permissions
  db.prepare(`UPDATE users SET name = CASE WHEN name = '' THEN 'Administrador' ELSE name END, permissions = CASE WHEN permissions = '' THEN '["*"]' ELSE permissions END WHERE username = 'admin'`).run()
}

export default db
