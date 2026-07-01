/**
 * Auth-only dev server for the marketing site (port 5000).
 * Uses the same auth module as the full v2 API without loading optional routes.
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './core/db.js'
import { authRouter } from './modules/auth/auth.routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://app.qworship.com',
  'https://www.app.qworship.com',
  'https://qworship.com',
  'https://www.qworship.com',
  'https://new-website.vianneycm.workers.dev',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || true)
      } else {
        callback(null, false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/user', authRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const startServer = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`[Q-worship] Auth dev server running on port ${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start auth dev server:', error)
  process.exit(1)
})
