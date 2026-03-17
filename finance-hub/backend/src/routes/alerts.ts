import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/alerts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(alerts)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/alerts
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ticker, condition, targetPrice } = req.body
    if (!ticker || !condition || !targetPrice) {
      return res.status(400).json({ error: 'ticker, condition, targetPrice required' })
    }
    if (!['above', 'below'].includes(condition)) {
      return res.status(400).json({ error: 'condition must be "above" or "below"' })
    }
    const alert = await prisma.priceAlert.create({
      data: { userId: req.userId!, ticker: ticker.toUpperCase(), condition, targetPrice: +targetPrice },
    })
    return res.status(201).json(alert)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// DELETE /api/alerts/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.priceAlert.deleteMany({ where: { id: req.params.id, userId: req.userId! } })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as alertsRouter }
