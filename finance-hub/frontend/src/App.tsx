import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MarketMonitor from './pages/MarketMonitor'
import StockComparator from './pages/StockComparator'
import PricePredictor from './pages/PricePredictor'
import TradingStrategies from './pages/TradingStrategies'
import Portfolio from './pages/Portfolio'
import Login from './pages/Login'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './store/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="market" element={<MarketMonitor />} />
            <Route path="compare" element={<StockComparator />} />
            <Route path="predict" element={<PricePredictor />} />
            <Route path="strategies" element={<TradingStrategies />} />
            <Route path="portfolio" element={<Portfolio />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
