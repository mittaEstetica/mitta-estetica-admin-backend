import db from '../src/database.js'
import crypto from 'crypto'

async function seed() {
  const transactions = [
    { type: 'saida', amount: 1500, description: 'Aluguel Clínica', date: '2026-04-01', paid: true },
    { type: 'saida', amount: 250, description: 'Energia Elétrica', date: '2026-04-10', paid: true },
    { type: 'saida', amount: 80, description: 'Internet', date: '2026-04-15', paid: true },
    { type: 'saida', amount: 300, description: 'Produtos de Limpeza', date: '2026-04-20', paid: false },
    { type: 'saida', amount: 2000, description: 'Salários Colaboradoras', date: '2026-05-05', paid: false },
    { type: 'saida', amount: 450, description: 'Manutenção Equipamentos', date: '2026-05-15', paid: false },
  ]

  for (const t of transactions) {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    await db.prepare(`
      INSERT INTO transactions (id, type, amount, description, date, created_at, paid)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, t.type, t.amount, t.description, t.date, createdAt, t.paid ? 1 : 0)
  }

  console.log('Seed completed successfully!')
  process.exit(0)
}

seed().catch(console.error)
