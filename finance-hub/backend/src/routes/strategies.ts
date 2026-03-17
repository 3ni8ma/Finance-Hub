import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getHistory } from '../services/marketService'
import { runBacktest } from '../services/backtestEngine'

const router = Router()
const prisma = new PrismaClient()

// POST /api/strategies/backtest
router.post('/backtest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strategy, ticker, dateFrom, dateTo, params = {} } = req.body
    if (!strategy || !ticker) return res.status(400).json({ error: 'strategy and ticker required' })

    const range = '5Y' // Fetch max data, then filter
    const all = await getHistory(ticker.toUpperCase(), range) as { date: string; open: number; high: number; low: number; close: number; volume: number }[]
    const filtered = all.filter((d) => {
      if (dateFrom && d.date < dateFrom) return false
      if (dateTo && d.date > dateTo) return false
      return true
    })

    if (filtered.length < 50) {
      return res.status(400).json({ error: 'Not enough data for backtest. Try a longer date range.' })
    }

    const result = runBacktest(filtered, strategy, params)
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/strategies/save
router.post('/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strategyName, parameters } = req.body
    const saved = await prisma.savedStrategy.create({
      data: { userId: req.userId!, strategyName, parameters },
    })
    return res.status(201).json(saved)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/strategies/saved
router.get('/saved', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const saved = await prisma.savedStrategy.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(saved)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// DELETE /api/strategies/saved/:id
router.delete('/saved/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.savedStrategy.deleteMany({ where: { id: req.params.id, userId: req.userId! } })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as strategiesRouter }
