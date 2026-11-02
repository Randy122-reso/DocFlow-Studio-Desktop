import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('DocFlow renderer error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <span className="crash-mark">DF</span>
          <h1>DocFlow Studio hit an unexpected error</h1>
          <p>Your draft is saved automatically. Reload the window to continue.</p>
          <pre>{this.state.error.message}</pre>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>
            <RefreshCw size={15} /> Reload window
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
