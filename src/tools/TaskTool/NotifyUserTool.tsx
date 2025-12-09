import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { isVSCodeConnected } from '../../services/vscodeSocket'

export const inputSchema = z.strictObject({
  message: z.string().describe('Message to send to the user'),
  blocked_on_user: z.boolean().optional().describe('Whether you are blocked waiting for user input'),
  paths_to_review: z.array(z.string()).optional().describe('File paths for user to review')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  message: string
  blockedOnUser: boolean
  pathsToReview: string[]
}

export const NotifyUserTool = {
  name: 'NotifyUser',
  async description() {
    return 'Send a message or notification to the user - use this to communicate progress, ask questions, or request reviews'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: () => 'Notify User',
  
  async isEnabled() {
    return true  // Always enabled
  },
  
  needsPermissions() {
    return false
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.message) {
      return { result: false, message: 'message is required' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Send a notification or message to the user.

Parameters:
- message: The message to display (required)
- blocked_on_user: Set true if waiting for user approval (optional)
- paths_to_review: List of file paths for user to review (optional)

Use this to communicate progress, ask questions, or request file reviews.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    if (input.blocked_on_user) {
      return '⏳ Waiting for user input...'
    }
    return '💬 Notifying user...'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Notification cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" paddingX={1}>
        <Text bold color="blue">💬 Notification</Text>
        <Text>{result.message}</Text>
        {result.pathsToReview.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Files to Review:</Text>
            {result.pathsToReview.map((p, i) => (
              <Text key={i} color="cyan">  📄 {p}</Text>
            ))}
          </Box>
        )}
        {result.blockedOnUser && (
          <Text color="yellow" bold>⏳ Waiting for your response...</Text>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    let result = `Notification sent:
${data.message}`
    
    if (data.pathsToReview.length > 0) {
      result += `\n\nFiles for review:\n${data.pathsToReview.map(p => `- ${p}`).join('\n')}`
    }
    
    if (data.blockedOnUser) {
      result += '\n\n⏳ Waiting for user response before continuing.'
    }
    
    return result
  },
  
  async *call(input: In, context: any) {
    const result: Out = {
      message: input.message,
      blockedOnUser: input.blocked_on_user || false,
      pathsToReview: input.paths_to_review || []
    }
    
    // If VS Code is connected, show notification there too
    if (isVSCodeConnected()) {
      try {
        const { sendRequest } = await import('../../services/vscodeSocket')
        // Could add a notification RPC in VS Code extension
      } catch {
        // Ignore VS Code errors
      }
    }
    
    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result)
    }
  }
} satisfies Tool<In, Out>
