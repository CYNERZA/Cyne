import * as React from 'react'
import { captureException } from '../services/sentry'

interface ErrorHandlerProps {
  children: React.ReactNode
}

interface ErrorHandlerState {
  hasError: boolean
}

export class SentryErrorBoundary extends React.Component<ErrorHandlerProps, ErrorHandlerState> {
  constructor(componentProps: ErrorHandlerProps) {
    super(componentProps)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorHandlerState {
    return { hasError: true }
  }

  componentDidCatch(thrownError: Error): void {
    captureException(thrownError)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
