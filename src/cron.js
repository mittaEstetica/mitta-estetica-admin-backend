import cron from 'node-cron'
import db from './database.js'
import { sendMessage, getStatus } from './whatsapp.js'

let cronJob = null

function getTemplate() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_template'").get()
  return row?.value || `Oii, {nome}, tudo bem?\nPodemos confirmar seu horário de atendimento, amanhã às {horario}?\n\nTemos tolerância de 10 minutos para atrasos. Caso não possa comparecer, pedimos que nos avise com antecedência para reagendarmos.\n\nNosso endereço: Rua Açores, nº 68, sala 305.`
}

function getCronHour() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_cron_hour'").get()
  return parseInt(row?.value || '8', 10)
}

async function sendDailyReminders() {
  const { status } = getStatus()
  if (status !== 'connected') {
    console.log('[Cron] WhatsApp não conectado, pulando lembretes.')
    return
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const dateFormatted = new Date(tomorrowStr + 'T00:00:00').toLocaleDateString('pt-BR')

  const appointments = db.prepare(`
    SELECT a.*, p.name as patient_name, p.phone as patient_phone
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.date = ? AND a.status = 'scheduled'
    ORDER BY a.time ASC
  `).all(tomorrowStr)

  const toSend = appointments.filter((a) => a.patient_phone && a.patient_phone.trim() !== '')

  if (toSend.length === 0) {
    console.log(`[Cron] Nenhum lembrete para enviar (${tomorrowStr}).`)
    return
  }

  const template = getTemplate()
  console.log(`[Cron] Enviando ${toSend.length} lembrete(s) para ${tomorrowStr}...`)

  let sent = 0
  let failed = 0
  for (const appt of toSend) {
    const message = template
      .replace(/{nome}/g, appt.patient_name.split(' ')[0])
      .replace(/{nome_completo}/g, appt.patient_name)
      .replace(/{data}/g, dateFormatted)
      .replace(/{horario}/g, appt.time)
      .replace(/{servico}/g, appt.service)

    try {
      await sendMessage(appt.patient_phone, message)
      sent++
      console.log(`[Cron] ✓ Lembrete enviado para ${appt.patient_name} (${appt.patient_phone})`)
    } catch (err) {
      failed++
      console.log(`[Cron] ✗ Falha ao enviar para ${appt.patient_name}: ${err.message}`)
    }

    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`[Cron] Concluído: ${sent} enviado(s), ${failed} falha(s).`)
}

function startCron() {
  if (cronJob) cronJob.stop()

  const hour = getCronHour()
  const expression = `0 ${hour} * * *`

  cronJob = cron.schedule(expression, sendDailyReminders, {
    timezone: 'America/Sao_Paulo',
  })

  console.log(`[Cron] Lembretes agendados para ${hour}:00 (America/Sao_Paulo)`)
}

export { startCron, sendDailyReminders }
