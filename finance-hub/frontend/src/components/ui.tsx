import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { formatPct, formatCurrency, getChangeBg } from '../utils/format'
import clsx from 'clsx'

// ── Loader ────────────────────────────────────────────────────────────────────
export function Loader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={clsx('border-2 border-surface-600 border-t-accent-cyan rounded-full animate-spin', cls)} />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('bg-surface-700 animate-pulse rounded', className)} />
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  sub?: string
  subColor?: string
  icon?: React.ReactNode
}
export function StatCard({ label, value, sub, subColor = 'text-text-secondary', icon }: StatCardProps) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
      <p className="font-display font-bold text-text-primary text-2xl tracking-tight">{value}</p>
      {sub && <p className={clsx('text-xs font-mono', subColor)}>{sub}</p>}
    </div>
  )
}

// ── Sparkline Chart ───────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}
export function Sparkline({ data, color = '#00d4ff', height = 40 }: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Price Cell (flashes on change) ────────────────────────────────────────────
interface PriceCellProps {
  price: number
  changePct?: number
  size?: 'sm' | 'md' | 'lg'
}
export function PriceCell({ price, changePct, size = 'md' }: PriceCellProps) {
  const prev = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price !== prev.current) {
      setFlash(price > prev.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 800)
      prev.current = price
      return () => clearTimeout(t)
    }
  }, [price])

  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-lg font-bold' }[size]

  return (
    <span
      className={clsx(
        'font-mono transition-colors rounded px-1',
        sizeClass,
        flash === 'up' && 'price-up text-accent-green',
        flash === 'down' && 'price-down text-accent-red',
        flash === null && 'text-text-primary'
      )}
    >
      {formatCurrency(price)}
      {changePct !== undefined && (
        <span className={clsx('ml-2 text-xs', getChangeBg(changePct), 'px-1.5 py-0.5 rounded')}>
          {formatPct(changePct)}
        </span>
      )}
    </span>
  )
}

// ── Risk Badge ────────────────────────────────────────────────────────────────
const riskColors: Record<string, string> = {
  Low: 'badge-green',
  Medium: 'badge-amber',
  High: 'badge-red',
}
export function RiskBadge({ level }: { level: string }) {
  return <span className={riskColors[level] ?? 'badge-neutral'}>{level}</span>
}

// ── Sentiment Badge ───────────────────────────────────────────────────────────
const sentimentColors: Record<string, string> = {
  Positive: 'badge-green',
  Neutral: 'badge-neutral',
  Negative: 'badge-red',
}
export function SentimentBadge({ sentiment }: { sentiment: string }) {
  return <span className={sentimentColors[sentiment] ?? 'badge-neutral'}>{sentiment}</span>
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="text-text-muted">{icon}</div>
      <p className="font-display font-semibold text-text-secondary">{title}</p>
      {message && <p className="text-xs text-text-muted max-w-xs">{message}</p>}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  )
}
