// Tool result type for OpenAI
type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content: string | any[]
  is_error?: boolean
}
import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../../../utils/theme'
import { StatusBadge } from '../../StatusBadge'
import { useFadeIn } from '../../../utils/animations'

const MAX_RENDERED_LINES = 10

type Props = {
  param: ToolResultBlockParam
  verbose: boolean
}

export function UserToolErrorMessage({
  param,
  verbose,
}: Props): React.ReactNode {
  const theme = getTheme()
  const fadeOpacity = useFadeIn(theme.animations.medium)
  const error =
    typeof param.content === 'string' ? param.content.trim() : 'Error'
  return (
    <Box flexDirection="column" width="100%" opacity={fadeOpacity} gap={1}>
      <StatusBadge status="error" animate={false} />
      <Box flexDirection="row" width="100%">
        <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
        <Box flexDirection="column">
          <Text color={theme.error}>
            {verbose
              ? error
              : error.split('\n').slice(0, MAX_RENDERED_LINES).join('\n') || ''}
          </Text>
          {!verbose && error.split('\n').length > MAX_RENDERED_LINES && (
            <Text color={theme.secondaryText}>
              ... (+{error.split('\n').length - MAX_RENDERED_LINES} lines)
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  )
}
