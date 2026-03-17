import { useState, useCallback, useRef } from 'react'
import { Search, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { Sparkline, PageLoader, EmptyState } from '../components/ui'
import { formatCurrency, formatPct, formatVolume, getChangeBg, getChangeColor } from '../utils/format'
import type { StockQuote, PriceUpdate } from '../types'
import clsx from 'clsx'

const SECTORS = ['All', 'Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial']
const EXCHANGES = ['All', 'NASDAQ', 'NYSE']
const SORT_OPTIONS = [
  { label: 'Symbol', key: 'symbol' },
  { label: '% Change', key: 'changePct' },
  { label: 'Price', key: 'price' },
  { label: 'Volume', key: 'volume' },
  { label: 'Market Cap', key: 'marketCap' },
]

export default function MarketMonitor() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [exchange, setExchange] = useState('All')
  const [sortKey, setSortKey] = useState('changePct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [liveData, setLiveData] = useState<Record<string, PriceUpdate>>({})
  const flashMap = useRef<Record<string, 'up' | 'down'>>({})
  const [flashState, setFlashState] = useState<Record<string, 'up' | 'down' | null>>({})

  const { data: stocks, isLoading } = useQuery<StockQuote[]>({
    queryKey: ['market', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/market/all')
      return data
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const onPriceUpdate = useCallback((update: PriceUpdate) => {
    setLiveData((prev) => {
      const prevPrice = prev[update.ticker]?.price
      if (prevPrice !== undefined && prevPrice !== update.price) {
        const dir = update.price > prevPrice ? 'up' : 'down'
        flashMap.current[update.ticker] = dir
        setFlashState((f) => ({ ...f, [update.ticker]: dir }))
        setTimeout(() => setFlashState((f) => ({ ...f, [update.ticker]: null })), 800)
      }
      return { ...prev, [update.ticker]: update }
    })
  }, [])

  const tickers = stocks?.map((s) => s.symbol) ?? []
  useWebSocket({ tickers, onPriceUpdate })

  const merged = (stocks ?? []).map((s) => {
    const live = liveData[s.symbol]
    return live ? { ...s, price: live.price, change: live.change, changePct: live.changePct, volume: live.volume } : s
  })

  const filtered = merged
    .filter((s) => {
      if (sector !== 'All' && s.sector !== sector) return false
      if (exchange !== 'All' && s.exchange !== exchange) return false
      if (search) {
        const q = search.toLowerCase()
        return s.symbol.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const av = a[sortKey as keyof StockQuote] as number
      const bv = b[sortKey as keyof StockQuote] as number
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Market Monitor</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {filtered.length} stocks · Live prices via WebSocket
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="text-xs text-text-secondary font-mono">LIVE</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name…"
              className="input w-full pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-text-muted" />
            <div className="flex gap-1">
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className={clsx('px-2.5 py-1 text-xs rounded font-medium transition-all', sector === s ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' : 'text-text-secondary hover:text-text-primary border border-transparent hover:border-surface-500')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            {EXCHANGES.map((e) => (
              <button
                key={e}
                onClick={() => setExchange(e)}
                className={clsx('px-2.5 py-1 text-xs rounded font-medium transition-all', exchange === e ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30' : 'text-text-secondary hover:text-text-primary border border-transparent hover:border-surface-500')}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  {SORT_OPTIONS.map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="px-4 py-3 text-left label cursor-pointer hover:text-text-primary transition-colors select-none"
                    >
                      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left label">Change</th>
                  <th className="px-4 py-3 text-left label">Volume</th>
                  <th className="px-4 py-3 text-right label">7D Chart</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-text-muted text-sm">No stocks match your filters</td></tr>
                )}
                {filtered.slice(0, 100).map((s) => {
                  const flash = flashState[s.symbol]
                  return (
                    <tr
                      key={s.symbol}
                      className={clsx(
                        'border-b border-surface-700/50 table-row-hover',
                        flash === 'up' && 'price-up',
                        flash === 'down' && 'price-down'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono font-medium text-text-primary">{s.symbol}</span>
                          <div className="text-xs text-text-muted">{s.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-primary">{formatCurrency(s.price)}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge', getChangeBg(s.changePct))}>
                          {formatPct(s.changePct)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-secondary text-sm">
                        {s.marketCap ? formatVolume(s.marketCap) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('font-mono text-sm', getChangeColor(s.change))}>
                          {s.change >= 0 ? '+' : ''}{formatCurrency(s.change)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-secondary text-sm">
                        {formatVolume(s.volume)}
                      </td>
                      <td className="px-4 py-3 w-28">
                        <Sparkline
                          data={[s.weekLow52, s.price * 0.98, s.price * 0.99, s.price * 1.01, s.price]}
                          color={s.changePct >= 0 ? '#00e676' : '#ff1744'}
                          height={32}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
