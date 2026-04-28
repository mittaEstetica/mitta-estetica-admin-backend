import pg from 'pg'
import crypto from 'crypto'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
})

const FACIAL_SERVICES = [
  'Limpeza de Pele',
  'Peeling Químico',
  'Microagulhamento',
  'Microcorrentes',
  'Radiofrequência Facial',
  'Massagem Craniana',
  'Drenagem Facial (Pós-operatória)',
  'Método Mitta',
]

const CORPORAL_SERVICES = [
  'Ultrassom/US (Gordura e Celulite)',
  'Corrente Russa (Diástase, Tonificação, Metabolização)',
  'Terapia Combinada (US + Corrente Russa)',
  'Radiofrequência (Celulite e Flacidez)',
  'Criolipólise',
  'Massagem Relaxante',
  'Massagem Terapêutica',
  'Massagem com Pedras Quentes',
  'Massagem com Velas',
  'Drenagem Linfática',
  'Drenagem + Modeladora Local',
  'Método Mitta',
]

async function seed() {
  console.log('Seeding services...')
  const now = new Date().toISOString()
  
  try {
    for (const name of FACIAL_SERVICES) {
      await pool.query(
        'INSERT INTO services (id, name, category, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [crypto.randomUUID(), name, 'facial', now]
      )
    }
    for (const name of CORPORAL_SERVICES) {
      await pool.query(
        'INSERT INTO services (id, name, category, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [crypto.randomUUID(), name, 'corporal', now]
      )
    }
    console.log('Services seeded successfully!')
  } catch (error) {
    console.error('Error seeding services:', error)
  } finally {
    await pool.end()
  }
}

seed()
