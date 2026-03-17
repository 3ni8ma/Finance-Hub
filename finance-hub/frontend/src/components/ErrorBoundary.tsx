import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex items-center justify-center h-screen bg-surface-900">
        <div className="card max-w-md text-center space-y-4">
          <AlertTriangle size={40} className="text-accent-red mx-auto" />
          <h2 className="font-display font-bold text-text-primary text-xl">Something went wrong</h2>
          <p className="text-text-secondary text-sm">{this.state.error?.message}</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }
}
