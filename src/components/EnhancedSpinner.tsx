import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useMemo } from 'react'
import { getTheme } from '../utils/theme'
import { usePulse } from '../utils/animations'

type SpinnerType = 'dots' | 'line' | 'arc' | 'circle'
type SpinnerStatus = 'running' | 'success' | 'error' | 'pending'

interface EnhancedSpinnerProps {
  type?: SpinnerType
  status?: SpinnerStatus
  text?: string
  size?: 'small' | 'medium' | 'large'
}

export function EnhancedSpinner({
  type = 'dots',
  status = 'running',
  text,
  size = 'medium',
}: EnhancedSpinnerProps): React.ReactElement {
  const theme = getTheme()
  const pulseOpacity = usePulse(0.6, 1.0, theme.animations.slow)
  
  // Determine color based on status
  const statusColor = useMemo(() => {
    switch (status) {
      case 'running':
        return theme.status.running
      case 'success':
        return theme.status.completed
      case 'error':
        return theme.error
      case 'pending':
        return theme.status.pending
      default:
        return theme.accent.primary
    }
  }, [status, theme])

  // Status icon
  const statusIcon = useMemo(() => {
    switch (status) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      case 'pending':
        return '⏸'
      default:
        return null
    }
  }, [status])

  // Apply pulsing effect only for running status
  const spinnerColor = status === 'running' 
    ? `${statusColor}${Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')}`
    : statusColor

  return (
    <Box flexDirection="row" gap={1

}>
      {statusIcon ? (
        <Text color={statusColor} bold>
          {statusIcon}
        </Text>
      ) : (
        <Text color={spinnerColor}>
          <Spinner type={type} />
        </Text>
      )}
      {text && (
        <Text color={theme.text} dimColor={status === 'pending'}>
          {text}
        </Text>
      )}
    </Box>
  )
}
