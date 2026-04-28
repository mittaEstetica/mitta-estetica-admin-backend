import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const projectRef = 'uctdgqyhphefpazmziwa'
const password = 'Jf%u!d&$4WgMknY' // From .env

const configs = [
  { host: 'db.uctdgqyhphefpazmziwa.supabase.co', user: 'postgres', port: 5432 },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', user: `postgres.${projectRef}`, port: 6543 },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', user: `postgres.${projectRef}`, port: 5432 },
]

async function test() {
  for (const config of configs) {
    console.log(`Testing ${config.host} with user ${config.user} on port ${config.port}...`)
    const pool = new Pool({
      user: config.user,
      password: password,
      host: config.host,
      port: config.port,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    try {
      const client = await pool.connect()
      console.log(`✅ Connected!`)
      client.release()
      await pool.end()
      return
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`)
    } finally {
      await pool.end()
    }
  }
}

test()
