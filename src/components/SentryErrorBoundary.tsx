import * as React from 'react'
import { captureException } from '../services/sentry'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Using a class component since functional components don't support error boundaries
export class SentryErrorBoundary extends React.PureComponent<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public readonly state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  public componentDidCatch(caughtError: Error, errorDetails: React.ErrorInfo): void {
    // Log error to Sentry
    captureException(caughtError)
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      // Return null to render nothing when there's an error
      return null
    }

    // Render children normally when there's no error
    const { children } = this.props
    return children
  }
}
