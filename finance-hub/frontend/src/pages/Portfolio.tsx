import { useState } from 'react'
import { Plus, Trash2, Download, Bell, BellOff } from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  usePortfolio, usePortfolioSnapshots, useAddHolding,
  useRemoveHolding, useAlerts, useCreateAlert, useDeleteAlert
} from '../hooks/usePortfolio'
import {
  PageLoader, StatCard, EmptyState, SectionHeader
} from '../components/ui'
import {
  formatCurrency, formatPct, getChangeBg, downloadCsv, getChangeColor
} from '../utils/format'
import type { Holding } from '../types'
import clsx from 'clsx'

const PIE_COLORS = ['#00d4ff', '#00e676', '#e040fb', '#ffc107', '#ff6e40', '#64b5f6']

// ── Add Holding Modal ─────────────────────────────────────────────────────────
function AddHoldingModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ ticker: '', quantity: '', avgBuyPrice: '', purchaseDate: '' })
  const addHolding = useAddHolding()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addHolding.mutateAsync({
      ticker: form.ticker.toUpperCase(),
      quantity: +form.quantity,
      avgBuyPrice: +form.avgBuyPrice,
      purchaseDate: form.purchaseDate,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-surface-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm space-y-4 animate-fade-up">
        <h3 className="section-title">Add Holding</h3>
        <form onSubmit={submit} className="space-y-3">
          {[
            { key: 'ticker', label: 'Ticker', placeholder: 'AAPL', type: 'text' },
            { key: 'quantity', label: 'Quantity', placeholder: '10', type: 'number' },
            { key: 'avgBuyPrice', label: 'Avg Buy Price ($)', placeholder: '150.00', type: 'number' },
            { key: 'purchaseDate', label: 'Purchase Date', placeholder: '', type: 'date' },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="label">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: f.key === 'ticker' ? e.target.value.toUpperCase() : e.target.value })}
                placeholder={f.placeholder}
                className="input w-full"
                required
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={addHolding.isPending} className="btn-primary flex-1">
              {addHolding.isPending ? 'Adding…' : 'Add Holding'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Alert Modal ───────────────────────────────────────────────────────────────
function AddAlertModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ ticker: '', condition: 'above', targetPrice: '' })
  const createAlert = useCreateAlert()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createAlert.mutateAsync({
      ticker: form.ticker.toUpperCase(),
      condition: form.condition as 'above' | 'below',
      targetPrice: +form.targetPrice,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-surface-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm space-y-4 animate-fade-up">
        <h3 className="section-title">Create Price Alert</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="label">Ticker</label>
            <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
              placeholder="AAPL" className="input w-full font-mono uppercase" required />
          </div>
          <div className="space-y-1">
            <label className="label">Condition</label>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="input w-full">
              <option value="above">Price rises above</option>
              <option value="below">Price falls below</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">Target Price ($)</label>
            <input type="number" step="0.01" value={form.targetPrice}
              onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
              placeholder="200.00" className="input w-full" required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createAlert.isPending} className="btn-primary flex-1">
              {createAlert.isPending ? 'Creating…' : 'Create Alert'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────────
function PortfolioTab() {
  const { data: holdings, isLoading } = usePortfolio()
  const { data: snapshots } = usePortfolioSnapshots()
  const removeHolding = useRemoveHolding()
  const [showAdd, setShowAdd] = useState(false)

  const totalValue = holdings?.reduce((s, h) => s + (h.currentValue ?? h.quantity * h.avgBuyPrice), 0) ?? 0
  const totalCost = holdings?.reduce((s, h) => s + h.quantity * h.avgBuyPrice, 0) ?? 0
  const totalGainLoss = totalValue - totalCost
  const totalGainLossPct = totalCost ? (totalGainLoss / totalCost) * 100 : 0

  const allocationData = holdings?.map((h, i) => ({
    name: h.ticker,
    value: h.currentValue ?? h.quantity * h.avgBuyPrice,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? []

  const sectorData = Object.entries(
    holdings?.reduce<Record<string, number>>((acc, h) => {
      const s = h.sector ?? 'Other'
      acc[s] = (acc[s] ?? 0) + (h.currentValue ?? h.quantity * h.avgBuyPrice)
      return acc
    }, {}) ?? {}
  ).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Portfolio Value" value={formatCurrency(totalValue)} />
        <StatCard label="Total Cost" value={formatCurrency(totalCost)} />
        <StatCard
          label="Total Gain/Loss"
          value={formatCurrency(totalGainLoss)}
          sub={formatPct(totalGainLossPct)}
          subColor={getChangeColor(totalGainLoss)}
        />
        <StatCard label="Holdings" value={String(holdings?.length ?? 0)} sub="positions" />
      </div>

      {/* Charts */}
      {allocationData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="section-title mb-3">Allocation</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {allocationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="section-title mb-3">By Sector</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label={({ name }) => name} labelLine={false}>
                  {sectorData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance chart */}
      {snapshots && snapshots.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-3">Portfolio Value Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2435" />
              <XAxis dataKey="date" tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#8899aa', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#131b26', border: '1px solid #1a2435', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="totalValue" stroke="#00d4ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Holdings table */}
      <div>
        <SectionHeader
          title="Holdings"
          action={
            <div className="flex gap-2">
              <button onClick={() => holdings && downloadCsv(holdings as unknown as Record<string, unknown>[], 'portfolio.csv')} className="btn-ghost flex items-center gap-1.5 text-xs">
                <Download size={12} /> Export
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={12} /> Add
              </button>
            </div>
          }
        />
        {!holdings?.length ? (
          <EmptyState icon={<span className="text-4xl">💼</span>} title="No holdings yet" message="Add your first position to start tracking your portfolio." />
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  {['Ticker', 'Qty', 'Avg Cost', 'Current', 'Value', 'Gain/Loss', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h: Holding) => {
                  const currentValue = h.currentValue ?? h.quantity * h.avgBuyPrice
                  const gainLoss = currentValue - h.quantity * h.avgBuyPrice
                  const gainLossPct = (gainLoss / (h.quantity * h.avgBuyPrice)) * 100
                  return (
                    <tr key={h.id} className="border-b border-surface-700/50 table-row-hover">
                      <td className="px-4 py-3 font-mono font-medium text-text-primary">{h.ticker}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{h.quantity}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{formatCurrency(h.avgBuyPrice)}</td>
                      <td className="px-4 py-3 font-mono text-text-primary">{h.currentPrice ? formatCurrency(h.currentPrice) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-text-primary">{formatCurrency(currentValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={clsx('font-mono text-sm', gainLoss >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                          </span>
                          <span className={clsx('badge text-xs mt-0.5', getChangeBg(gainLossPct))}>
                            {formatPct(gainLossPct)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeHolding.mutate(h.id)} className="text-text-muted hover:text-accent-red transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddHoldingModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Alerts Tab ────────────────────────────────────────────────────────────────
function AlertsTab() {
  const { data: alerts, isLoading } = useAlerts()
  const deleteAlert = useDeleteAlert()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Price Alerts"
        action={
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={12} /> New Alert
          </button>
        }
      />
      {isLoading ? <PageLoader /> : !alerts?.length ? (
        <EmptyState icon={<Bell size={32} />} title="No alerts set" message="Create price alerts to get notified when a stock hits your target." />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={clsx('card flex items-center justify-between', a.triggered && 'border-accent-green/30 bg-accent-green/5')}>
              <div className="flex items-center gap-3">
                {a.triggered ? <Bell size={14} className="text-accent-green" /> : <BellOff size={14} className="text-text-muted" />}
                <div>
                  <p className="font-mono font-medium text-text-primary">
                    {a.ticker} <span className="text-text-secondary font-normal">{a.condition}</span>{' '}
                    <span className="text-accent-cyan">{formatCurrency(a.targetPrice)}</span>
                  </p>
                  {a.triggered && <p className="text-xs text-accent-green mt-0.5">✓ Alert triggered</p>}
                </div>
              </div>
              <button onClick={() => deleteAlert.mutate(a.id)} className="text-text-muted hover:text-accent-red transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {showAdd && <AddAlertModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Portfolio Page ────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [tab, setTab] = useState<'portfolio' | 'alerts'>('portfolio')
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">Portfolio Tracker</h1>
        <p className="text-text-secondary text-sm mt-0.5">Track your holdings, performance & price alerts</p>
      </div>
      <div className="flex gap-1 border-b border-surface-700">
        {(['portfolio', 'alerts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              tab === t ? 'border-accent-cyan text-accent-cyan' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {t === 'portfolio' ? 'Portfolio' : 'Alerts'}
          </button>
        ))}
      </div>
      {tab === 'portfolio' ? <PortfolioTab /> : <AlertsTab />}
    </div>
  )
}
