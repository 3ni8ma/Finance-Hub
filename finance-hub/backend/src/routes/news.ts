import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getNews } from '../services/newsService'

const router = Router()

// GET /api/news?limit=20
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(50, Number(req.query.limit ?? 20))
    const data = await getNews(limit)
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as newsRouter }
