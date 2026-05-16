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

    const { rows: packages } = await client.query('SELECT * FROM packages WHERE completed_sessions > 0')
    console.log(`Verificando ${packages.length} pacotes com sessões concluídas...`)

    let totalGenerated = 0;

    for (const pkg of packages) {
      if (!pkg.collaborator_id) continue;

      const { rows: comRows } = await client.query('SELECT COUNT(*) as count FROM commissions WHERE package_id = $1', [pkg.id])
      const existingCommissions = parseInt(comRows[0].count)

      if (existingCommissions < pkg.completed_sessions) {
        const missingCount = pkg.completed_sessions - existingCommissions
        console.log(`Pacote ${pkg.name} (ID: ${pkg.id}) - Gerando ${missingCount} comissões faltantes...`)

        const collabRes = await client.query('SELECT commission_percent FROM collaborators WHERE id = $1', [pkg.collaborator_id])
        const collab = collabRes.rows[0]

        let pct = 0
        if (pkg.commission_percent !== null) pct = Number(pkg.commission_percent)
        else if (collab && collab.commission_percent !== null) pct = Number(collab.commission_percent)

        const sessionValue = Number(pkg.session_value || 0)
        const collaboratorAmount = sessionValue * pct / 100
        const clinicAmount = sessionValue - collaboratorAmount

        for (let i = 0; i < missingCount; i++) {
          const comId = crypto.randomUUID()
          const fakeAppointmentId = crypto.randomUUID() // To satisfy not-null constraint
          const now = new Date().toISOString()
          
          await client.query(`
            INSERT INTO commissions (id, collaborator_id, package_id, appointment_id, session_value, commission_percent, collaborator_amount, clinic_amount, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            comId,
            pkg.collaborator_id,
            pkg.id,
            fakeAppointmentId,
            sessionValue,
            pct,
            collaboratorAmount,
            clinicAmount,
            pkg.created_at || now
          ])
          totalGenerated++;
          console.log(`   -> R$ ${collaboratorAmount.toFixed(2)} para ${pkg.collaborator_id}`);
        }
      }
    }

    await client.query('COMMIT')
    console.log(`Finalizado com sucesso! ${totalGenerated} comissões geradas no total.`)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Erro:', e)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
