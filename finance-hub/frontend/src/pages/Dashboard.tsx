import { useState } from 'react'
import { Search, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import {
  useMarketIndices, useMarketMovers, useNews, useStockSearch, useAddToWatchlist
} from '../hooks/useStockData'
import {
  PageLoader, Sparkline, SentimentBadge, SectionHeader, Skeleton
} from '../components/ui'
import { formatCurrency, formatPct, formatTimeAgo, getChangeBg, getChangeColor } from '../utils/format'

// ── Market Indices Bar ────────────────────────────────────────────────────────
function IndicesBar() {
  const { data, isLoading } = useMarketIndices()
  if (isLoading) return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-32 rounded-lg shrink-0" />
      ))}
    </div>
  )
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {(data ?? []).map((idx) => (
        <div
          key={idx.symbol}
          className="card shrink-0 min-w-[130px] flex flex-col gap-0.5 py-2.5"
        >
          <span className="label text-[10px]">{idx.symbol}</span>
          <span className="font-mono font-medium text-text-primary text-sm">
            {idx.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
          <span className={`font-mono text-xs ${getChangeColor(idx.changePct)}`}>
            {formatPct(idx.changePct)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Movers Table ──────────────────────────────────────────────────────────────
function MoversTable({ type }: { type: 'gainers' | 'losers' }) {
  const { data, isLoading } = useMarketMovers()
  const stocks = type === 'gainers' ? data?.gainers : data?.losers

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        {type === 'gainers'
          ? <TrendingUp size={14} className="text-accent-green" />
          : <TrendingDown size={14} className="text-accent-red" />}
        <h3 className="font-display font-semibold text-text-primary text-sm">
          Top {type === 'gainers' ? 'Gainers' : 'Losers'}
        </h3>
      </div>
      <div className="space-y-1">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)
          : (stocks ?? []).slice(0, 5).map((s) => (
              <div key={s.symbol} className="flex items-center justify-between py-1.5 px-2 rounded table-row-hover">
                <div>
                  <span className="font-mono text-sm font-medium text-text-primary">{s.symbol}</span>
                  <span className="ml-2 text-xs text-text-muted truncate max-w-[80px] hidden sm:inline">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-text-primary">{formatCurrency(s.price)}</span>
                  <span className={`badge text-xs ${getChangeBg(s.changePct)}`}>
                    {formatPct(s.changePct)}
                  </span>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}

// ── News Feed ─────────────────────────────────────────────────────────────────
function NewsFeed() {
  const { data, isLoading } = useNews(10)
  return (
    <div className="space-y-2">
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        : (data ?? []).map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card block hover:border-surface-500 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary group-hover:text-accent-cyan transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-text-muted font-mono">{item.source}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-xs text-text-muted">{formatTimeAgo(item.publishedAt)}</span>
                  </div>
                </div>
                <SentimentBadge sentiment={item.sentiment} />
              </div>
            </a>
          ))}
    </div>
  )
}

// ── Quick Add Widget ──────────────────────────────────────────────────────────
function QuickAdd() {
  const [query, setQuery] = useState('')
  const { data: results } = useStockSearch(query)
  const addMutation = useAddToWatchlist()

  return (
    <div className="card space-y-3">
      <h3 className="font-display font-semibold text-text-primary text-sm flex items-center gap-2">
        <Plus size={14} className="text-accent-cyan" /> Quick Add to Watchlist
      </h3>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company…"
          className="input w-full pl-8"
        />
      </div>
      {results && results.length > 0 && query.length >= 2 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {results.slice(0, 6).map((s) => (
            <div key={s.symbol} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-700 transition-colors">
              <div>
                <span className="font-mono text-sm text-text-primary">{s.symbol}</span>
                <span className="ml-2 text-xs text-text-muted">{s.name}</span>
              </div>
              <button
                onClick={() => { addMutation.mutate(s.symbol); setQuery('') }}
                className="w-6 h-6 rounded border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-0.5">Market overview & latest news</p>
      </div>

      {/* Indices Bar */}
      <IndicesBar />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Movers */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MoversTable type="gainers" />
            <MoversTable type="losers" />
          </div>
          <QuickAdd />
        </div>

        {/* Right: News */}
        <div className="space-y-4">
          <SectionHeader title="Market News" />
          <NewsFeed />
        </div>
      </div>
    </div>
  )
}
