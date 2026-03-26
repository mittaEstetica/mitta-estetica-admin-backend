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
import patientPhotosRouter from './routes/patientPhotos.js'
import leadsRouter from './routes/leads.js'
import quotesRouter from './routes/quotes.js'
import { requireAuth } from './middleware/auth.js'
import { connectWhatsApp } from './whatsapp.js'
import { startCron } from './cron.js'

const app = express()
const PORT = process.env.PORT || 3333

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5174']

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRouter)

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
app.use('/api/patient-photos', patientPhotosRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/quotes', quotesRouter)

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
