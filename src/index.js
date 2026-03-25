import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import patientsRouter from './routes/patients.js'
import packagesRouter from './routes/packages.js'
import stockItemsRouter from './routes/stockItems.js'
import stockMovementsRouter from './routes/stockMovements.js'
import appointmentsRouter from './routes/appointments.js'
import collaboratorsRouter from './routes/collaborators.js'
import commissionsRouter from './routes/commissions.js'
import usersRouter from './routes/users.js'
import whatsappRouter from './routes/whatsapp.js'
import { requireAuth } from './middleware/auth.js'
import { connectWhatsApp } from './whatsapp.js'
import { startCron } from './cron.js'

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Public auth routes (no token required)
app.use('/api/auth', authRouter)

// All other routes require authentication
app.use('/api', requireAuth)

app.use('/api/patients', patientsRouter)
app.use('/api/collaborators', collaboratorsRouter)
app.use('/api/commissions', commissionsRouter)
app.use('/api/packages', packagesRouter)
app.use('/api/stock-items', stockItemsRouter)
app.use('/api/stock-movements', stockMovementsRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/users', usersRouter)
app.use('/api/whatsapp', whatsappRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)

  connectWhatsApp().catch((err) => {
    console.log(`[WhatsApp] Erro ao iniciar: ${err.message}`)
  })

  startCron().catch((err) => {
    console.log(`[Cron] Erro ao iniciar: ${err.message}`)
  })
})
