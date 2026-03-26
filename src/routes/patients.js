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
    cpf: row.cpf,
    birthDate: row.birth_date,
    address: row.address,
    photo: row.photo,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

router.get('/', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Patient not found' })
  res.json(toJSON(row))
})

router.post('/', async (req, res) => {
  const { name, phone, email, cpf, birthDate, address, photo, notes } = req.body
  if (!name || !phone || !birthDate) {
    return res.status(400).json({ error: 'Nome, telefone e data de nascimento são obrigatórios' })
  }
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.prepare(`
    INSERT INTO patients (id, name, phone, email, cpf, birth_date, address, photo, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, phone || '', email || '', cpf || '', birthDate || '', address || '', photo || null, notes || '', createdAt)

  res.status(201).json({ id, name, phone: phone || '', email: email || '', cpf: cpf || '', birthDate: birthDate || '', address: address || '', photo: photo || null, notes: notes || '', createdAt })
})

router.put('/:id', async (req, res) => {
  const { name, phone, email, cpf, birthDate, address, photo, notes } = req.body
  const existing = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Patient not found' })

  await db.prepare(`
    UPDATE patients SET name = ?, phone = ?, email = ?, cpf = ?, birth_date = ?, address = ?, photo = ?, notes = ?
    WHERE id = ?
  `).run(name, phone || '', email || '', cpf || '', birthDate || '', address || '', photo || null, notes || '', req.params.id)

  const updated = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Patient not found' })
  res.json({ success: true })
})

export default router
