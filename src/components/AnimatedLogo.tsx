import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'
import { getTheme } from '../utils/theme'
import { useTypewriter, usePulse, useGradientCycle } from '../utils/animations'

export type LogoState = 'startup' | 'idle' | 'active' | 'success' | 'error'

interface AnimatedLogoProps {
  state?: LogoState
  size?: 'small' | 'medium' | 'large'
  showVersion?: boolean
}

const LOGO_ASCII = {
  small: [
    '  ██████╗██╗   ██╗███╗   ██╗███████╗',
    ' ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝',
    ' ██║      ╚████╔╝ ██╔██╗ ██║█████╗  ',
    ' ██║       ╚██╔╝  ██║╚██╗██║██╔══╝  ',
    ' ╚██████╗   ██║   ██║ ╚████║███████╗',
    '  ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝',
  ],
  medium: [
    '   ██████╗██╗   ██╗███╗   ██╗███████╗',
    '  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝',
    '  ██║      ╚████╔╝ ██╔██╗ ██║█████╗  ',
    '  ██║       ╚██╔╝  ██║╚██╗██║██╔══╝  ',
    '  ╚██████╗   ██║   ██║ ╚████║███████╗',
    '   ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝',
  ],
  large: [
    '    ██████╗██╗   ██╗███╗   ██╗███████╗',
    '   ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝',
    '   ██║      ╚████╔╝ ██╔██╗ ██║█████╗  ',
    '   ██║       ╚██╔╝  ██║╚██╗██║██╔══╝  ',
    '   ╚██████╗   ██║   ██║ ╚████║███████╗',
    '    ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝',
  ],
}

export function AnimatedLogo({
  state = 'idle',
  size = 'medium',
  showVersion = false,
}: AnimatedLogoProps): React.ReactElement {
  const theme = getTheme()
  const [revealed, setRevealed] = useState(state !== 'startup')
  
  // Animation hooks
  const pulseOpacity = usePulse(0.7, 1.0, theme.animations.slow)
  const logo = LOGO_ASCII[size]
  const fullLogoText = logo.join('\n')
  
  // Typewriter reveal for startup state
  const revealedText = useTypewriter(
    fullLogoText,
    100, // 100 characters per second
    state === 'startup' && !revealed
  )

  // Gradient cycling
  const gradientColors = useGradientCycle(
    getColorsForState(state, theme),
    theme.animations.slow * 2
  )

  // Mark as revealed after typewriter completes
  useEffect(() => {
    if (state === 'startup' && revealedText === fullLogoText) {
      setTimeout(() => setRevealed(true), 200)
    }
  }, [revealedText, fullLogoText, state])

  // Determine which text to show
  const displayText = state === 'startup' && !revealed ? revealedText : fullLogoText
  const lines = displayText.split('\n')

  // Apply pulsing only for certain states
  const shouldPulse = state === 'active' || state === 'error'
  const opacity = shouldPulse ? pulseOpacity : 1.0

  // Primary color based on state
  const primaryColor = gradientColors[0]

  return (
    <Box flexDirection="column" alignItems="center">
      <Box flexDirection="column" opacity={opacity}>
        {lines.map((line, index) => (
          <Box key={index}>
            <Text color={primaryColor} bold>
              {line}
            </Text>
          </Box>
        ))}
      </Box>
      {showVersion && revealed && (
        <Box marginTop={1}>
          <Text dimColor>AI Development Suite v0.0.13-beta</Text>
        </Box>
      )}
      {state === 'active' && revealed && (
        <Box marginTop={1}>
          <Text color={theme.status.running}>⚡ Processing...</Text>
        </Box>
      )}
      {state === 'success' && revealed && (
        <Box marginTop={1}>
          <Text color={theme.success}>✓ Ready</Text>
        </Box>
      )}
      {state === 'error' && revealed && (
        <Box marginTop={1}>
          <Text color={theme.error}>✗ Error</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Get color palette based on logo state
 */
function getColorsForState(state: LogoState, theme: ReturnType<typeof getTheme>): string[] {
  switch (state) {
    case 'startup':
      return theme.gradients.info // Blue gradient for startup
    case 'active':
      return theme.gradients.primary // Cyan → purple → magenta for activity
    case 'success':
      return theme.gradients.success // Green gradient
    case 'error':
      return theme.gradients.error // Red gradient
    case 'idle':
    default:
      return theme.gradients.border // Cyan → aqua for idle state
  }
}
