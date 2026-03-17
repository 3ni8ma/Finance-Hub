import axios from 'axios'
import { cacheGet, cacheSet } from '../utils/redis'
import logger from '../utils/logger'

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? 'demo'
const AV_BASE = 'https://www.alphavantage.co/query'

// ── Mock data for demo / when API key is missing ──────────────────────────────
const MOCK_STOCKS = [
  { symbol: 'AAPL',  name: 'Apple Inc.',            sector: 'Tech',       exchange: 'NASDAQ', price: 213.50, changePct:  0.84, pe: 33.2, eps: 6.43,  marketCap: 3200e9, dividendYield: 0.52, weekHigh52: 260.10, weekLow52: 164.08, beta: 1.29, analystRating: 'Buy',       volume: 55e6  },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',        sector: 'Tech',       exchange: 'NASDAQ', price: 388.50, changePct:  0.62, pe: 33.8, eps: 11.45, marketCap: 2890e9, dividendYield: 0.78, weekHigh52: 468.35, weekLow52: 344.79, beta: 0.92, analystRating: 'Strong Buy', volume: 20e6  },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',          sector: 'Tech',       exchange: 'NASDAQ', price: 168.20, changePct:  0.41, pe: 24.8, eps: 6.79,  marketCap: 2060e9, dividendYield: 0.52, weekHigh52: 208.70, weekLow52: 140.53, beta: 1.05, analystRating: 'Buy',       volume: 22e6  },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',        sector: 'Consumer',   exchange: 'NASDAQ', price: 196.30, changePct: -0.38, pe: 42.1, eps: 4.22,  marketCap: 2080e9, dividendYield: 0,    weekHigh52: 242.52, weekLow52: 151.61, beta: 1.17, analystRating: 'Buy',       volume: 33e6  },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',           sector: 'Tech',       exchange: 'NASDAQ', price: 116.78, changePct: -1.24, pe: 35.2, eps: 2.94,  marketCap: 2850e9, dividendYield: 0.03, weekHigh52: 153.13, weekLow52:  86.62, beta: 1.97, analystRating: 'Strong Buy', volume: 285e6 },
  { symbol: 'META',  name: 'Meta Platforms Inc.',    sector: 'Tech',       exchange: 'NASDAQ', price: 591.20, changePct:  1.12, pe: 27.4, eps: 21.62, marketCap: 1500e9, dividendYield: 0.35, weekHigh52: 740.91, weekLow52: 470.45, beta: 1.27, analystRating: 'Buy',       volume: 16e6  },
  { symbol: 'TSLA',  name: 'Tesla Inc.',             sector: 'Consumer',   exchange: 'NASDAQ', price: 238.80, changePct: -2.14, pe: 89.5, eps: 2.68,  marketCap: 765e9,  dividendYield: 0,    weekHigh52: 479.86, weekLow52: 138.80, beta: 2.30, analystRating: 'Hold',      volume: 110e6 },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',   sector: 'Finance',    exchange: 'NYSE',   price: 238.20, changePct:  0.31, pe: 13.1, eps: 18.22, marketCap: 680e9,  dividendYield: 2.10, weekHigh52: 280.00, weekLow52: 185.20, beta: 1.11, analystRating: 'Buy',       volume: 9e6   },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',      sector: 'Healthcare', exchange: 'NYSE',   price: 155.40, changePct: -0.22, pe: 21.4, eps: 7.26,  marketCap: 374e9,  dividendYield: 3.30, weekHigh52: 168.99, weekLow52: 143.13, beta: 0.55, analystRating: 'Hold',      volume: 7e6   },
  { symbol: 'XOM',   name: 'Exxon Mobil Corp.',      sector: 'Energy',     exchange: 'NYSE',   price: 107.80, changePct:  0.54, pe: 13.8, eps: 7.81,  marketCap: 434e9,  dividendYield: 3.71, weekHigh52: 126.34, weekLow52:  95.77, beta: 0.88, analystRating: 'Buy',       volume: 17e6  },
  { symbol: 'UNH',   name: 'UnitedHealth Group',     sector: 'Healthcare', exchange: 'NYSE',   price: 492.10, changePct: -0.18, pe: 20.6, eps: 23.86, marketCap: 453e9,  dividendYield: 1.63, weekHigh52: 630.73, weekLow52: 436.00, beta: 0.52, analystRating: 'Buy',       volume: 4e6   },
  { symbol: 'V',     name: 'Visa Inc.',              sector: 'Finance',    exchange: 'NYSE',   price: 332.10, changePct:  0.47, pe: 32.8, eps: 10.13, marketCap: 682e9,  dividendYield: 0.75, weekHigh52: 354.89, weekLow52: 252.70, beta: 0.94, analystRating: 'Strong Buy', volume: 6e6   },
  { symbol: 'BA',    name: 'Boeing Co.',             sector: 'Industrial', exchange: 'NYSE',   price: 171.20, changePct: -0.65, pe: 0,    eps: -5.20, marketCap: 131e9,  dividendYield: 0,    weekHigh52: 216.95, weekLow52: 137.03, beta: 1.45, analystRating: 'Hold',      volume: 8e6   },
  { symbol: 'WMT',   name: 'Walmart Inc.',           sector: 'Consumer',   exchange: 'NYSE',   price:  93.40, changePct:  0.22, pe: 38.1, eps: 2.45,  marketCap: 751e9,  dividendYield: 1.00, weekHigh52:  98.76, weekLow52:  59.30, beta: 0.48, analystRating: 'Buy',       volume: 14e6  },
  { symbol: 'PG',    name: 'Procter & Gamble',       sector: 'Consumer',   exchange: 'NYSE',   price: 162.80, changePct:  0.11, pe: 25.9, eps: 6.29,  marketCap: 383e9,  dividendYield: 2.49, weekHigh52: 180.36, weekLow52: 152.12, beta: 0.46, analystRating: 'Buy',       volume: 7e6   },
]

