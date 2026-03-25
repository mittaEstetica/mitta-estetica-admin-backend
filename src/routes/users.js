import { Router } from 'express'
import crypto from 'crypto'
import db, { hashPassword } from '../database.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(requireAdmin)

function toJSON(row) {
  if (!row) return null
  let permissions = ['*']
  try { permissions = JSON.parse(row.permissions) } catch (_) { /* fallback */ }
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    permissions,
    collaboratorId: row.collaborator_id || null,
    active: !!row.active,
    createdAt: row.created_at,
  }
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json(toJSON(row))
})

router.post('/', (req, res) => {
  const { username, password, name, role, permissions, collaboratorId, active } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return res.status(409).json({ error: 'Este nome de usuário já existe' })
  }

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const perms = JSON.stringify(permissions || ['*'])

  db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, permissions, collaborator_id, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    username,
    hashPassword(password),
    name || username,
    role || 'admin',
    perms,
    collaboratorId || null,
    active !== false ? 1 : 0,
    createdAt,
  )

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  res.status(201).json(toJSON(created))
})

router.put('/:id', (req, res) => {
  const { username, password, name, role, permissions, collaboratorId, active } = req.body
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (username && username !== existing.username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id)
    if (dup) return res.status(409).json({ error: 'Este nome de usuário já existe' })
  }

  const perms = permissions ? JSON.stringify(permissions) : existing.permissions

  db.prepare(`
    UPDATE users SET username = ?, name = ?, role = ?, permissions = ?, collaborator_id = ?, active = ?
    WHERE id = ?
  `).run(
    username || existing.username,
    name ?? existing.name,
    role || existing.role,
    perms,
    collaboratorId !== undefined ? (collaboratorId || null) : existing.collaborator_id,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id,
  )

  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), req.params.id)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (user.username === 'admin') {
    return res.status(403).json({ error: 'Não é possível excluir o administrador principal' })
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
