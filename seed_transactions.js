import 'dotenv/config'
import crypto from 'crypto'
import db from './src/database.js'

async function seed() {
  console.log('Criando tabela se não existir...')
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount NUMERIC DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run()

  console.log('Limpando transações antigas (opcional)...')
  // await db.prepare('DELETE FROM transactions').run()

  const data = [
    // JANEIRO 2026
    { date: '2026-01-01', type: 'entrada', amount: 100, description: 'Avulsa Denise' },
    { date: '2026-01-01', type: 'entrada', amount: 135, description: 'Limp. Ilsa' },
    { date: '2026-01-01', type: 'entrada', amount: 100, description: 'Avulsa Leticia' },
    { date: '2026-01-01', type: 'entrada', amount: 200, description: 'Avulsa Denise' },
    { date: '2026-01-01', type: 'entrada', amount: 255, description: '3 Carlos' },
    { date: '2026-01-01', type: 'entrada', amount: 480, description: '5 Marina' },
    { date: '2026-01-01', type: 'entrada', amount: 170, description: '2 Viviane' },
    { date: '2026-01-01', type: 'entrada', amount: 120, description: 'Avulsa Marthi' },
    { date: '2026-01-01', type: 'saida', amount: 1564.31, description: 'ALUGUEL MÊS' },
    { date: '2026-01-01', type: 'saida', amount: 172.10, description: 'MEI' },
    { date: '2026-01-01', type: 'saida', amount: 164.53, description: 'LUZ' },
    { date: '2026-01-01', type: 'saida', amount: 166.96, description: 'CREDPAGO' },
    { date: '2026-01-01', type: 'saida', amount: 84.90, description: 'INTERNET' },
    { date: '2026-01-01', type: 'saida', amount: 107.30, description: 'MACA (1/4)' },
    { date: '2026-01-01', type: 'saida', amount: 23.92, description: 'Bolachas' },
    { date: '2026-01-01', type: 'saida', amount: 6.22, description: 'Uber' },
    { date: '2026-01-01', type: 'saida', amount: 10.10, description: 'Bacon (video)' },

    // FEVEREIRO 2026
    { date: '2026-02-01', type: 'entrada', amount: 120, description: 'RF Ilsa' },
    { date: '2026-02-01', type: 'entrada', amount: 85, description: 'Avulsa Vivi' },
    { date: '2026-02-01', type: 'entrada', amount: 200, description: 'Avulsa Denise' },
    { date: '2026-02-01', type: 'entrada', amount: 118.33, description: 'Avulsa Emily' },
    { date: '2026-02-01', type: 'entrada', amount: 255, description: '3 Carlos' },
    { date: '2026-02-01', type: 'entrada', amount: 994, description: '12 Marcelo' },
    { date: '2026-02-01', type: 'entrada', amount: 450, description: '5 Ilsa' },
    { date: '2026-02-01', type: 'entrada', amount: 170, description: '% Taila' },
    { date: '2026-02-01', type: 'entrada', amount: 11.25, description: '% Fernanda' },
    { date: '2026-02-01', type: 'entrada', amount: 90, description: 'Avulsa Sol' },
    { date: '2026-02-01', type: 'saida', amount: 1530.48, description: 'ALUGUEL MÊS' },
    // { date: '2026-02-01', type: 'saida', amount: 0, description: 'MEI (X)' }, // Ignorando o X
    { date: '2026-02-01', type: 'saida', amount: 156.97, description: 'LUZ' },
    { date: '2026-02-01', type: 'saida', amount: 166.96, description: 'CREDPAGO' },
    { date: '2026-02-01', type: 'saida', amount: 84.90, description: 'INTERNET' },
    { date: '2026-02-01', type: 'saida', amount: 107.30, description: 'MACA (2/4)' },
    { date: '2026-02-01', type: 'saida', amount: 119.80, description: '2 Jalecos' },
    { date: '2026-02-01', type: 'saida', amount: 450, description: 'Revisão Ar' },
    { date: '2026-02-01', type: 'saida', amount: 38.49, description: 'Anúncio' },

    // MARÇO 2026
    { date: '2026-03-01', type: 'entrada', amount: 120, description: 'Avulsa Giliane' },
    { date: '2026-03-01', type: 'entrada', amount: 120, description: 'Limp. Camila Said' },
    { date: '2026-03-01', type: 'entrada', amount: 480, description: 'Evento Mulher' },
    { date: '2026-03-01', type: 'entrada', amount: 2866.35, description: 'Valores no cartão' },
    { date: '2026-03-01', type: 'entrada', amount: 200, description: '2 Susana' },
    { date: '2026-03-01', type: 'entrada', amount: 120, description: 'Limp. Mylene' },
    { date: '2026-03-01', type: 'entrada', amount: 240, description: '2 Limp. Daniella' },
    { date: '2026-03-01', type: 'entrada', amount: 120, description: 'Limp. Tutu' },
    { date: '2026-03-01', type: 'entrada', amount: 120, description: 'Limp. Mel' },
    { date: '2026-03-01', type: 'entrada', amount: 80, description: 'Craniana Julia' },
    { date: '2026-03-01', type: 'entrada', amount: 207, description: 'Pacote Leticia' },
    { date: '2026-03-01', type: 'entrada', amount: 395, description: 'Semana Mulher' },
    { date: '2026-03-01', type: 'entrada', amount: 300, description: 'Denise' },
    { date: '2026-03-01', type: 'saida', amount: 225, description: '% Taila' },
    { date: '2026-03-01', type: 'saida', amount: 86.05, description: 'MEI' },
    { date: '2026-03-01', type: 'saida', amount: 86.05, description: 'MEI Taila' },
    { date: '2026-03-01', type: 'saida', amount: 166.96, description: 'CREDPAGO' },
    { date: '2026-03-01', type: 'saida', amount: 86.68, description: 'INTERNET' },
    { date: '2026-03-01', type: 'saida', amount: 40.75, description: 'Saída sem descrição' },

    // ABRIL 2026
    { date: '2026-04-01', type: 'entrada', amount: 120, description: 'Avulsa Mylene' },
    { date: '2026-04-01', type: 'entrada', amount: 10, description: 'Avulsa Bruna' },
    { date: '2026-04-01', type: 'entrada', amount: 470.65, description: '5 Mari' },
    { date: '2026-04-01', type: 'entrada', amount: 1077.79, description: '10 Marcelo' },
    { date: '2026-04-01', type: 'entrada', amount: 100, description: 'Avulsa Denise' },
    { date: '2026-04-01', type: 'entrada', amount: 45, description: 'Avulsa Jordana' },
    { date: '2026-04-01', type: 'entrada', amount: 1085.42, description: 'Bruna Crio + limpeza' },
    { date: '2026-04-01', type: 'entrada', amount: 126.03, description: 'Limpeza Raquel' },
    { date: '2026-04-01', type: 'entrada', amount: 400, description: 'Camila (pegou o dinheiro)' },
    { date: '2026-04-01', type: 'entrada', amount: 500, description: '5 Leticia Plettes' },
    { date: '2026-04-01', type: 'entrada', amount: 130, description: 'Avulsa Cris (Limpeza)' },
    { date: '2026-04-01', type: 'entrada', amount: 255, description: '3 Carlos' },
    { date: '2026-04-01', type: 'saida', amount: 1625.63, description: 'ALUGUEL' },
    { date: '2026-04-01', type: 'saida', amount: 84.90, description: 'INTERNET' },
    { date: '2026-04-01', type: 'saida', amount: 211.63, description: 'LUZ' },
    { date: '2026-04-01', type: 'saida', amount: 86.94, description: 'PRODUTOS (1/6)' },
    { date: '2026-04-01', type: 'saida', amount: 29, description: 'Mascara Desid.' },
    { date: '2026-04-01', type: 'saida', amount: 350, description: 'Milena' },
    { date: '2026-04-01', type: 'saida', amount: 33.75, description: 'Pomada' },
    { date: '2026-04-01', type: 'saida', amount: 109.70, description: 'Shoppe' },
    { date: '2026-04-01', type: 'saida', amount: 321.89, description: '% Taila' },
    { date: '2026-04-01', type: 'saida', amount: 787.30, description: 'Fatura' },
    { date: '2026-04-01', type: 'saida', amount: 88.78, description: 'Anúncio Facebook' },
    { date: '2026-04-01', type: 'saida', amount: 27.87, description: 'Pincel Aplicador' },
    { date: '2026-04-01', type: 'saida', amount: 40.00, description: 'Anúncio Facebook' },
    { date: '2026-04-01', type: 'saida', amount: 73.05, description: 'Anúncio Facebook' },
    { date: '2026-04-01', type: 'saida', amount: 276.46, description: 'Descartáveis' },
    { date: '2026-04-01', type: 'saida', amount: 148.57, description: 'Descartáveis' },
    { date: '2026-04-01', type: 'saida', amount: 200.00, description: 'Anúncio Facebook' },
  ]

  let count = 0
  for (const item of data) {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    await db.prepare(`
      INSERT INTO transactions (id, type, amount, description, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, item.type, item.amount, item.description, item.date, createdAt)
    count++
  }

  console.log(`Sucesso! ${count} transações inseridas.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
