// Tool result type for OpenAI
type ToolResultBlockParam = {
  type: 'tool_result'
  tool_use_id: string
  content: string | any[]
  is_error?: boolean
}
import * as React from 'react'
import { Tool } from '../../../Tool'
import { Message, UserMessage } from '../../../query'
import { CANCEL_MESSAGE, REJECT_MESSAGE } from '../../../utils/messages'
import { UserToolCanceledMessage } from './UserToolCanceledMessage'
import { UserToolErrorMessage } from './UserToolErrorMessage'
import { UserToolRejectMessage } from './UserToolRejectMessage'
import { UserToolSuccessMessage } from './UserToolSuccessMessage'

type Props = {
  param: ToolResultBlockParam
  message: UserMessage
  messages: Message[]
  tools: Tool[]
  verbose: boolean
  width: number | string
}

export function UserToolResultMessage({
  param,
  message,
  messages,
  tools,
  verbose,
  width,
}: Props): React.ReactNode {
  if (param.content === CANCEL_MESSAGE) {
    return <UserToolCanceledMessage />
  }

  if (param.content === REJECT_MESSAGE) {
    return (
      <UserToolRejectMessage
        toolUseID={param.tool_use_id}
        tools={tools}
        messages={messages}
        verbose={verbose}
      />
    )
  }

  if (param.is_error) {
    return <UserToolErrorMessage param={param} verbose={verbose} />
  }

  return (
    <UserToolSuccessMessage
      param={param}
      message={message}
      messages={messages}
      tools={tools}
      verbose={verbose}
      width={width}
    />
  )
}
