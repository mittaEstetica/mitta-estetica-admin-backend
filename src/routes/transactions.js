import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    date: row.date,
    createdAt: row.created_at,
    paid: row.paid === 1 || row.paid === true,
    receiptUrl: row.receipt_url,
  }
}

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all()
    res.json(rows.map(toJSON))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message })
  }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  const { type, amount, description, date, paid, receiptUrl } = req.body
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  try {
    // Robust amount parsing
    let numAmount = 0
    if (typeof amount === 'number') {
      numAmount = amount
    } else if (typeof amount === 'string') {
      numAmount = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
    }

    const finalType = type || 'saida'
    const finalDescription = description || ''
    const finalDate = date || new Date().toISOString().split('T')[0]
    const finalPaid = !!paid

    await db.prepare(`
      INSERT INTO transactions (id, type, amount, description, date, created_at, paid, receipt_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, finalType, numAmount, finalDescription, finalDate, createdAt, finalPaid, receiptUrl || null)

    res.status(201).json({
      id, type: finalType, amount: numAmount, description: finalDescription, date: finalDate, createdAt, paid: finalPaid, receiptUrl: receiptUrl || null
    })
  } catch (error) {
    console.error('[Transactions] POST Error:', error)
    res.status(500).json({ error: 'Failed to create transaction', details: error.message })
  }
})

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  console.log('[Transactions] Received PUT for ID:', req.params.id)
  console.log('[Transactions] Body:', req.body)
  
  let { type, amount, description, date, paid, receiptUrl } = req.body
  
  try {
    const existing = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Transaction not found' })

    // Robust amount parsing
    let numAmount = 0
    if (typeof amount === 'number') {
      numAmount = amount
    } else if (typeof amount === 'string') {
      numAmount = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
    }

    // Ensure required fields
    const finalType = type || existing.type || 'saida'
    const finalDescription = description || existing.description || ''
    const finalDate = date || existing.date || new Date().toISOString().split('T')[0]
    const finalPaid = paid === undefined ? existing.paid : !!paid

    await db.prepare(`
      UPDATE transactions SET type = ?, amount = ?, description = ?, date = ?, paid = ?, receipt_url = ?
      WHERE id = ?
    `).run(finalType, numAmount, finalDescription, finalDate, finalPaid, receiptUrl || existing.receipt_url, req.params.id)

    const updated = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id)
    res.json(toJSON(updated))
  } catch (error) {
    console.error('[Transactions] PUT Error:', error)
    res.status(500).json({ error: 'Failed to update transaction', details: error.message })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message })
  }
})

export default router
