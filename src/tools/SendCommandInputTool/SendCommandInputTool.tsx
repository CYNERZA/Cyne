import { Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'

const inputSchema = z.strictObject({
  CommandId: z.string().describe('The command ID from a previous run_command call.'),
  Input: z.string().optional().describe('The input to send to the command stdin. Include newline characters if needed.'),
  Terminate: z.boolean().optional().describe('Whether to terminate the command. Exactly one of input and terminate must be specified.'),
})

export const SendCommandInputTool = {
  name: 'send_command_input',
  async description() {
    return 'Send standard input to a running command or to terminate a command. Use this to interact with REPLs, interactive commands, and long-running processes.'
  },
  async prompt() {
    return `# send_command_input Tool

Send input to running commands or terminate them.

**Use Cases:**
- Interact with REPLs
- Send data to interactive commands
- Terminate long-running processes

**IMPORTANT:**
- Must specify either Input OR Terminate (not both)
- Include newline characters in Input to submit commands
- CommandId must be from a previous run_command call`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'Send Command Input'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return false
  },
  renderToolUseMessage({ CommandId, Input, Terminate }) {
    if (Terminate) {
      return `Terminate ${CommandId}`
    }
    return `Send to ${CommandId}: ${Input?.substring(0, 50) || ''}`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output) {
    return <Text>&nbsp;&nbsp;⎿ {output.message}</Text>
  },
  async validateInput({ Input, Terminate }) {
    if ((Input && Terminate) || (!Input && !Terminate)) {
      return {
        result: false,
        message: 'Exactly one of Input and Terminate must be specified.',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ CommandId, Input, Terminate }) {
    const data = {
      commandId: CommandId,
      message: Terminate ? 'Command terminated' : 'Input sent',
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `${data.message} (Command ${data.commandId})`
  },
} satisfies Tool
