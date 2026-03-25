import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    stockItemId: row.stock_item_id,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    appointmentId: row.appointment_id || undefined,
    createdAt: row.created_at,
  }
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM stock_movements ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.post('/', (req, res) => {
  const { stockItemId, type, quantity, reason, appointmentId } = req.body

  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(stockItemId)
  if (!item) return res.status(404).json({ error: 'Stock item not found' })

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const insertAndUpdate = db.transaction(() => {
    db.prepare(`
      INSERT INTO stock_movements (id, stock_item_id, type, quantity, reason, appointment_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, stockItemId, type, quantity, reason || '', appointmentId || null, createdAt)

    const delta = type === 'in' ? quantity : -quantity
    const newQty = Math.max(0, item.quantity + delta)
    db.prepare('UPDATE stock_items SET quantity = ? WHERE id = ?').run(newQty, stockItemId)
  })

  insertAndUpdate()

  res.status(201).json({
    id,
    stockItemId,
    type,
    quantity,
    reason: reason || '',
    appointmentId: appointmentId || undefined,
    createdAt,
  })
})

export default router
