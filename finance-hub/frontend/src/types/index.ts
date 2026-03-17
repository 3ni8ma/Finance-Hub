// ─── Stock & Market ──────────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  marketCap: number
  pe: number
  eps: number
  dividendYield: number
  weekHigh52: number
  weekLow52: number
  beta: number
  analystRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  sector: string
  exchange: string
  previousClose?: number
}

export interface OHLCV {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Sparkline {
  symbol: string
  points: number[]
}

export interface MarketIndex {
  name: string
  symbol: string
  value: number
  change: number
  changePct: number
}

export interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentScore: number
  imageUrl?: string
}

// ─── Prediction ───────────────────────────────────────────────────────────────

export interface PredictionPoint {
  date: string
  predictedPrice: number
  lowerBound: number
  upperBound: number
}

export interface PredictionResult {
  ticker: string
  horizon: number
  predictions: PredictionPoint[]
  confidence: number
  trainedAt: string
}

export type PredictionStatus = 'idle' | 'training' | 'ready' | 'error'

// ─── Strategies ───────────────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface Strategy {
  id: string
  name: string
  slug: string
  description: string
  riskLevel: RiskLevel
  holdingPeriod: string
  parameters: StrategyParameter[]
}

export interface StrategyParameter {
  key: string
  label: string
  type: 'number' | 'select'
  default: number | string
  min?: number
  max?: number
  options?: string[]
}

export interface BacktestResult {
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  numTrades: number
  cumulativeReturns: { date: string; value: number }[]
}

export interface SavedStrategy {
  id: string
  strategyName: string
  parameters: Record<string, number | string>
  createdAt: string
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface Holding {
  id: string
  ticker: string
  name?: string
  quantity: number
  avgBuyPrice: number
  purchaseDate: string
  currentPrice?: number
  currentValue?: number
  gainLoss?: number
  gainLossPct?: number
  sector?: string
}

export interface PortfolioSnapshot {
  date: string
  totalValue: number
}

export interface PriceAlert {
  id: string
  ticker: string
  condition: 'above' | 'below'
  targetPrice: number
  triggered: boolean
  createdAt: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

export interface PriceUpdate {
  ticker: string
  price: number
  change: number
  changePct: number
  volume: number
  timestamp: string
}

export interface AlertTriggered {
  alertId: string
  ticker: string
  price: number
  message: string
}
