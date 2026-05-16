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
    totalValue: Number(row.total_value) || 0,
    sessionValue: Number(row.session_value) || 0,
    paidValue: row.paid_value !== null ? Number(row.paid_value) : 0,
    status: row.status,
    commissionPercent: row.commission_percent,
    createdAt: row.created_at,
  }
}

router.get('/', async (req, res) => {
  let rows
  if (req.user?.role === 'collaborator' && req.user?.collaboratorId) {
    rows = await db.prepare('SELECT * FROM packages WHERE collaborator_id = ? ORDER BY created_at DESC').all(req.user.collaboratorId)
  } else {
    rows = await db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all()
  }

  const isAdmin = req.user?.role === 'admin' || req.user?.permissions?.includes('*')

  res.json(rows.map(row => {
    const pkg = toJSON(row)
    if (!isAdmin) {
      pkg.paidValue = 0
      pkg.totalValue = 0
      pkg.sessionValue = 0
    }
    return pkg
  }))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Package not found' })

  // Ensure collaborator can only see their own package
  if (req.user?.role === 'collaborator' && req.user?.collaboratorId && row.collaborator_id !== req.user.collaboratorId) {
    return res.status(403).json({ error: 'Acesso negado' })
  }

  const pkg = toJSON(row)
  const isAdmin = req.user?.role === 'admin' || req.user?.permissions?.includes('*')
  if (!isAdmin) {
    pkg.paidValue = 0
    pkg.totalValue = 0
    pkg.sessionValue = 0
  }
  res.json(pkg)
})

router.post('/', async (req, res) => {
  const { patientId, collaboratorId, name, services, totalSessions, completedSessions, totalValue, sessionValue, paidValue, commissionPercent, status } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const sv = sessionValue || (totalSessions > 0 ? (totalValue || 0) / (totalSessions || 1) : 0)

  await db.prepare(`
    INSERT INTO packages (id, patient_id, collaborator_id, name, services, total_sessions, completed_sessions, total_value, session_value, paid_value, commission_percent, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, collaboratorId || null, name, JSON.stringify(services || []), totalSessions || 1, completedSessions || 0, totalValue || 0, sv, paidValue || 0, commissionPercent !== undefined ? commissionPercent : null, status || 'active', createdAt)

  res.status(201).json({
    id, patientId, collaboratorId: collaboratorId || undefined, name,
    services: services || [], totalSessions: totalSessions || 1,
    completedSessions: completedSessions || 0, totalValue: totalValue || 0,
    sessionValue: sv, paidValue: paidValue || 0,
    commissionPercent: commissionPercent !== undefined ? commissionPercent : undefined,
    status: status || 'active', createdAt,
  })
})

router.put('/:id', async (req, res) => {
  const { patientId, collaboratorId, name, services, totalSessions, completedSessions, totalValue, sessionValue, paidValue, commissionPercent, status } = req.body
  const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Package not found' })

  const sv = sessionValue || (totalSessions > 0 ? (totalValue || 0) / (totalSessions || 1) : 0)

  await db.prepare(`
    UPDATE packages SET patient_id = ?, collaborator_id = ?, name = ?, services = ?, total_sessions = ?, completed_sessions = ?, total_value = ?, session_value = ?, paid_value = ?, commission_percent = ?, status = ?
    WHERE id = ?
  `).run(patientId ?? existing.patient_id, collaboratorId !== undefined ? (collaboratorId || null) : existing.collaborator_id, name ?? existing.name, services ? JSON.stringify(services) : existing.services, totalSessions ?? existing.total_sessions, completedSessions ?? existing.completed_sessions, totalValue ?? existing.total_value, sv, paidValue ?? existing.paid_value ?? 0, commissionPercent !== undefined ? commissionPercent : existing.commission_percent, status ?? existing.status, req.params.id)

  const updated = await db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Package not found' })
  res.json({ success: true })
})

export default router
