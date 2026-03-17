import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Activity, GitCompare, Brain,
  BookOpen, Briefcase, LogOut, Bell, TrendingUp
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePortfolioStore } from '../store/portfolioStore'
import clsx from 'clsx'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/market',    icon: Activity,        label: 'Market'      },
  { to: '/compare',   icon: GitCompare,      label: 'Compare'     },
  { to: '/predict',   icon: Brain,           label: 'Predictor'   },
  { to: '/strategies',icon: BookOpen,        label: 'Strategies'  },
  { to: '/portfolio', icon: Briefcase,       label: 'Portfolio'   },
]

export default function Layout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const notifications = usePortfolioStore((s) => s.notifications)
  const dismissNotification = usePortfolioStore((s) => s.dismissNotification)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Sidebar */}
      <aside className="w-16 lg:w-56 flex flex-col border-r border-surface-700 bg-surface-800 shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-3 lg:px-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center">
              <TrendingUp size={14} className="text-accent-cyan" />
            </div>
            <span className="hidden lg:block font-display font-bold text-text-primary text-sm tracking-tight">
              Finance<span className="text-accent-cyan">Hub</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group',
                  active
                    ? 'bg-accent-cyan/10 text-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-700'
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="hidden lg:block text-sm font-medium">{label}</span>
                {active && (
                  <div className="hidden lg:block ml-auto w-1 h-4 rounded-full bg-accent-cyan" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-surface-700">
          <div className="hidden lg:flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center text-accent-cyan text-xs font-display font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-xs text-text-secondary truncate max-w-[90px]">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/5 transition-all"
          >
            <LogOut size={16} className="shrink-0" />
            <span className="hidden lg:block text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-surface-700 flex items-center justify-between px-4 lg:px-6 bg-surface-800/50 backdrop-blur-sm shrink-0">
          <div className="text-sm text-text-secondary font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button className="w-8 h-8 rounded-lg border border-surface-600 flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent-cyan/40 transition-all">
                <Bell size={14} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-cyan text-surface-900 text-[9px] font-mono font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
            {notifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="card border-accent-amber/30 bg-surface-800 animate-slide-in flex items-start gap-3 shadow-lg"
              >
                <Bell size={14} className="text-accent-amber mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-accent-amber font-semibold">{n.ticker}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-text-muted hover:text-text-primary text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 min-h-full">
            <Outlet />
          </div>
          {/* Global disclaimer */}
          <footer className="px-4 lg:px-6 py-3 border-t border-surface-700/50 text-center">
            <p className="text-xs text-text-muted">
              ⚠️ For informational purposes only. Not financial advice.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
