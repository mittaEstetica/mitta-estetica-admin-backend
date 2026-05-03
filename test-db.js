import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function test() {
  const { rows } = await pool.query('SELECT id, status FROM appointments ORDER BY created_at DESC LIMIT 5');
  console.log("Appointments in DB:");
  console.log(rows);
  process.exit(0);
}
test();
