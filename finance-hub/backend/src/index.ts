import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import http from 'http'
import rateLimit from 'express-rate-limit'

import { setupWebSocket } from './websocket/server'
import { setupCronJobs } from './services/cronService'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './routes/auth'
import { stocksRouter } from './routes/stocks'
import { marketRouter } from './routes/market'
import { newsRouter } from './routes/news'
import { predictRouter } from './routes/predict'
import { strategiesRouter } from './routes/strategies'
import { portfolioRouter } from './routes/portfolio'
import { alertsRouter } from './routes/alerts'
import logger from './utils/logger'

const app = express()
const server = http.createServer(app)

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/stocks', stocksRouter)
app.use('/api/market', marketRouter)
app.use('/api/news', newsRouter)
app.use('/api/predict', predictRouter)
app.use('/api/strategies', strategiesRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/alerts', alertsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

// ── Error Handler ──────────────────────────────────────────────────────────────
app.use(errorHandler)

// ── WebSocket ──────────────────────────────────────────────────────────────────
setupWebSocket(server)

// ── Cron Jobs ──────────────────────────────────────────────────────────────────
setupCronJobs()

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => {
  logger.info(`🚀 Finance Hub backend running on port ${PORT}`)
})

export { server }
