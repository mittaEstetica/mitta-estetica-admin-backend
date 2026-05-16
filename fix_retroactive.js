import { Pool } from 'pg'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find all appointments without a package
    const { rows: appointments } = await client.query('SELECT * FROM appointments WHERE package_id IS NULL')
    console.log(`Encontrados ${appointments.length} agendamentos sem pacote.`)

    for (const appt of appointments) {
      const pkgId = crypto.randomUUID()
      const now = new Date().toISOString()
      const isCompleted = appt.status === 'completed'
      
      const sessionValue = 0

      console.log(`Criando pacote para agendamento ${appt.id} (${appt.service}) - status: ${appt.status}`)

      await client.query(`
        INSERT INTO packages (id, patient_id, collaborator_id, name, services, total_sessions, completed_sessions, total_value, session_value, paid_value, status, commission_percent, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        pkgId,
        appt.patient_id,
        appt.collaborator_id,
        `Avulso - ${appt.service}`,
        JSON.stringify([appt.service]),
        1,
        isCompleted ? 1 : 0,
        sessionValue,
        sessionValue,
        0,
        isCompleted ? 'completed' : 'active',
        appt.commission_percent,
        appt.created_at || now
      ])

      await client.query('UPDATE appointments SET package_id = $1 WHERE id = $2', [pkgId, appt.id])

      if (isCompleted && appt.collaborator_id) {
        const collabRes = await client.query('SELECT commission_percent FROM collaborators WHERE id = $1', [appt.collaborator_id])
        const collab = collabRes.rows[0]
        
        let pct = 0
        if (appt.commission_percent !== null) pct = Number(appt.commission_percent)
        else if (collab && collab.commission_percent !== null) pct = Number(collab.commission_percent)
        
        const comId = crypto.randomUUID()
        console.log(`   Criando comissao para agendamento ${appt.id} com ${pct}% de R$ 0.00`)
        await client.query(`
          INSERT INTO commissions (id, collaborator_id, package_id, appointment_id, session_value, commission_percent, collaborator_amount, clinic_amount, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          comId,
          appt.collaborator_id,
          pkgId,
          appt.id,
          sessionValue,
          pct,
          0,
          0,
          appt.created_at || now
        ])
      }
    }

    await client.query('COMMIT')
    console.log('Finalizado com sucesso!')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Erro:', e)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
