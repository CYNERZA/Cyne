import { Text, Box } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { processManager, ProcessInfo } from '../../services/processManager'

const inputSchema = z.strictObject({
  ProcessID: z.string().describe('Process ID (command ID) of the terminal to read.'),
  Name: z.string().optional().describe('Optional name for the terminal.'),
})

type Out = {
  processId: string
  name: string
  status: 'running' | 'done' | 'error' | 'not_found'
  stdout: string
  stderr: string
  lines: number
  exitCode: number | null
  duration: number | null
}

export const ReadTerminalTool = {
  name: 'read_terminal',
  async description() {
    return 'Reads the full contents and state of a terminal/process by its command ID. Returns stdout, stderr, status, and exit code.'
  },
  async prompt() {
    return `# read_terminal Tool

Read the full contents and state of a terminal by its process/command ID.

**Use Cases:**
- Get complete terminal output (stdout + stderr)
- Check if a background command is still running
- See exit code and duration

**IMPORTANT:**
- ProcessID is the command ID returned from run_command
- Returns both stdout and stderr
- Check status: running, done, error, or not_found`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'Read Terminal'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return false
  },
  renderToolUseMessage({ ProcessID, Name }) {
    return `📖 Read terminal ${Name || ProcessID.slice(0, 8)}`
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
            {statusIcons[output.status]} {output.name || output.processId.slice(0, 8)}
          </Text>
          <Text color="dim"> - {output.status} ({output.lines} lines)</Text>
          {output.exitCode !== null && (
            <Text color={output.exitCode === 0 ? 'green' : 'red'}> [exit: {output.exitCode}]</Text>
          )}
        </Text>
        
        {output.stdout && verbose && (
          <Box marginTop={1} flexDirection="column">
            <Text color="dim">Output:</Text>
            <Text>{output.stdout.slice(-500)}</Text>
          </Box>
        )}
        
        {output.stderr && (
          <Box marginTop={1}>
            <Text color="red">{output.stderr.slice(-200)}</Text>
          </Box>
        )}
      </Box>
    )
  },
  async validateInput({ ProcessID }) {
    if (!ProcessID || ProcessID.trim() === '') {
      return {
        result: false,
        message: 'ProcessID is required',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ ProcessID, Name }) {
    const processInfo = processManager.getProcess(ProcessID)

    if (!processInfo) {
      const data: Out = {
        processId: ProcessID,
        name: Name || ProcessID,
        status: 'not_found',
        stdout: '',
        stderr: '',
        lines: 0,
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

    // Count lines
    const stdoutLines = processInfo.stdout.split('\n').length
    const stderrLines = processInfo.stderr.split('\n').length
    const totalLines = stdoutLines + stderrLines

    // Calculate duration
    const duration = processInfo.endTime
      ? processInfo.endTime.getTime() - processInfo.startTime.getTime()
      : Date.now() - processInfo.startTime.getTime()

    const data: Out = {
      processId: ProcessID,
      name: Name || processInfo.command.slice(0, 30),
      status: processInfo.status,
      stdout: processInfo.stdout,
      stderr: processInfo.stderr,
      lines: totalLines,
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
    if (data.status === 'not_found') {
      return `Terminal ${data.processId}: not found`
    }

    let result = `Terminal ${data.name} (${data.processId})\n`
    result += `Status: ${data.status}`
    
    if (data.exitCode !== null) {
      result += ` (exit: ${data.exitCode})`
    }
    
    if (data.duration !== null) {
      result += ` [${(data.duration / 1000).toFixed(1)}s]`
    }
    
    result += `\nLines: ${data.lines}\n`

    if (data.stdout) {
      result += `\n--- STDOUT ---\n${data.stdout}\n`
    }

    if (data.stderr) {
      result += `\n--- STDERR ---\n${data.stderr}\n`
    }

    return result
  },
} satisfies Tool
