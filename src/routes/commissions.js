import { Router } from 'express'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    packageId: row.package_id,
    appointmentId: row.appointment_id,
    sessionValue: row.session_value,
    commissionPercent: row.commission_percent,
    collaboratorAmount: row.collaborator_amount,
    clinicAmount: row.clinic_amount,
    createdAt: row.created_at,
  }
}

router.get('/', (req, res) => {
  const { collaboratorId } = req.query
  let rows
  if (collaboratorId) {
    rows = db.prepare('SELECT * FROM commissions WHERE collaborator_id = ? ORDER BY created_at DESC').all(collaboratorId)
  } else {
    rows = db.prepare('SELECT * FROM commissions ORDER BY created_at DESC').all()
  }
  res.json(rows.map(toJSON))
})

export default router
