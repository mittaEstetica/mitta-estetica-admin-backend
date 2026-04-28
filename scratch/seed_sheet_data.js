import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
})

const sheetData = [
  { name: 'Aluguel dia 05', values: { 2: 1530.48, 3: 1624.63, 4: 1625.63, 5: 1600, 6: 1600, 7: 1600, 8: 1600, 9: 1600, 10: 1600, 11: 1600, 12: 1600 }, paid: { 2: true, 3: true, 4: true } },
  { name: 'Mei 20/21', values: { 2: 86.05, 3: 86.05, 4: 86.05, 5: 86.05, 6: 86.05, 7: 86.05, 8: 86.05, 9: 86.05, 10: 86.05, 11: 86.05, 12: 86.05 }, paid: { 2: true, 3: true, 4: true } },
  { name: 'Luz 15', values: { 3: 164.00, 4: 211.63, 5: 200, 6: 200, 7: 200, 8: 200, 9: 200, 10: 200, 11: 200, 12: 200 }, paid: { 3: true, 4: true } },
  { name: 'Internet 15', values: { 3: 85.00, 4: 85.00, 5: 85, 6: 85, 7: 85, 8: 85, 9: 85, 10: 85, 11: 85, 12: 85 }, paid: { 3: true, 4: true } },
  { name: 'Taila', values: { 2: 225.00, 3: 502.96, 4: 321.89 }, paid: { 2: true, 3: true, 4: true } },
  { name: 'Taila (Extra)', values: { 3: 295.13 }, paid: { 3: true } },
  { name: 'Fatura', values: { 4: 531.84, 5: 787.00, 6: 120, 7: 120 }, paid: { 4: true, 5: true } },
  { name: 'Mei Taila', values: { 3: 86.05, 4: 86.05, 5: 86.05, 6: 86.05, 7: 86.05, 8: 86.05, 9: 86.05, 10: 86.05, 11: 86.05, 12: 86.05 }, paid: { 3: true, 4: true } },
]

async function seed() {
  try {
    // Clear existing saídas to avoid duplicates
    await pool.query("DELETE FROM transactions WHERE type = 'saida'")

    for (const item of sheetData) {
      for (const [month, value] of Object.entries(item.values)) {
        const isPaid = item.paid?.[month] || false
        const date = `2026-${month.padStart(2, '0')}-01`
        
        await pool.query(`
          INSERT INTO transactions (id, type, amount, description, date, created_at, paid)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          crypto.randomUUID(),
          'saida',
          value,
          item.name,
          date,
          new Date().toISOString(),
          isPaid
        ])
      }
    }

    console.log('Sheet data seeded successfully with correct paid status!')
  } catch (e) {
    console.error('Error seeding data:', e)
  } finally {
    await pool.end()
  }
}

seed()
