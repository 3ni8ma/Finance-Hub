import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getAllStocks, getMovers, getIndices } from '../services/marketService'

const router = Router()

// GET /api/market/all
router.get('/all', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getAllStocks()
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/market/movers
router.get('/movers', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getMovers()
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/market/indices
router.get('/indices', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getIndices()
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as marketRouter }
