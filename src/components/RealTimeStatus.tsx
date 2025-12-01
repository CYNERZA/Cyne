import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'
import { getTheme } from '../utils/theme'
import { usePulse } from '../utils/animations'

interface RealTimeStatusProps {
  activeTools?: number
  messageCount?: number
  sessionDuration?: number
  status?: 'ready' | 'active' | 'error'
}

export function RealTimeStatus({
  activeTools = 0,
  messageCount = 0,
  sessionDuration = 0,
  status = 'ready',
}: RealTimeStatusProps): React.ReactElement {
  const theme = getTheme()
  const [liveTime, setLiveTime] = useState(sessionDuration)
  const pulseOpacity = usePulse(0.6, 1.0, theme.animations.medium)

  // Live session time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Status indicator config
  const statusConfig = {
    ready: { icon: '⚡', color: theme.accent.primary, label: 'Ready' },
    active: { icon: '🔄', color: theme.status.running, label: 'Active' },
    error: { icon: '✗', color: theme.error, label: 'Error' },
  }

  const { icon, color, label } = statusConfig[status]
  const shouldPulse = status === 'active'

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Box gap={3} paddingX={1}>
      {/* Status */}
      <Box gap={1}>
        <Text color={color} opacity={shouldPulse ? pulseOpacity : 1}>
          {icon}
        </Text>
        <Text color={color}>{label}</Text>
      </Box>

      <Text dimColor>│</Text>

      {/* Active Tools */}
      <Box gap={1}>
        <Text>🔧</Text>
        <Text>
          <Text dimColor>Tools:</Text> {activeTools}
        </Text>
      </Box>

      <Text dimColor>│</Text>

      {/* Messages */}
      <Box gap={1}>
        <Text>💬</Text>
        <Text>
          <Text dimColor>Messages:</Text> {messageCount}
        </Text>
      </Box>

      <Text dimColor>│</Text>

      {/* Session Time */}
      <Box gap={1}>
        <Text>⏱</Text>
        <Text>
          <Text dimColor>Time:</Text> {formatTime(liveTime)}
        </Text>
      </Box>
    </Box>
  )
}
