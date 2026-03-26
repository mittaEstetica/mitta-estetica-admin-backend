import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    patientId: row.patient_id,
    photo: row.photo,
    procedureName: row.procedure_name,
    date: row.date,
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

router.get('/:patientId', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM patient_photos WHERE patient_id = ? ORDER BY date DESC').all(req.params.patientId)
  res.json(rows.map(toJSON))
})

router.post('/', async (req, res) => {
  const { patientId, photo, procedureName, date, notes } = req.body
  if (!patientId || !photo) {
    return res.status(400).json({ error: 'Paciente e foto são obrigatórios' })
  }
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.prepare(`
    INSERT INTO patient_photos (id, patient_id, photo, procedure_name, date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, photo, procedureName || '', date || '', notes || '', createdAt)

  res.status(201).json({ id, patientId, photo, procedureName: procedureName || '', date: date || '', notes: notes || '', createdAt })
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM patient_photos WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Foto não encontrada' })
  res.json({ success: true })
})

export default router
