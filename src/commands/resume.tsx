import * as React from 'react'
import type { Command } from '../commands'
import { ResumeConversation } from '../screens/ResumeConversation'
import { render } from 'ink'
import { CACHE_PATHS, loadLogList } from '../utils/log'

const resumeCommand: Command = {
  type: 'local-jsx',
  name: 'resume',
  description: 'Resume a previous conversation',
  isEnabled: true,
  isHidden: false,
  userFacingName(): string {
    return 'resume'
  },
  async call(
    onDone: () => void, 
    { options: { commands, tools, verbose } }: any
  ): Promise<null> {
    const conversationLogs = await loadLogList(CACHE_PATHS.messages())
    
    render(
      <ResumeConversation
        commands={commands}
        context={{ unmount: onDone }}
        logs={conversationLogs}
        tools={tools}
        verbose={verbose}
      />
    )
    
    return null
  },
}

export default resumeCommand
