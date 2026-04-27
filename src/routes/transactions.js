import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    date: row.date,
    createdAt: row.created_at,
  }
}

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all()
    res.json(rows.map(toJSON))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message })
  }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  const { type, amount, description, date } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    await db.prepare(`
      INSERT INTO transactions (id, type, amount, description, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, amount || 0, description || '', date, createdAt)

    res.status(201).json({
      id, type, amount: amount || 0, description: description || '', date, createdAt
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction', details: error.message })
  }
})

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  const { type, amount, description, date } = req.body
  try {
    const existing = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Transaction not found' })

    await db.prepare(`
      UPDATE transactions SET type = ?, amount = ?, description = ?, date = ?
      WHERE id = ?
    `).run(type, amount || 0, description || '', date, req.params.id)

    const updated = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id)
    res.json(toJSON(updated))
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction', details: error.message })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message })
  }
})

export default router
