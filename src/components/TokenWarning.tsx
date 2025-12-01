import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../utils/theme'

interface TokenWarningProps {
  tokenUsage: number
}

const MAXIMUM_TOKENS = 190_000 // leave wiggle room for /compact
export const WARNING_LEVEL = MAXIMUM_TOKENS * 0.6 // 60%
export const WARNING_THRESHOLD = WARNING_LEVEL // backward compatibility
const CRITICAL_LEVEL = MAXIMUM_TOKENS * 0.8 // 80%

export function TokenWarning({ tokenUsage }: TokenWarningProps): React.ReactNode {
  const currentTheme = getTheme()

  if (tokenUsage < WARNING_LEVEL) {
    return null
  }

  const isCritical = tokenUsage >= CRITICAL_LEVEL
  const remainingPercentage = Math.max(0, 100 - Math.round((tokenUsage / MAXIMUM_TOKENS) * 100))

  return (
    <Box flexDirection="row">
      <Text color={isCritical ? currentTheme.error : currentTheme.warning}>
        Context low (
        {remainingPercentage}%
        remaining) &middot; Run /compact to compact & continue
      </Text>
    </Box>
  )
}
