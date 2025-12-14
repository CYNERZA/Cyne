import { Box, Text } from 'ink'
import React from 'react'
import { getTheme } from '../utils/theme'
import { usePulse } from '../utils/animations'
import { getIcons } from '../utils/fonts'

export type BadgeStatus = 'success' | 'error' | 'warning' | 'info' | 'running' | 'pending' | 'completed'

interface StatusBadgeProps {
  status: BadgeStatus
  text?: string
  animate?: boolean
}

/**
 * Animated status badge with icons and colors
 */
export function StatusBadge({
  status,
  text,
  animate = true,
}: StatusBadgeProps): React.ReactElement {
  const theme = getTheme()
  const icons = getIcons()
  const pulseOpacity = usePulse(0.7, 1.0, theme.animations.medium)
  
  // Determine icon and color based on status
  const getStatusDisplay = (): { icon: string; color: string; label: string } => {
    switch (status) {
      case 'success':
      case 'completed':
        return { icon: icons.success, color: theme.success, label: text || 'Success' }
      case 'error':
        return { icon: icons.error, color: theme.error, label: text || 'Error' }
      case 'warning':
        return { icon: icons.warning, color: theme.warning, label: text || 'Warning' }
      case 'info':
        return { icon: icons.info, color: theme.accent.primary, label: text || 'Info' }
      case 'running':
        return { icon: '●', color: theme.status.running, label: text || 'Running' }
      case 'pending':
        return { icon: '○', color: theme.status.pending, label: text || 'Pending' }
      default:
        return { icon: '●', color: theme.text, label: text || status }
    }
  }

  const { icon, color, label } = getStatusDisplay()
  
  // Apply pulsing only for running/pending states
  const shouldPulse = animate && (status === 'running' || status === 'pending')
  const displayColor = shouldPulse
    ? `${color}${Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')}`
    : color

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={displayColor} bold>
        {icon}
      </Text>
      <Text color={displayColor}>
        {label}
      </Text>
    </Box>
  )
}
