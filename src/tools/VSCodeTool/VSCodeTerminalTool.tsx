import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  command: z.string().describe('Command to execute in the terminal'),
  terminal_name: z.string().optional().describe('Named terminal to use (creates new if not found)'),
  focus: z.boolean().optional().describe('Focus the terminal after running command')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  success: boolean
  terminalName: string
  command: string
}

export const VSCodeTerminalTool = {
  name: 'VSCodeTerminal',
  async description() {
    return 'Execute a command in the VS Code integrated terminal'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: () => 'Run in Terminal',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions() {
    return true  // Executes commands
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.command) {
      return { result: false, message: 'command is required' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Execute a command in the VS Code integrated terminal.

Parameters:
- command: Command to execute (required)
- terminal_name: Named terminal to use (optional, creates new if not found)
- focus: Focus the terminal after running command (optional)

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `💻 Running: ${input.command.slice(0, 50)}${input.command.length > 50 ? '...' : ''}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Terminal command was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>
          ✅ Command sent to terminal "{result.terminalName}"
        </Text>
        {verbose && <Text color="dim">$ {result.command}</Text>}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `Terminal Command Result:
- Success: ${data.success}
- Terminal: ${data.terminalName}
- Command: ${data.command}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ success: boolean; terminalName: string }>('terminal/execute', {
        command: input.command,
        terminalName: input.terminal_name,
        focus: input.focus
      })
      
      const result: Out = {
        success: response.success,
        terminalName: response.terminalName,
        command: input.command
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error')
    }
  }
} satisfies Tool<In, Out>
