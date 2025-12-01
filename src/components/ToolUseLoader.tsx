import { Box, Text } from 'ink'
import React from 'react'
import { useInterval } from '../hooks/useInterval'
import { getTheme } from '../utils/theme'
import { BLACK_CIRCLE } from '../constants/figures'

interface ToolUseLoaderProps {
  isError: boolean
  isUnresolved: boolean
  shouldAnimate: boolean
}

const ANIMATION_INTERVAL = 600
const LOADER_WIDTH = 2

export function ToolUseLoader({
  isError,
  isUnresolved,
  shouldAnimate,
}: ToolUseLoaderProps): React.ReactNode {
  const [isLoaderVisible, setIsLoaderVisible] = React.useState(true)

  useInterval(() => {
    if (!shouldAnimate) {
      return
    }
    // To avoid flickering when the tool use confirm is visible, we set the loader to be visible
    // when the tool use confirm is visible.
    setIsLoaderVisible(previousState => !previousState)
  }, ANIMATION_INTERVAL)

  const displayColor = isUnresolved
    ? getTheme().secondaryText
    : isError
      ? getTheme().error
      : getTheme().success

  const displayContent = isLoaderVisible ? BLACK_CIRCLE : '  '

  return (
    <Box minWidth={LOADER_WIDTH}>
      <Text color={displayColor}>{displayContent}</Text>
    </Box>
  )
}
