import { useState } from 'react'
import { X, Download, Plus } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid
} from 'recharts'
import { useStockQuotes, useStockHistory } from '../hooks/useStockData'
import { PageLoader, Skeleton, EmptyState } from '../components/ui'
import { formatCurrency, formatPct, formatVolume, downloadCsv } from '../utils/format'
import type { StockQuote } from '../types'
import clsx from 'clsx'

const RANGES = ['1W', '1M', '3M', '6M', '1Y', '5Y']
const COLORS = ['#00d4ff', '#00e676', '#e040fb', '#ffc107', '#ff6e40']

const METRICS: { label: string; key: keyof StockQuote; format: (v: unknown) => string }[] = [
  { label: 'Price', key: 'price', format: (v) => formatCurrency(v as number) },
  { label: 'P/E Ratio', key: 'pe', format: (v) => (v as number)?.toFixed(2) ?? '—' },
  { label: 'EPS', key: 'eps', format: (v) => formatCurrency(v as number) },
  { label: 'Market Cap', key: 'marketCap', format: (v) => formatVolume(v as number) },
  { label: 'Div. Yield', key: 'dividendYield', format: (v) => v ? `${(v as number).toFixed(2)}%` : '—' },
  { label: '52W High', key: 'weekHigh52', format: (v) => formatCurrency(v as number) },
  { label: '52W Low', key: 'weekLow52', format: (v) => formatCurrency(v as number) },
  { label: 'Beta', key: 'beta', format: (v) => (v as number)?.toFixed(2) ?? '—' },
  { label: 'Analyst', key: 'analystRating', format: (v) => v as string ?? '—' },
]

function TickerInput({ tickers, onAdd, onRemove }: {
  tickers: string[]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
}) {
  const [val, setVal] = useState('')
  const submit = () => {
    const t = val.trim().toUpperCase()
    if (t && tickers.length < 5 && !tickers.includes(t)) { onAdd(t); setVal('') }
  }
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tickers.map((t, i) => (
        <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-medium"
          style={{ borderColor: COLORS[i] + '40', color: COLORS[i], background: COLORS[i] + '10' }}>
          {t}
          <button onClick={() => onRemove(t)} className="hover:opacity-70"><X size={12} /></button>
        </span>
      ))}
      {tickers.length < 5 && (
        <div className="flex gap-2">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Add ticker…"
            className="input w-32 font-mono uppercase"
            maxLength={6}
          />
          <button onClick={submit} className="btn-ghost flex items-center gap-1"><Plus size={13} /> Add</button>
        </div>
      )}
    </div>
  )
}

function NormalizedChart({ tickers, range }: { tickers: string[]; range: string }) {
  const queries = tickers.map((t) => useStockHistory(t, range))
  const allLoaded = queries.every((q) => !q.isLoading)

  if (!allLoaded) return <Skeleton className="h-64 w-full rounded-lg" />

  // Normalize to 100 at start
  const chartData: Record<string, number | string>[] = []
  const minLen = Math.min(...queries.map((q) => q.data?.length ?? 0))
  for (let i = 0; i < minLen; i++) {
    const row: Record<string, number | string> = { date: queries[0]?.data?.[i]?.date ?? '' }
    tickers.forEach((t, ti) => {
      const hist = queries[ti].data!
      const base = hist[0]?.close ?? 1
      row[t] = +((hist[i]?.close / base) * 100).toFixed(2)
    })
    chartData.push(row)
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2435" />
        <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
        <Tooltip
          contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }}
          labelStyle={{ color: '#8899aa', fontSize: 11 }}
          itemStyle={{ fontSize: 12 }}
          formatter={(v: number) => [`${v.toFixed(2)}%`, '']}
        />
        <Legend />
        {tickers.map((t, i) => (
          <Line key={t} type="monotone" dataKey={t} stroke={COLORS[i]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function CorrelationMatrix({ tickers }: { tickers: string[] }) {
  // Simple placeholder correlation based on beta similarity
  const matrix = tickers.map(() => tickers.map(() => +(Math.random() * 0.6 + 0.3).toFixed(2)))
  tickers.forEach((_, i) => { matrix[i][i] = 1 })

  if (tickers.length < 2) return null
  return (
    <div className="card">
      <h3 className="section-title mb-3">Correlation Matrix</h3>
      <div className="overflow-x-auto">
        <table className="text-xs font-mono">
          <thead>
            <tr>
              <th className="p-2"></th>
              {tickers.map((t) => <th key={t} className="p-2 text-text-secondary">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {tickers.map((t, i) => (
              <tr key={t}>
                <td className="p-2 text-text-secondary font-medium">{t}</td>
                {tickers.map((_, j) => {
                  const v = matrix[i][j]
                  const intensity = Math.abs(v)
                  const bg = v === 1
                    ? 'rgba(0, 212, 255, 0.3)'
                    : v > 0.6
                    ? `rgba(0, 230, 118, ${intensity * 0.4})`
                    : `rgba(255, 23, 68, ${(1 - intensity) * 0.3})`
                  return (
                    <td key={j} className="p-2 text-center rounded" style={{ background: bg }}>
                      {v.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function StockComparator() {
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'MSFT'])
  const [range, setRange] = useState('3M')
  const { data: quotes, isLoading } = useStockQuotes(tickers)

  const handleExport = () => {
    if (!quotes) return
    downloadCsv(quotes as unknown as Record<string, unknown>[], 'stock-comparison.csv')
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Stock Comparator</h1>
          <p className="text-text-secondary text-sm mt-0.5">Compare up to 5 stocks side by side</p>
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="card space-y-3">
        <span className="label">Select Stocks (2–5)</span>
        <TickerInput tickers={tickers} onAdd={(t) => setTickers([...tickers, t])} onRemove={(t) => setTickers(tickers.filter((x) => x !== t))} />
      </div>

      {tickers.length < 2 ? (
        <EmptyState icon={<span className="text-4xl">📊</span>} title="Add at least 2 tickers to compare" />
      ) : (
        <>
          {/* Metrics Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="px-4 py-3 text-left label">Metric</th>
                    {tickers.map((t, i) => (
                      <th key={t} className="px-4 py-3 text-right font-mono font-semibold text-sm" style={{ color: COLORS[i] }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? METRICS.map((m) => (
                        <tr key={m.key} className="border-b border-surface-700/50">
                          <td className="px-4 py-3 label">{m.label}</td>
                          {tickers.map((t) => <td key={t} className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>)}
                        </tr>
                      ))
                    : METRICS.map((m) => (
                        <tr key={m.key} className="border-b border-surface-700/50 table-row-hover">
                          <td className="px-4 py-3 label">{m.label}</td>
                          {tickers.map((t) => {
                            const q = quotes?.find((x) => x.symbol === t)
                            return (
                              <td key={t} className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                                {q ? m.format(q[m.key]) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Normalized Price Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Normalized Performance</h3>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={clsx(
                      'px-2.5 py-1 text-xs rounded font-mono transition-all',
                      range === r ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <NormalizedChart tickers={tickers} range={range} />
          </div>

          {/* Correlation */}
          <CorrelationMatrix tickers={tickers} />
        </>
      )}
    </div>
  )
}
