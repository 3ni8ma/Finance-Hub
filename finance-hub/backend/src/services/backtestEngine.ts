export interface OHLCV {
  date: string; open: number; high: number; low: number; close: number; volume: number
}

export interface Trade {
  entryDate: string; entryPrice: number
  exitDate: string; exitPrice: number
  return: number
}

export interface BacktestResult {
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  numTrades: number
  cumulativeReturns: { date: string; value: number }[]
}

// ── Technical Indicators ──────────────────────────────────────────────────────

function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prev)
  for (let i = period; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(period).fill(null)
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period, avgLoss = losses / period
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  }
  return result
}

function bollingerBands(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period)
  return closes.map((_, i) => {
    if (mid[i] === null) return { mid: null, upper: null, lower: null }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = mid[i]!
    const stddev = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period)
    return { mid: mean, upper: mean + mult * stddev, lower: mean - mult * stddev }
  })
}

// ── Strategy Signal Generators ────────────────────────────────────────────────

type Signal = 'buy' | 'sell' | null

function smaCrossoverSignals(ohlcv: OHLCV[], params: Record<string, number>): Signal[] {
  const closes = ohlcv.map((d) => d.close)
  const shortSMA = sma(closes, params.shortPeriod ?? 50)
  const longSMA = sma(closes, params.longPeriod ?? 200)
  return closes.map((_, i) => {
    if (shortSMA[i] === null || longSMA[i] === null || i === 0) return null
    const prevS = shortSMA[i - 1], prevL = longSMA[i - 1]
    if (prevS === null || prevL === null) return null
    if (prevS <= prevL && shortSMA[i]! > longSMA[i]!) return 'buy'
    if (prevS >= prevL && shortSMA[i]! < longSMA[i]!) return 'sell'
    return null
  })
}

function rsiSignals(ohlcv: OHLCV[], params: Record<string, number>): Signal[] {
  const closes = ohlcv.map((d) => d.close)
  const rsiValues = rsi(closes, params.period ?? 14)
  const oversold = params.oversold ?? 30
  const overbought = params.overbought ?? 70
  return rsiValues.map((v, i) => {
    if (v === null || i === 0) return null
    const prev = rsiValues[i - 1]
    if (prev === null) return null
    if (prev >= oversold && v < oversold) return 'buy'
    if (prev <= overbought && v > overbought) return 'sell'
    return null
  })
}

function bollingerSignals(ohlcv: OHLCV[], params: Record<string, number>): Signal[] {
  const closes = ohlcv.map((d) => d.close)
  const bands = bollingerBands(closes, params.period ?? 20, params.stdDev ?? 2)
  return closes.map((c, i) => {
    const b = bands[i]
    if (!b.upper || !b.lower) return null
    if (c < b.lower) return 'buy'
    if (c > b.upper) return 'sell'
    return null
  })
}

function macdSignals(ohlcv: OHLCV[], params: Record<string, number>): Signal[] {
  const closes = ohlcv.map((d) => d.close)
  const fast = params.fastPeriod ?? 12
  const slow = params.slowPeriod ?? 26
  const signal = params.signalPeriod ?? 9
  if (closes.length < slow + signal) return closes.map(() => null)
  const fastEMA = ema(closes, fast)
  const slowEMA = ema(closes, slow)
  const offset = closes.length - slowEMA.length
  const macdLine = slowEMA.map((_, i) => fastEMA[i + offset + (closes.length - slowEMA.length - (closes.length - fastEMA.length))] - slowEMA[i])
  const signalLine = ema(macdLine, signal)
  const sig = signalLine
  const result: Signal[] = Array(closes.length).fill(null)
  const start = closes.length - sig.length
  sig.forEach((sv, i) => {
    const mi = i + start
    if (mi === 0 || mi >= result.length) return
    const prevM = macdLine[i - 1] ?? macdLine[0]
    const prevS = sig[i - 1] ?? sig[0]
    if (prevM !== undefined && prevS !== undefined) {
      if (prevM <= prevS && macdLine[i] > sv) result[mi] = 'buy'
      else if (prevM >= prevS && macdLine[i] < sv) result[mi] = 'sell'
    }
  })
  return result
}

