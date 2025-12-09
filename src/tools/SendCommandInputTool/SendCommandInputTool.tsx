import { Text, Box } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { processManager } from '../../services/processManager'

const inputSchema = z.strictObject({
  CommandId: z.string().describe('The command ID from a previous run_command call.'),
  Input: z.string().optional().describe('The input to send to the command stdin. Include newline characters if needed.'),
  Terminate: z.boolean().optional().describe('Whether to terminate the command. Exactly one of input and terminate must be specified.'),
})

type Out = {
  commandId: string
  success: boolean
  message: string
  status?: string
}

export const SendCommandInputTool = {
  name: 'send_command_input',
  async description() {
    return 'Send standard input to a running command or to terminate a command. Use this to interact with REPLs, interactive commands, and long-running processes.'
  },
  async prompt() {
    return `# send_command_input Tool

Send input to running commands or terminate them.

**Use Cases:**
- Interact with REPLs (Python, Node, etc.)
- Answer prompts from commands
- Send data to interactive commands
- Terminate long-running processes

**IMPORTANT:**
- Must specify either Input OR Terminate (not both)
- Include newline characters in Input to submit commands
- CommandId must be from a previous run_command call
- Use command_status to check process state after sending input`
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
      return `🛑 Terminate ${CommandId.slice(0, 8)}`
    }
    const preview = Input?.replace(/\n/g, '↵').substring(0, 30) || ''
    return `⌨️ Send to ${CommandId.slice(0, 8)}: ${preview}`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output: Out, { verbose }) {
    const color = output.success ? 'green' : 'red'
    const icon = output.success ? '✅' : '❌'
    
    return (
      <Box flexDirection="column">
        <Text color={color}>{icon} {output.message}</Text>
        {output.status && (
          <Text color="dim">Process status: {output.status}</Text>
        )}
      </Box>
    )
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
    // Check if process exists
    const processInfo = processManager.getProcess(CommandId)
    
    if (!processInfo) {
      const data: Out = {
        commandId: CommandId,
        success: false,
        message: `No command found with ID: ${CommandId}`,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    // Check if process is still running
    if (processInfo.status !== 'running') {
      const data: Out = {
        commandId: CommandId,
        success: false,
        message: `Command is not running (status: ${processInfo.status})`,
        status: processInfo.status,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    let success = false
    let message = ''

    if (Terminate) {
      success = processManager.terminate(CommandId)
      message = success ? 'Command terminated' : 'Failed to terminate command'
    } else if (Input) {
      success = processManager.sendInput(CommandId, Input)
      message = success ? 'Input sent successfully' : 'Failed to send input'
    }

    const data: Out = {
      commandId: CommandId,
      success,
      message,
      status: processInfo.status,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data: Out): string {
    let result = `${data.success ? 'Success' : 'Failed'}: ${data.message}`
    result += ` (Command ${data.commandId})`
    if (data.status) {
      result += ` [status: ${data.status}]`
    }
    return result
  },
} satisfies Tool
