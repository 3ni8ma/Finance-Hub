import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getQuotes, getHistory, searchStocks } from '../services/marketService'

const router = Router()

// GET /api/stocks/quote?symbols=AAPL,TSLA
router.get('/quote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const symbols = String(req.query.symbols ?? '').split(',').filter(Boolean)
    if (!symbols.length) return res.status(400).json({ error: 'symbols param required' })
    const data = await getQuotes(symbols)
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/stocks/history?symbol=AAPL&range=1Y
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const symbol = String(req.query.symbol ?? '')
    const range = String(req.query.range ?? '3M')
    if (!symbol) return res.status(400).json({ error: 'symbol param required' })
    const data = await getHistory(symbol, range)
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/stocks/search?q=apple
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? '')
    if (q.length < 1) return res.json([])
    const data = await searchStocks(q)
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
})

export { router as stocksRouter }
