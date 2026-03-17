import { useState, useEffect, useRef } from 'react'
import { Brain, RefreshCw, AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { PageLoader, Skeleton, StatCard } from '../components/ui'
import { formatCurrency, formatDate } from '../utils/format'
import type { PredictionResult } from '../types'
import clsx from 'clsx'

const HORIZONS = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
]

export default function PricePredictor() {
  const [ticker, setTicker] = useState('')
  const [horizon, setHorizon] = useState(30)
  const [activeRequest, setActiveRequest] = useState<{ ticker: string; horizon: number } | null>(null)
  const [pollingKey, setPollingKey] = useState('')
  const pollCount = useRef(0)

  const predict = useMutation({
    mutationFn: async ({ ticker, horizon }: { ticker: string; horizon: number }) => {
      const { data } = await api.post('/predict', { ticker, horizon })
      return data
    },
    onSuccess: (data) => {
      if (data.status === 'training') {
        setPollingKey(`${activeRequest?.ticker}-${activeRequest?.horizon}`)
      }
    },
  })

  const { data: result, isLoading: isPolling } = useQuery<PredictionResult & { status?: string }>({
    queryKey: ['prediction', pollingKey],
    queryFn: async () => {
      const { data } = await api.get('/predict/status', {
        params: { ticker: activeRequest?.ticker, horizon: activeRequest?.horizon },
      })
      return data
    },
    enabled: !!pollingKey && !predict.data?.predictions,
    refetchInterval: (data) => {
      if (data?.status === 'ready' || pollCount.current > 30) return false
      pollCount.current++
      return 5000
    },
    staleTime: 86_400_000,
  })

  const finalResult: PredictionResult | null = (predict.data?.predictions ? predict.data : null) ?? (result?.predictions ? result : null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = ticker.trim().toUpperCase()
    if (!t) return
    setActiveRequest({ ticker: t, horizon })
    pollCount.current = 0
    setPollingKey('')
    predict.mutate({ ticker: t, horizon })
  }

  const isWorking = predict.isPending || isPolling || predict.data?.status === 'training'

  // Build chart data: historical + predicted
  const chartData = finalResult
    ? [
        ...finalResult.predictions.slice(0, -horizon).map((p) => ({
          date: p.date,
          actual: p.predictedPrice,
          predicted: null,
          lower: null,
          upper: null,
        })),
        ...finalResult.predictions.slice(-horizon).map((p) => ({
          date: p.date,
          actual: null,
          predicted: p.predictedPrice,
          lower: p.lowerBound,
          upper: p.upperBound,
        })),
      ]
    : []

  const splitDate = finalResult?.predictions[finalResult.predictions.length - horizon]?.date

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Price Predictor</h1>
        <p className="text-text-secondary text-sm mt-0.5">AI-powered forecasts using Prophet time series model</p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="label">Ticker Symbol</label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
              className="input w-full font-mono uppercase"
              maxLength={6}
            />
          </div>
          <div className="space-y-1">
            <label className="label">Prediction Horizon</label>
            <div className="flex gap-1">
              {HORIZONS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHorizon(h.value)}
                  className={clsx(
                    'px-3 py-2 text-xs rounded font-mono transition-all',
                    horizon === h.value
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'btn-ghost text-xs'
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={isWorking || !ticker} className="btn-primary flex items-center gap-2">
            <Brain size={14} />
            {isWorking ? 'Predicting…' : 'Run Prediction'}
          </button>
        </div>
      </form>

      {/* Training indicator */}
      {predict.data?.status === 'training' && (
        <div className="card border-accent-amber/30 flex items-center gap-3">
          <RefreshCw size={16} className="text-accent-amber animate-spin" />
          <div>
            <p className="text-sm font-medium text-text-primary">Model training in progress…</p>
            <p className="text-xs text-text-secondary mt-0.5">This may take 30–60 seconds. Polling every 5s.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {predict.isError && (
        <div className="card border-accent-red/30 flex items-center gap-3">
          <AlertCircle size={16} className="text-accent-red" />
          <p className="text-sm text-text-secondary">Failed to generate prediction. Check your ticker and try again.</p>
        </div>
      )}

      {/* Results */}
      {finalResult && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Ticker"
              value={finalResult.ticker}
              sub={`${finalResult.horizon}-day horizon`}
            />
            <StatCard
              label="Confidence"
              value={`${(finalResult.confidence * 100).toFixed(0)}%`}
              sub="Model confidence"
              subColor={finalResult.confidence > 0.7 ? 'text-accent-green' : 'text-accent-amber'}
            />
            <StatCard
              label="Predicted High"
              value={formatCurrency(Math.max(...finalResult.predictions.slice(-horizon).map((p) => p.upperBound)))}
              sub="Upper bound"
              subColor="text-accent-green"
            />
            <StatCard
              label="Predicted Low"
              value={formatCurrency(Math.min(...finalResult.predictions.slice(-horizon).map((p) => p.lowerBound)))}
              sub="Lower bound"
              subColor="text-accent-red"
            />
          </div>

          {/* Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Price Forecast — {finalResult.ticker}</h3>
              <p className="text-xs text-text-muted">Trained: {formatDate(finalResult.trainedAt)}</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2435" />
                <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                {splitDate && <ReferenceLine x={splitDate} stroke="#ffc107" strokeDasharray="4 2" />}
                <Area type="monotone" dataKey="upper" stroke="none" fill="#00d4ff" fillOpacity={0.08} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="#080c10" fillOpacity={1} />
                <Line type="monotone" dataKey="actual" stroke="#e8f0f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-text-muted mt-3">
              Solid line = historical · Dashed line = predicted · Shaded area = confidence interval
            </p>
          </div>

          {/* Disclaimer */}
          <div className="card border-accent-amber/20 bg-accent-amber/5">
            <p className="text-xs text-accent-amber flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              Predictions are generated by a statistical model and are not financial advice. Past performance does not guarantee future results. Always do your own research before making investment decisions.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
