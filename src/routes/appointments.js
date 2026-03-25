import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    patientId: row.patient_id,
    packageId: row.package_id || undefined,
    collaboratorId: row.collaborator_id || undefined,
    service: row.service,
    date: row.date,
    time: row.time,
    status: row.status,
    stockUsed: JSON.parse(row.stock_used),
    notes: row.notes,
    createdAt: row.created_at,
  }
}

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Appointment not found' })
  res.json(toJSON(row))
})

router.post('/', (req, res) => {
  const { patientId, packageId, collaboratorId, service, date, time, status, stockUsed, notes } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO appointments (id, patient_id, package_id, collaborator_id, service, date, time, status, stock_used, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId, packageId || null, collaboratorId || null, service, date, time || '', status || 'scheduled', JSON.stringify(stockUsed || []), notes || '', createdAt)

  res.status(201).json({
    id, patientId, packageId: packageId || undefined,
    collaboratorId: collaboratorId || undefined, service, date,
    time: time || '', status: status || 'scheduled',
    stockUsed: stockUsed || [], notes: notes || '', createdAt,
  })
})

router.put('/:id', (req, res) => {
  const { patientId, packageId, collaboratorId, service, date, time, status, stockUsed, notes } = req.body
  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  db.prepare(`
    UPDATE appointments SET patient_id = ?, package_id = ?, collaborator_id = ?, service = ?, date = ?, time = ?, status = ?, stock_used = ?, notes = ?
    WHERE id = ?
  `).run(patientId, packageId || null, collaboratorId || null, service, date, time || '', status, JSON.stringify(stockUsed || []), notes || '', req.params.id)

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' })
  res.json({ success: true })
})

router.post('/:id/complete', (req, res) => {
  const apptRow = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!apptRow) return res.status(404).json({ error: 'Appointment not found' })

  const appt = toJSON(apptRow)

  const completeTransaction = db.transaction(() => {
    db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appt.id)

    for (const usage of appt.stockUsed) {
      const moveId = crypto.randomUUID()
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO stock_movements (id, stock_item_id, type, quantity, reason, appointment_id, created_at)
        VALUES (?, ?, 'out', ?, ?, ?, ?)
      `).run(moveId, usage.stockItemId, usage.quantity, `Atendimento: ${appt.service}`, appt.id, now)

      const item = db.prepare('SELECT quantity FROM stock_items WHERE id = ?').get(usage.stockItemId)
      if (item) {
        const newQty = Math.max(0, item.quantity - usage.quantity)
        db.prepare('UPDATE stock_items SET quantity = ? WHERE id = ?').run(newQty, usage.stockItemId)
      }
    }

    if (appt.packageId) {
      const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(appt.packageId)
      if (pkg) {
        const newCompleted = pkg.completed_sessions + 1
        const newStatus = newCompleted >= pkg.total_sessions ? 'completed' : pkg.status
        db.prepare('UPDATE packages SET completed_sessions = ?, status = ? WHERE id = ?')
          .run(newCompleted, newStatus, pkg.id)

        // Use appointment collaborator, or fall back to package collaborator
        const collabId = apptRow.collaborator_id || pkg.collaborator_id
        if (collabId) {
          const collab = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(collabId)
          if (collab) {
            const sessionValue = pkg.session_value || (pkg.total_sessions > 0 ? pkg.total_value / pkg.total_sessions : 0)
            const percent = collab.commission_percent
            const collaboratorAmount = sessionValue * percent / 100
            const clinicAmount = sessionValue - collaboratorAmount
            const comId = crypto.randomUUID()
            const comNow = new Date().toISOString()

            db.prepare(`
              INSERT INTO commissions (id, collaborator_id, package_id, appointment_id, session_value, commission_percent, collaborator_amount, clinic_amount, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(comId, collabId, pkg.id, appt.id, sessionValue, percent, collaboratorAmount, clinicAmount, comNow)
          }
        }
      }
    }
  })

  completeTransaction()

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.post('/:id/miss', (req, res) => {
  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  db.prepare("UPDATE appointments SET status = 'missed' WHERE id = ?").run(req.params.id)

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

export default router
