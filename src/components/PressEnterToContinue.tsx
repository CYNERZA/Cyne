import * as React from 'react'
import { getTheme } from '../utils/theme'
import { Text } from 'ink'

export function PressEnterToContinue(): React.ReactNode {
  const currentTheme = getTheme()
  
  return (
    <Text color={currentTheme.permission}>
      Press <Text bold>Enter</Text> to continue…
    </Text>
  )
}
