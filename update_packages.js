import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

async function run() {
  const { default: db } = await import('./src/database.js')

  const packages = await db.prepare('SELECT * FROM packages WHERE total_value = 1 OR paid_value = 1 OR session_value = 1').all()
  console.log(`Found ${packages.length} packages with value 1`)
  
  const res = await db.prepare(`
    UPDATE packages 
    SET total_value = CASE WHEN total_value = 1 THEN 0 ELSE total_value END,
        paid_value = CASE WHEN paid_value = 1 THEN 0 ELSE paid_value END,
        session_value = CASE WHEN session_value = 1 THEN 0 ELSE session_value END
    WHERE total_value = 1 OR paid_value = 1 OR session_value = 1
  `).run()
  
  console.log(`Updated ${res.changes} packages`)
  await db.end()
}

run().catch(console.error)
