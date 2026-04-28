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
    createdAt: row.created_at,
  }
}

router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM services ORDER BY name ASC').all()
    res.json(rows.map(toJSON))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { name, category } = req.body
  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e categoria são obrigatórios' })
  }
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    await db.prepare('INSERT INTO services (id, name, category, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, category, createdAt)
    res.status(201).json({ id, name, category, createdAt })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, category } = req.body
  try {
    await db.prepare('UPDATE services SET name = ?, category = ? WHERE id = ?')
      .run(name, category, req.params.id)
    res.json({ id: req.params.id, name, category })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
