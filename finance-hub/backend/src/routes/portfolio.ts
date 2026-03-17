import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getQuotes } from '../services/marketService'

const router = Router()
const prisma = new PrismaClient()

// GET /api/portfolio — holdings with live prices
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const holdings = await prisma.holding.findMany({ where: { userId: req.userId! } })
    if (!holdings.length) return res.json([])

    const tickers = [...new Set(holdings.map((h) => h.ticker))]
    const quotes = await getQuotes(tickers)
    const priceMap: Record<string, { price: number; sector: string }> = {}
    quotes.forEach((q) => { priceMap[q.symbol] = { price: q.price, sector: q.sector } })

    const enriched = holdings.map((h) => {
      const q = priceMap[h.ticker]
      const currentPrice = q?.price ?? h.avgBuyPrice
      const currentValue = currentPrice * h.quantity
      const gainLoss = currentValue - h.avgBuyPrice * h.quantity
      const gainLossPct = ((currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
      return { ...h, currentPrice, currentValue, gainLoss, gainLossPct: +gainLossPct.toFixed(2), sector: q?.sector }
    })

    return res.json(enriched)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/portfolio/holding
router.post('/holding', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ticker, quantity, avgBuyPrice, purchaseDate } = req.body
    if (!ticker || !quantity || !avgBuyPrice) return res.status(400).json({ error: 'ticker, quantity, avgBuyPrice required' })
    const holding = await prisma.holding.create({
      data: { userId: req.userId!, ticker: ticker.toUpperCase(), quantity: +quantity, avgBuyPrice: +avgBuyPrice, purchaseDate: new Date(purchaseDate) },
    })
    return res.status(201).json(holding)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// DELETE /api/portfolio/holding/:id
router.delete('/holding/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.holding.deleteMany({ where: { id: req.params.id, userId: req.userId! } })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/portfolio/snapshots
router.get('/snapshots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const snaps = await prisma.portfolioSnapshot.findMany({
      where: { userId: req.userId! },
      orderBy: { recordedAt: 'asc' },
      take: 90,
    })
    return res.json(snaps.map((s) => ({ date: s.recordedAt.toISOString().split('T')[0], totalValue: s.totalValue })))
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/portfolio/watchlist
router.post('/watchlist', authenticate, async (req: AuthRequest, res: Response) => {
  // Watchlist is just a holding with 0 quantity for now
  try {
    const { ticker } = req.body
    return res.json({ ok: true, ticker })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as portfolioRouter }
