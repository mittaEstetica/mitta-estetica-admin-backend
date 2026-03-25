import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    minQuantity: row.min_quantity,
    unit: row.unit,
    costPrice: row.cost_price,
    createdAt: row.created_at,
  }
}

router.get('/', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM stock_items ORDER BY name ASC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Stock item not found' })
  res.json(toJSON(row))
})

router.post('/', async (req, res) => {
  const { name, category, quantity, minQuantity, unit, costPrice } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.prepare(`
    INSERT INTO stock_items (id, name, category, quantity, min_quantity, unit, cost_price, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category || '', quantity || 0, minQuantity || 0, unit || 'unidade', costPrice || 0, createdAt)

  res.status(201).json({ id, name, category: category || '', quantity: quantity || 0, minQuantity: minQuantity || 0, unit: unit || 'unidade', costPrice: costPrice || 0, createdAt })
})

router.put('/:id', async (req, res) => {
  const { name, category, quantity, minQuantity, unit, costPrice } = req.body
  const existing = await db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Stock item not found' })

  await db.prepare(`
    UPDATE stock_items SET name = ?, category = ?, quantity = ?, min_quantity = ?, unit = ?, cost_price = ?
    WHERE id = ?
  `).run(name, category || '', quantity ?? existing.quantity, minQuantity ?? existing.min_quantity, unit || existing.unit, costPrice ?? existing.cost_price, req.params.id)

  const updated = await db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM stock_items WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Stock item not found' })
  res.json({ success: true })
})

export default router
