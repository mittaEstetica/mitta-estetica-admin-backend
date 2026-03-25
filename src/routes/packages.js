import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    patientId: row.patient_id,
    collaboratorId: row.collaborator_id || undefined,
    name: row.name,
    services: JSON.parse(row.services),
    totalSessions: row.total_sessions,
    completedSessions: row.completed_sessions,
    totalValue: row.total_value,
    sessionValue: row.session_value || 0,
    paidValue: row.paid_value,
    status: row.status,
    createdAt: row.created_at,
  }
}

router.get('/', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Package not found' })
  res.json(toJSON(row))
})

router.post('/', async (req, res) => {
  const { patientId, collaboratorId, name, services, totalSessions, completedSessions, totalValue, sessionValue, paidValue, status } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const sv = sessionValue || (totalSessions > 0 ? (totalValue || 0) / (totalSessions || 1) : 0)

  await db.prepare(`
    INSERT INTO packages (id, patient_id, collaborator_id, name, services, total_sessions, completed_sessions, total_value, session_value, paid_value, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, collaboratorId || null, name, JSON.stringify(services || []), totalSessions || 1, completedSessions || 0, totalValue || 0, sv, paidValue || 0, status || 'active', createdAt)

  res.status(201).json({
    id, patientId, collaboratorId: collaboratorId || undefined, name,
    services: services || [], totalSessions: totalSessions || 1,
    completedSessions: completedSessions || 0, totalValue: totalValue || 0,
    sessionValue: sv, paidValue: paidValue || 0,
    status: status || 'active', createdAt,
  })
})

router.put('/:id', async (req, res) => {
  const { patientId, collaboratorId, name, services, totalSessions, completedSessions, totalValue, sessionValue, paidValue, status } = req.body
  const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Package not found' })

  const sv = sessionValue || (totalSessions > 0 ? (totalValue || 0) / (totalSessions || 1) : 0)

  await db.prepare(`
    UPDATE packages SET patient_id = ?, collaborator_id = ?, name = ?, services = ?, total_sessions = ?, completed_sessions = ?, total_value = ?, session_value = ?, paid_value = ?, status = ?
    WHERE id = ?
  `).run(patientId, collaboratorId || null, name, JSON.stringify(services || []), totalSessions, completedSessions, totalValue, sv, paidValue, status, req.params.id)

  const updated = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Package not found' })
  res.json({ success: true })
})

export default router
