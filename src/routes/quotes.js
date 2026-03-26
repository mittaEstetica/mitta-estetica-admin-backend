import { Router } from 'express'
import crypto from 'crypto'
import db from '../database.js'

let transporter = null
if (process.env.SMTP_HOST) {
  try {
    const { default: nodemailer } = await import('nodemailer')
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch (e) {
    console.log('[Email] Nodemailer não disponível:', e.message)
  }
}

const router = Router()

function toJSON(row) {
  if (!row) return null
  return {
    id: row.id,
    patientId: row.patient_id || null,
    leadId: row.lead_id || null,
    clientName: row.client_name,
    clientEmail: row.client_email || '',
    procedureName: row.procedure_name,
    sessions: row.sessions,
    totalValue: Number(row.total_value),
    paymentMethod: row.payment_method || '',
    status: row.status,
    sentAt: row.sent_at || null,
    notes: row.notes || '',
    createdAt: row.created_at,
  }
}

router.get('/', async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all()
  res.json(rows.map(toJSON))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Orçamento não encontrado' })
  res.json(toJSON(row))
})

router.post('/', async (req, res) => {
  const { patientId, leadId, clientName, clientEmail, procedureName, sessions, totalValue, paymentMethod, status, notes } = req.body
  if (!clientName || !procedureName) {
    return res.status(400).json({ error: 'Nome do cliente e procedimento são obrigatórios' })
  }
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.prepare(`
    INSERT INTO quotes (id, patient_id, lead_id, client_name, client_email, procedure_name, sessions, total_value, payment_method, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientId || null, leadId || null, clientName, clientEmail || '', procedureName, sessions || 1, totalValue || 0, paymentMethod || '', status || 'rascunho', notes || '', createdAt)

  res.status(201).json({
    id, patientId: patientId || null, leadId: leadId || null,
    clientName, clientEmail: clientEmail || '', procedureName,
    sessions: sessions || 1, totalValue: totalValue || 0,
    paymentMethod: paymentMethod || '', status: status || 'rascunho',
    sentAt: null, notes: notes || '', createdAt,
  })
})

router.put('/:id', async (req, res) => {
  const { patientId, leadId, clientName, clientEmail, procedureName, sessions, totalValue, paymentMethod, status, notes } = req.body
  const existing = await db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado' })

  await db.prepare(`
    UPDATE quotes SET patient_id = ?, lead_id = ?, client_name = ?, client_email = ?, procedure_name = ?, sessions = ?, total_value = ?, payment_method = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(patientId || null, leadId || null, clientName, clientEmail || '', procedureName, sessions, totalValue, paymentMethod || '', status, notes || '', req.params.id)

  const updated = await db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)
  res.json(toJSON(updated))
})

router.post('/:id/send', async (req, res) => {
  const row = await db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Orçamento não encontrado' })

  const quote = toJSON(row)
  if (!quote.clientEmail) {
    return res.status(400).json({ error: 'Cliente não possui e-mail cadastrado' })
  }
  if (!transporter) {
    return res.status(400).json({ error: 'SMTP não configurado. Adicione SMTP_HOST, SMTP_USER e SMTP_PASS nas variáveis de ambiente.' })
  }

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #cd9540, #dfb678); border-radius: 12px; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Mitta Estética</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Orçamento</p>
      </div>
      <p>Olá <strong>${quote.clientName}</strong>,</p>
      <p>Segue abaixo o orçamento solicitado:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f7f7f9;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Procedimento</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${quote.procedureName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Sessões</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${quote.sessions}</td>
        </tr>
        <tr style="background: #f7f7f9;">
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Valor Total</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-size: 18px; color: #cd9540; font-weight: bold;">${fmt.format(quote.totalValue)}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Forma de Pagamento</td>
          <td style="padding: 12px; border: 1px solid #e5e7eb;">${quote.paymentMethod || 'A combinar'}</td>
        </tr>
      </table>
      ${quote.notes ? `<p><strong>Observações:</strong> ${quote.notes}</p>` : ''}
      <p style="margin-top: 24px;">Ficamos à disposição para qualquer dúvida.</p>
      <p>Atenciosamente,<br><strong>Mitta Estética</strong></p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: quote.clientEmail,
      subject: `Orçamento - ${quote.procedureName} | Mitta Estética`,
      html,
    })

    const sentAt = new Date().toISOString()
    await db.prepare("UPDATE quotes SET status = 'enviado', sent_at = ? WHERE id = ?").run(sentAt, req.params.id)

    const updated = await db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id)
    res.json(toJSON(updated))
  } catch (err) {
    res.status(500).json({ error: `Erro ao enviar e-mail: ${err.message}` })
  }
})

router.delete('/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Orçamento não encontrado' })
  res.json({ success: true })
})

export default router
