import { Box, Text } from 'ink'
import React, { useState, useEffect, ReactNode } from 'react'
import { getTheme } from '../utils/theme'
import { useGradientCycle, usePulse } from '../utils/animations'

interface LiveWindowProps {
  title?: string
  status?: string
  showMetrics?: boolean
  children: ReactNode
  animated?: boolean
}

type BorderChar = {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  horizontal: string
  vertical: string
  crossLeft: string
  crossRight: string
  cross: string
}

const BORDER_STYLES: Record<string, BorderChar> = {
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    crossLeft: '╠',
    crossRight: '╣',
    cross: '╬',
  },
  round: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    crossLeft: '├',
    crossRight: '┤',
    cross: '┼',
  },
}

export function LiveWindow({
  title = 'CYNE',
  status = 'Ready',
  showMetrics = true,
  children,
  animated = true,
}: LiveWindowProps): React.ReactElement {
  const theme = getTheme()
  const [activeTools, setActiveTools] = useState(0)
  const [executionTime, setExecutionTime] = useState(0)
  
  // Border gradient cycling
  const borderColors = useGradientCycle(
    theme.gradients.border,
    animated ? theme.animations.slow * 3 : 0
  )
  
  // Status indicator pulse
  const statusPulse = usePulse(0.6, 1.0, theme.animations.medium)
  
  const borderStyle = BORDER_STYLES.double
  const borderColor = animated ? borderColors[0] : theme.accent.primary
  
  // Live execution time counter
  useEffect(() => {
    if (activeTools > 0) {
      const interval = setInterval(() => {
        setExecutionTime(t => t + 0.1)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setExecutionTime(0)
    }
  }, [activeTools])

  return (
    <Box flexDirection="column" width="100%">
      {/* Top border with title */}
      <Box>
        <Text color={borderColor}>{borderStyle.topLeft}</Text>
        <Text color={borderColor}>{borderStyle.horizontal.repeat(3)}</Text>
        <Text color={borderColor} bold> {title} </Text>
        <Text color={borderColor}>│</Text>
        <Text color={theme.accent.secondary} opacity={statusPulse}> {status} </Text>
        <Box flexGrow={1}>
          <Text color={borderColor}>{borderStyle.horizontal.repeat(50)}</Text>
        </Box>
        <Text color={borderColor}>{borderStyle.topRight}</Text>
      </Box>

      {/* Content area */}
      <Box>
        <Text color={borderColor}>{borderStyle.vertical}</Text>
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {children}
        </Box>
        <Text color={borderColor}>{borderStyle.vertical}</Text>
      </Box>

      {/* Metrics bar (if enabled) */}
      {showMetrics && (
        <>
          <Box>
            <Text color={borderColor}>{borderStyle.crossLeft}</Text>
            <Box flexGrow={1}>
              <Text color={borderColor}>{borderStyle.horizontal.repeat(100)}</Text>
            </Box>
            <Text color={borderColor}>{borderStyle.crossRight}</Text>
          </Box>
          <Box>
            <Text color={borderColor}>{borderStyle.vertical}</Text>
            <Box paddingX={1} gap={2}>
              <Text>
                {status === 'Ready' ? '⚡' : '🔄'}{' '}
                <Text color={theme.accent.primary}>{status}</Text>
              </Text>
              <Text>│</Text>
              <Text>
                🔧 <Text color={theme.text}>Tools: {activeTools}</Text>
              </Text>
              <Text>│</Text>
              <Text>
                ⏱ <Text color={theme.text}>{executionTime.toFixed(1)}s</Text>
              </Text>
            </Box>
            <Box flexGrow={1} />
            <Text color={borderColor}>{borderStyle.vertical}</Text>
          </Box>
        </>
      )}

      {/* Bottom border */}
      <Box>
        <Text color={borderColor}>{borderStyle.bottomLeft}</Text>
        <Box flexGrow={1}>
          <Text color={borderColor}>{borderStyle.horizontal.repeat(100)}</Text>
        </Box>
        <Text color={borderColor}>{borderStyle.bottomRight}</Text>
      </Box>
    </Box>
  )
}
