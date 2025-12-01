// Tool result type for OpenAI
type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content: string | any[]
  is_error?: boolean
}
import { Box } from 'ink'
import * as React from 'react'
import { Tool } from '../../../Tool'
import { Message, UserMessage } from '../../../query'
import { useGetToolFromMessages } from './utils'
import { StatusBadge } from '../../StatusBadge'
import { useFadeIn } from '../../../utils/animations'
import { getTheme } from '../../../utils/theme'

type Props = {
  param: ToolResultBlockParam
  message: UserMessage
  messages: Message[]
  verbose: boolean
  tools: Tool[]
  width: number | string
}

export function UserToolSuccessMessage({
  param,
  message,
  messages,
  tools,
  verbose,
  width,
}: Props): React.ReactNode {
  const { tool } = useGetToolFromMessages(param.tool_use_id, tools, messages)
  const theme = getTheme()
  const fadeOpacity = useFadeIn(theme.animations.medium)

  return (
    // TODO: Distinguish UserMessage from UserToolResultMessage
    <Box flexDirection="column" width={width} opacity={fadeOpacity} gap={1}>
      <StatusBadge status="success" animate={false} />
      {tool.renderToolResultMessage?.(message.toolUseResult!.data as never, {
        verbose,
      })}
    </Box>
  )
}
