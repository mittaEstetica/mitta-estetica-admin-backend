import { Router } from 'express'
import db from '../database.js'
import { getStatus, sendMessage, disconnect } from '../whatsapp.js'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
})

router.post('/disconnect', async (_req, res) => {
  try {
    await disconnect()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/send-test', async (req, res) => {
  const { phone, message } = req.body
  try {
    const result = await sendMessage(phone, message || 'Teste de mensagem - Mitta Estética')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/reminders/preview', async (req, res) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const appointments = await db.prepare(`
    SELECT a.*, p.name as patient_name, p.phone as patient_phone
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.date = ? AND a.status = 'scheduled'
    ORDER BY a.time ASC
  `).all(tomorrowStr)

  const reminders = appointments
    .filter((a) => a.patient_phone && a.patient_phone.trim() !== '')
    .map((a) => ({
      appointmentId: a.id,
      patientName: a.patient_name,
      patientPhone: a.patient_phone,
      service: a.service,
      date: a.date,
      time: a.time,
    }))

  const skipped = appointments
    .filter((a) => !a.patient_phone || a.patient_phone.trim() === '')
    .map((a) => ({
      appointmentId: a.id,
      patientName: a.patient_name,
      reason: 'Sem telefone cadastrado',
    }))

  res.json({ date: tomorrowStr, reminders, skipped, total: appointments.length })
})

router.post('/reminders/send', async (req, res) => {
  const { messageTemplate } = req.body
  const template = messageTemplate || `Oii, {nome}, tudo bem?\nPodemos confirmar seu horário de atendimento, amanhã às {horario}?\n\nTemos tolerância de 10 minutos para atrasos. Caso não possa comparecer, pedimos que nos avise com antecedência para reagendarmos.\n\nNosso endereço: Rua Açores, nº 68, sala 305.`

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const dateFormatted = new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('pt-BR')

  const appointments = await db.prepare(`
    SELECT a.*, p.name as patient_name, p.phone as patient_phone
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.date = ? AND a.status = 'scheduled'
    ORDER BY a.time ASC
  `).all(tomorrowStr)

  const toSend = appointments.filter((a) => a.patient_phone && a.patient_phone.trim() !== '')

  const results = []
  for (const appt of toSend) {
    const message = template
      .replace(/{nome}/g, appt.patient_name.split(' ')[0])
      .replace(/{nome_completo}/g, appt.patient_name)
      .replace(/{data}/g, dateFormatted)
      .replace(/{horario}/g, appt.time)
      .replace(/{servico}/g, appt.service)

    try {
      await sendMessage(appt.patient_phone, message)
      results.push({ patient: appt.patient_name, phone: appt.patient_phone, status: 'sent' })
      await new Promise((r) => setTimeout(r, 2000))
    } catch (err) {
      results.push({ patient: appt.patient_name, phone: appt.patient_phone, status: 'error', error: err.message })
    }
  }

  res.json({ date: tomorrowStr, results, sent: results.filter((r) => r.status === 'sent').length, failed: results.filter((r) => r.status === 'error').length })
})

router.get('/settings', async (_req, res) => {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_template'").get()
  const cronRow = await db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_cron_hour'").get()
  res.json({
    messageTemplate: row?.value || `Oii, {nome}, tudo bem?\nPodemos confirmar seu horário de atendimento, amanhã às {horario}?\n\nTemos tolerância de 10 minutos para atrasos. Caso não possa comparecer, pedimos que nos avise com antecedência para reagendarmos.\n\nNosso endereço: Rua Açores, nº 68, sala 305.`,
    cronHour: cronRow?.value || '8',
  })
})

router.put('/settings', async (req, res) => {
  const { messageTemplate, cronHour } = req.body
  if (messageTemplate !== undefined) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('whatsapp_template', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(messageTemplate)
  }
  if (cronHour !== undefined) {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('whatsapp_cron_hour', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value").run(String(cronHour))
  }
  res.json({ success: true })
})

export default router
