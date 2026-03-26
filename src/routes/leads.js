import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

router.get('/', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Lead não encontrado' })
  res.json(toJSON(row))
})

router.post('/', async (req, res) => {
  const { name, phone, email, source, status, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.prepare(`
    INSERT INTO leads (id, name, phone, email, source, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, phone || '', email || '', source || '', status || 'novo', notes || '', createdAt)

  res.status(201).json({ id, name, phone: phone || '', email: email || '', source: source || '', status: status || 'novo', notes: notes || '', createdAt })
})

router.put('/:id', async (req, res) => {
  const { name, phone, email, source, status, notes } = req.body
  const existing = await db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Lead não encontrado' })

  await db.prepare(`
    UPDATE leads SET name = ?, phone = ?, email = ?, source = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(name, phone || '', email || '', source || '', status || 'novo', notes || '', req.params.id)

  const updated = await db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Lead não encontrado' })
  res.json({ success: true })
})

export default router