function meanReversionSignals(ohlcv: OHLCV[], params: Record<string, number>): Signal[] {
  const closes = ohlcv.map((d) => d.close)
  const period = params.period ?? 20
  const threshold = (params.threshold ?? 5) / 100
  const movAvg = sma(closes, period)
  return closes.map((c, i) => {
    const ma = movAvg[i]
    if (ma === null) return null
    const dev = (c - ma) / ma
    if (dev < -threshold) return 'buy'
    if (dev > threshold) return 'sell'
    return null
  })
}

const STRATEGY_SIGNALS: Record<string, (ohlcv: OHLCV[], params: Record<string, number>) => Signal[]> = {
  'sma-crossover':  smaCrossoverSignals,
  'golden-cross':   smaCrossoverSignals,
  'rsi':            rsiSignals,
  'bollinger':      bollingerSignals,
  'macd':           macdSignals,
  'mean-reversion': meanReversionSignals,
}

// ── Backtest Engine ───────────────────────────────────────────────────────────

export function runBacktest(
  ohlcv: OHLCV[],
  strategyId: string,
  params: Record<string, number>
): BacktestResult {
  const signalFn = STRATEGY_SIGNALS[strategyId]
  if (!signalFn) throw new Error(`Unknown strategy: ${strategyId}`)

  const signals = signalFn(ohlcv, params)
  const trades: Trade[] = []
  let inPosition = false
  let entryPrice = 0
  let entryDate = ''

  for (let i = 0; i < ohlcv.length; i++) {
    const sig = signals[i]
    const { close, date } = ohlcv[i]

    if (!inPosition && sig === 'buy') {
      inPosition = true; entryPrice = close; entryDate = date
    } else if (inPosition && sig === 'sell') {
      inPosition = false
      trades.push({
        entryDate, entryPrice,
        exitDate: date, exitPrice: close,
        return: (close - entryPrice) / entryPrice,
      })
    }
  }
  // Close any open position at end
  if (inPosition) {
    const last = ohlcv[ohlcv.length - 1]
    trades.push({ entryDate, entryPrice, exitDate: last.date, exitPrice: last.close, return: (last.close - entryPrice) / entryPrice })
  }

  // Compute cumulative return equity curve
  const cumulativeReturns: { date: string; value: number }[] = []
  let equity = 100
  let tradeIdx = 0
  for (const bar of ohlcv) {
    if (tradeIdx < trades.length && bar.date >= trades[tradeIdx].exitDate) {
      equity *= 1 + trades[tradeIdx].return
      tradeIdx++
    }
    cumulativeReturns.push({ date: bar.date, value: +equity.toFixed(2) })
  }

  const totalReturn = trades.reduce((acc, t) => (1 + acc) * (1 + t.return) - 1, 0) * 100
  const winRate = trades.length ? (trades.filter((t) => t.return > 0).length / trades.length) * 100 : 0
  const returns = trades.map((t) => t.return)
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length) : 1
  const sharpeRatio = stdDev ? (mean / stdDev) * Math.sqrt(252) : 0

  let peak = 100, maxDrawdown = 0, runningEquity = 100
  for (const t of trades) {
    runningEquity *= 1 + t.return
    if (runningEquity > peak) peak = runningEquity
    const dd = (peak - runningEquity) / peak * 100
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  return {
    totalReturn: +totalReturn.toFixed(2),
    sharpeRatio: +sharpeRatio.toFixed(3),
    maxDrawdown: +maxDrawdown.toFixed(2),
    winRate: +winRate.toFixed(1),
    numTrades: trades.length,
    cumulativeReturns,
  }
}
