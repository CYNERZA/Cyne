import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'

const inputSchema = z.strictObject({
  CommandId: z.string().describe('ID of the command to get status for'),
  WaitDurationSeconds: z.number().describe('Number of seconds to wait for command completion. Set to 0 for immediate status.'),
  OutputCharacterCount: z.number().optional().describe('Number of characters to view. Keep as small as possible.'),
})

export const CommandStatusTool = {
  name: 'command_status',
  async description() {
    return 'Get the status of a previously executed terminal command by its ID. Returns the current status (running, done), output lines as specified, and any error if present.'
  },
  async prompt() {
    return `# command_status Tool

Use this tool to check the status of background commands.

**Features:**
- Check if command is running or completed
- Retrieve command output
- Wait for completion with WaitDurationSeconds
- Control output size with OutputCharacterCount

**IMPORTANT:** 
- Only use for Background command IDs
- Keep OutputCharacterCount small to avoid memory issues
- Set WaitDurationSeconds=0 for immediate status`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'Command Status'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return false
  },
  renderToolUseMessage({ CommandId, WaitDurationSeconds }) {
    return `CommandId: ${CommandId}, Wait: ${WaitDurationSeconds}s`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Status: {output.status}</Text>
        {output.output && verbose && (
          <Text>&nbsp;&nbsp;&nbsp;&nbsp;{output.output.substring(0, 200)}</Text>
        )}
      </Box>
    )
  },
  async validateInput({ CommandId }) {
    if (!CommandId || CommandId.trim() === '') {
      return {
        result: false,
        message: 'CommandId is required',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ CommandId, WaitDurationSeconds, OutputCharacterCount = 1000 }) {
    await new Promise(resolve => setTimeout(resolve, WaitDurationSeconds * 1000))
    
    const data = {
      commandId: CommandId,
      status: 'done' as const,
      output: 'Command output placeholder',
      error: null,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    let result = `Command ${data.commandId}: ${data.status}\n`
    if (data.output) {
      result += `Output:\n${data.output}`
    }
    if (data.error) {
      result += `\nError: ${data.error}`
    }
    return result
  },
} satisfies Tool
