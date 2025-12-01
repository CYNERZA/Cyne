import { Box, Text } from 'ink'
import React, { ReactNode } from 'react'
import { getTheme } from '../utils/theme'
import { useGradientCycle } from '../utils/animations'

interface GradientBorderProps {
  children: ReactNode
  borderStyle?: 'single' | 'double' | 'round' | 'classic'
  gradientType?: 'primary' | 'success' | 'error' | 'info' | 'border'
  animate?: boolean
  paddingX?: number
  paddingY?: number
}

/**
 * Component that renders a box with gradient-colored borders
 * Uses the theme's gradient definitions for coloring
 */
export function GradientBorder({
  children,
  borderStyle = 'round',
  gradientType = 'primary',
  animate = true,
  paddingX = 1,
  paddingY = 0,
}: GradientBorderProps): React.ReactElement {
  const theme = getTheme()
  const baseGradient = theme.gradients[gradientType]
  
  // Cycle through gradient colors if animation is enabled
  const gradientColors = useGradientCycle(
    baseGradient,
    animate ? theme.animations.slow * 2 : 0,
  )
  
  // Use the first color in the gradient for the border
  // In terminals,we can't do true gradients on borders, but we can cycle the color
  const borderColor = animate ? gradientColors[0] : baseGradient[0]

  return (
    <Box
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={paddingX}
      paddingY={paddingY}
      flexDirection="column"
    >
      {children}
    </Box>
  )
}
