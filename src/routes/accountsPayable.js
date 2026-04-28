import { Router } from 'express'
import db from '../database.js'

const router = Router()

// GET /api/accounts-payable
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all()
    // map to include paid flag (already present in DB)
    const result = rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      date: row.date,
      createdAt: row.created_at,
      paid: row.paid === 1 || row.paid === true,
      receiptUrl: row.receipt_url,
    }))
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts payable', details: error.message })
  }
})

export default router