const MOCK_INDICES = [
  { name: 'S&P 500',  symbol: 'SPX', value: 5218.19, change: 12.43,  changePct: 0.24 },
  { name: 'NASDAQ',   symbol: 'NDX', value: 18268.50, change: 91.20,  changePct: 0.50 },
  { name: 'Dow Jones',symbol: 'DJI', value: 39131.53, change: -82.14, changePct: -0.21 },
  { name: 'Bitcoin',  symbol: 'BTC', value: 68420.00, change: 1240.0, changePct: 1.85 },
  { name: 'Gold',     symbol: 'GLD', value: 2328.40,  change: 8.60,   changePct: 0.37 },
]

// ── Noise helper for mock live prices ─────────────────────────────────────────
export function addNoise(price: number, spread = 0.005): number {
  return +(price * (1 + (Math.random() - 0.5) * spread)).toFixed(2)
}

// ── Fetch all market stocks (with cache) ──────────────────────────────────────
export async function getAllStocks() {
  const cached = await cacheGet<typeof MOCK_STOCKS>('market:all')
  if (cached) return cached

  // In production: fetch from Polygon or Alpha Vantage
  const data = MOCK_STOCKS.map((s) => ({
    ...s,
    price: addNoise(s.price, 0.02),
    change: +(addNoise(s.price, 0.02) - s.price).toFixed(2),
  }))

  await cacheSet('market:all', data, 60)
  return data
}

// ── Fetch quotes for specific symbols ────────────────────────────────────────
export async function getQuotes(symbols: string[]) {
  const all = await getAllStocks()
  return symbols.map((sym) => {
    const found = all.find((s) => s.symbol === sym.toUpperCase())
    if (found) return found
    // Return a placeholder for unknown symbols
    return { symbol: sym.toUpperCase(), name: sym, price: 0, changePct: 0, change: 0, volume: 0, marketCap: 0, pe: 0, eps: 0, dividendYield: 0, weekHigh52: 0, weekLow52: 0, beta: 0, analystRating: 'Hold', sector: 'Unknown', exchange: 'Unknown' }
  })
}

// ── Get top gainers / losers ──────────────────────────────────────────────────
export async function getMovers() {
  const all = await getAllStocks()
  const sorted = [...all].sort((a, b) => b.changePct - a.changePct)
  return {
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
  }
}

// ── Get market indices ────────────────────────────────────────────────────────
export async function getIndices() {
  const cached = await cacheGet<typeof MOCK_INDICES>('market:indices')
  if (cached) return cached

  const data = MOCK_INDICES.map((idx) => ({
    ...idx,
    value: addNoise(idx.value, 0.003),
  }))
  await cacheSet('market:indices', data, 30)
  return data
}

// ── Fetch OHLCV history ───────────────────────────────────────────────────────
export async function getHistory(symbol: string, range: string) {
  const cacheKey = `history:${symbol}:${range}`
  const cached = await cacheGet<unknown[]>(cacheKey)
  if (cached) return cached

  const rangeDays: Record<string, number> = {
    '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 1825
  }
  const days = rangeDays[range] ?? 90
  const stock = MOCK_STOCKS.find((s) => s.symbol === symbol.toUpperCase())
  const basePrice = stock?.price ?? 150

  // Generate realistic-looking mock OHLCV data
  const data = []
  let price = basePrice * (1 - Math.random() * 0.3)
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const change = (Math.random() - 0.48) * price * 0.025
    price = Math.max(price + change, 1)
    const open = price
    const high = price * (1 + Math.random() * 0.015)
    const low = price * (1 - Math.random() * 0.015)
    const close = low + Math.random() * (high - low)
    data.push({
      date: d.toISOString().split('T')[0],
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(1e6 + Math.random() * 50e6),
    })
  }

  await cacheSet(cacheKey, data, 300)
  return data
}

// ── Search stocks ─────────────────────────────────────────────────────────────
export async function searchStocks(query: string) {
  const q = query.toLowerCase()
  return MOCK_STOCKS.filter(
    (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 8)
}
