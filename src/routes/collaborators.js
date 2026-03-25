import { Router } from 'express'
import crypto from 'crypto'
import db, { hashPassword } from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    commissionPercent: row.commission_percent,
    role: row.role,
    active: !!row.active,
    hasPassword: !!row.password_hash,
    createdAt: row.created_at,
  }
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM collaborators ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Collaborator not found' })
  res.json(toJSON(row))
})

router.post('/', (req, res) => {
  const { name, phone, email, commissionPercent, role, active, password } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const pwHash = password ? hashPassword(password) : ''

  db.prepare(`
    INSERT INTO collaborators (id, name, phone, email, commission_percent, role, active, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, phone || '', email || '', commissionPercent || 0, role || '', active !== false ? 1 : 0, pwHash, createdAt)

  res.status(201).json({
    id, name, phone: phone || '', email: email || '',
    commissionPercent: commissionPercent || 0, role: role || '',
    active: active !== false, createdAt, hasPassword: !!password,
  })
})

router.put('/:id', (req, res) => {
  const { name, phone, email, commissionPercent, role, active, password } = req.body
  const existing = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Collaborator not found' })

  db.prepare(`
    UPDATE collaborators SET name = ?, phone = ?, email = ?, commission_percent = ?, role = ?, active = ?
    WHERE id = ?
  `).run(name, phone || '', email || '', commissionPercent || 0, role || '', active ? 1 : 0, req.params.id)

  if (password) {
    db.prepare('UPDATE collaborators SET password_hash = ? WHERE id = ?').run(hashPassword(password), req.params.id)
  }

  const updated = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM collaborators WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Collaborator not found' })
  res.json({ success: true })
})

export default router
