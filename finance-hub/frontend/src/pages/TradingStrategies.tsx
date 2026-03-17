import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Area
} from 'recharts'
import { BookOpen, Play, Save, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../utils/api'
import { RiskBadge, PageLoader, StatCard } from '../components/ui'
import { formatPct } from '../utils/format'
import type { Strategy, BacktestResult } from '../types'
import clsx from 'clsx'

const STRATEGIES: Strategy[] = [
  {
    id: 'sma-crossover',
    slug: 'sma-crossover',
    name: 'Moving Average Crossover',
    description: 'Generates buy signals when a short-term SMA crosses above a long-term SMA, and sell signals when it crosses below. Classic trend-following strategy.',
    riskLevel: 'Medium',
    holdingPeriod: 'Weeks–Months',
    parameters: [
      { key: 'shortPeriod', label: 'Short SMA Period', type: 'number', default: 50, min: 5, max: 100 },
      { key: 'longPeriod', label: 'Long SMA Period', type: 'number', default: 200, min: 50, max: 500 },
    ],
  },
  {
    id: 'rsi',
    slug: 'rsi',
    name: 'RSI Overbought/Oversold',
    description: 'Uses the Relative Strength Index to identify overbought (>70) and oversold (<30) conditions. Buy when RSI is below 30, sell when above 70.',
    riskLevel: 'Medium',
    holdingPeriod: 'Days–Weeks',
    parameters: [
      { key: 'period', label: 'RSI Period', type: 'number', default: 14, min: 5, max: 30 },
      { key: 'oversold', label: 'Oversold Threshold', type: 'number', default: 30, min: 10, max: 40 },
      { key: 'overbought', label: 'Overbought Threshold', type: 'number', default: 70, min: 60, max: 90 },
    ],
  },
  {
    id: 'bollinger',
    slug: 'bollinger',
    name: 'Bollinger Bands Breakout',
    description: 'Buys when price breaks above the upper band (momentum) or below the lower band (mean reversion). Uses volatility-adjusted bands around a moving average.',
    riskLevel: 'High',
    holdingPeriod: 'Days',
    parameters: [
      { key: 'period', label: 'MA Period', type: 'number', default: 20, min: 5, max: 50 },
      { key: 'stdDev', label: 'Std Dev Multiplier', type: 'number', default: 2, min: 1, max: 4 },
    ],
  },
  {
    id: 'macd',
    slug: 'macd',
    name: 'MACD Signal Cross',
    description: 'Generates signals when the MACD line crosses the signal line. Combines trend direction, momentum, and duration into a single indicator.',
    riskLevel: 'Medium',
    holdingPeriod: 'Days–Weeks',
    parameters: [
      { key: 'fastPeriod', label: 'Fast EMA', type: 'number', default: 12, min: 5, max: 20 },
      { key: 'slowPeriod', label: 'Slow EMA', type: 'number', default: 26, min: 15, max: 50 },
      { key: 'signalPeriod', label: 'Signal Period', type: 'number', default: 9, min: 3, max: 20 },
    ],
  },
  {
    id: 'golden-cross',
    slug: 'golden-cross',
    name: 'Golden Cross / Death Cross',
    description: 'Buy on the "Golden Cross" (50-day SMA crossing above 200-day SMA) and sell on the "Death Cross" (opposite). One of the most widely followed signals.',
    riskLevel: 'Low',
    holdingPeriod: 'Months–Years',
    parameters: [
      { key: 'shortPeriod', label: 'Short SMA', type: 'number', default: 50, min: 20, max: 100 },
      { key: 'longPeriod', label: 'Long SMA', type: 'number', default: 200, min: 100, max: 500 },
    ],
  },
  {
    id: 'mean-reversion',
    slug: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Assumes prices tend to revert to their historical average. Buys when price deviates significantly below the moving average and sells when it reverts.',
    riskLevel: 'Medium',
    holdingPeriod: 'Days–Weeks',
    parameters: [
      { key: 'period', label: 'Lookback Period', type: 'number', default: 20, min: 10, max: 60 },
      { key: 'threshold', label: 'Deviation Threshold (%)', type: 'number', default: 5, min: 1, max: 20 },
    ],
  },
]

function BacktestPanel({ strategy }: { strategy: Strategy }) {
  const [ticker, setTicker] = useState('AAPL')
  const [dateFrom, setDateFrom] = useState('2020-01-01')
  const [dateTo, setDateTo] = useState('2024-01-01')
  const [params, setParams] = useState<Record<string, number | string>>(
    Object.fromEntries(strategy.parameters.map((p) => [p.key, p.default]))
  )
  const qc = useQueryClient()

  const backtest = useMutation<BacktestResult, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post('/strategies/backtest', {
        strategy: strategy.id,
        ticker,
        dateFrom,
        dateTo,
        params,
      })
      return data
    },
  })

  const saveStrategy = useMutation({
    mutationFn: () =>
      api.post('/strategies/save', { strategyName: strategy.id, parameters: params }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-strategies'] }),
  })

  return (
    <div className="mt-4 space-y-4 border-t border-surface-700 pt-4">
      {/* Parameters */}
      <div>
        <h4 className="label mb-2">Strategy Parameters</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {strategy.parameters.map((p) => (
            <div key={p.key} className="space-y-1">
              <label className="text-xs text-text-secondary">{p.label}</label>
              <input
                type="number"
                value={params[p.key] as number}
                min={p.min}
                max={p.max}
                onChange={(e) => setParams({ ...params, [p.key]: +e.target.value })}
                className="input w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Backtest config */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="label">Ticker</label>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="input w-full font-mono uppercase" maxLength={6} />
        </div>
        <div className="space-y-1">
          <label className="label">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-full" />
        </div>
        <div className="space-y-1">
          <label className="label">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-full" />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => backtest.mutate()}
          disabled={backtest.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <Play size={13} /> {backtest.isPending ? 'Running…' : 'Run Backtest'}
        </button>
        <button onClick={() => saveStrategy.mutate()} className="btn-ghost flex items-center gap-2">
          <Save size={13} /> Save Config
        </button>
        {saveStrategy.isSuccess && <span className="text-xs text-accent-green self-center">Saved ✓</span>}
      </div>

      {/* Results */}
      {backtest.data && (
        <div className="space-y-4 animate-fade-up">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total Return" value={formatPct(backtest.data.totalReturn)} subColor={backtest.data.totalReturn >= 0 ? 'text-accent-green' : 'text-accent-red'} />
            <StatCard label="Sharpe Ratio" value={backtest.data.sharpeRatio.toFixed(2)} />
            <StatCard label="Max Drawdown" value={formatPct(backtest.data.maxDrawdown)} subColor="text-accent-red" />
            <StatCard label="Win Rate" value={formatPct(backtest.data.winRate)} />
            <StatCard label="# Trades" value={String(backtest.data.numTrades)} />
          </div>
          <div className="card">
            <h4 className="section-title mb-3">Cumulative Returns</h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={backtest.data.cumulativeReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2435" />
                <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Return']} />
                <ReferenceLine y={0} stroke="#4a5568" strokeDasharray="3 2" />
                <Area type="monotone" dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.1} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {backtest.isError && (
        <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
          Backtest failed. Check your parameters and date range.
        </p>
      )}
    </div>
  )
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card hover:border-surface-500 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-display font-semibold text-text-primary">{strategy.name}</h3>
            <RiskBadge level={strategy.riskLevel} />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{strategy.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="label">Holding Period</span>
            <span className="text-xs font-mono text-text-primary">{strategy.holdingPeriod}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-ghost flex items-center gap-1.5 shrink-0"
        >
          {expanded ? <><ChevronUp size={13} /> Hide</> : <><Play size={13} /> Backtest</>}
        </button>
      </div>
      {expanded && <BacktestPanel strategy={strategy} />}
    </div>
  )
}

export default function TradingStrategies() {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Trading Strategies</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          {STRATEGIES.length} strategies · Backtest with historical data
        </p>
      </div>
      <div className="space-y-3">
        {STRATEGIES.map((s) => <StrategyCard key={s.id} strategy={s} />)}
      </div>
    </div>
  )
}
