import * as React from 'react'
import { Box, Text } from 'ink'

interface CostDisplayProps {
  costUSD: number
  durationMs: number
  debug: boolean
}

const COST_BOX_WIDTH = 23
const MILLISECONDS_TO_SECONDS = 1000

export function Cost(props: CostDisplayProps): React.ReactNode {
  const { costUSD, durationMs, debug } = props

  if (!debug) {
    return null
  }

  const timeInSeconds = (durationMs / MILLISECONDS_TO_SECONDS).toFixed(1)
  const formattedCost = costUSD.toFixed(4)
  
  return (
    <Box flexDirection="column" minWidth={COST_BOX_WIDTH} width={COST_BOX_WIDTH}>
      <Text dimColor>
        Cost: ${formattedCost} ({timeInSeconds}s)
      </Text>
    </Box>
  )
}
