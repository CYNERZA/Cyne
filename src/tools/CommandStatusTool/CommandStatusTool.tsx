import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { processManager, ProcessInfo } from '../../services/processManager'

const inputSchema = z.strictObject({
  CommandId: z.string().describe('ID of the command to get status for'),
  WaitDurationSeconds: z.number().describe('Number of seconds to wait for command completion. Set to 0 for immediate status.'),
  OutputCharacterCount: z.number().optional().describe('Number of characters to view from the end of output. Keep as small as possible.'),
})

type Out = {
  commandId: string
  status: 'running' | 'done' | 'error' | 'not_found'
  output: string
  error: string | null
  exitCode: number | null
  duration: number | null
}

export const CommandStatusTool = {
  name: 'command_status',
  async description() {
    return 'Get the status of a previously executed terminal command by its ID. Returns the current status (running, done, error), output lines as specified, and any error if present.'
  },
  async prompt() {
    return `# command_status Tool

Use this tool to check the status of background commands.

**Features:**
- Check if command is running or completed
- Retrieve command output (stdout + stderr)
- Wait for completion with WaitDurationSeconds
- Control output size with OutputCharacterCount

**IMPORTANT:** 
- Only use for Background command IDs returned by run_command
- Keep OutputCharacterCount small to avoid memory issues
- Set WaitDurationSeconds=0 for immediate status
- Set WaitDurationSeconds=60 if you want to wait for completion`
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
    return `Checking command ${CommandId.slice(0, 8)}... (wait: ${WaitDurationSeconds}s)`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output: Out, { verbose }) {
    const statusColors: Record<string, string> = {
      running: 'yellow',
      done: 'green',
      error: 'red',
      not_found: 'gray',
    }
    const statusIcons: Record<string, string> = {
      running: '⏳',
      done: '✅',
      error: '❌',
      not_found: '❓',
    }
    
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={statusColors[output.status]}>
            {statusIcons[output.status]} {output.status.toUpperCase()}
          </Text>
          {output.exitCode !== null && (
            <Text color="dim"> (exit: {output.exitCode})</Text>
          )}
          {output.duration !== null && (
            <Text color="dim"> [{(output.duration / 1000).toFixed(1)}s]</Text>
          )}
        </Text>
        {output.output && verbose && (
          <Box marginTop={1} flexDirection="column">
            <Text color="dim">Output:</Text>
            <Text>{output.output.slice(-500)}</Text>
          </Box>
        )}
        {output.error && (
          <Text color="red">{output.error}</Text>
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
  async *call({ CommandId, WaitDurationSeconds, OutputCharacterCount = 2000 }) {
    let processInfo: ProcessInfo | null = processManager.getProcess(CommandId)

    // If process not found, return immediately
    if (!processInfo) {
      const data: Out = {
        commandId: CommandId,
        status: 'not_found',
        output: '',
        error: `No command found with ID: ${CommandId}`,
        exitCode: null,
        duration: null,
      }

      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    // Wait for completion if requested
    if (WaitDurationSeconds > 0 && processInfo.status === 'running') {
      processInfo = await processManager.waitForCompletion(
        CommandId,
        WaitDurationSeconds * 1000
      )
    }

    if (!processInfo) {
      const data: Out = {
        commandId: CommandId,
        status: 'not_found',
        output: '',
        error: `Process disappeared: ${CommandId}`,
        exitCode: null,
        duration: null,
      }

      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    // Get combined output, limited to OutputCharacterCount
    const combinedOutput = processInfo.stdout + 
      (processInfo.stderr ? `\n---STDERR---\n${processInfo.stderr}` : '')
    const output = combinedOutput.slice(-OutputCharacterCount)

    // Calculate duration
    const duration = processInfo.endTime
      ? processInfo.endTime.getTime() - processInfo.startTime.getTime()
      : Date.now() - processInfo.startTime.getTime()

    const data: Out = {
      commandId: CommandId,
      status: processInfo.status,
      output,
      error: processInfo.status === 'error' ? processInfo.stderr : null,
      exitCode: processInfo.exitCode,
      duration,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data: Out): string {
    let result = `Command ${data.commandId}: ${data.status}`
    
    if (data.exitCode !== null) {
      result += ` (exit code: ${data.exitCode})`
    }
    
    if (data.duration !== null) {
      result += ` [${(data.duration / 1000).toFixed(1)}s]`
    }
    
    result += '\n'
    
    if (data.output) {
      result += `Output:\n${data.output}`
    }
    
    if (data.error && data.status === 'error') {
      result += `\nError: ${data.error}`
    }
    
    return result
  },
} satisfies Tool
