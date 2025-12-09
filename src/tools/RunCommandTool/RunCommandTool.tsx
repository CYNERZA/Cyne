import { Box, Text, Static } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { processManager, ProcessInfo } from '../../services/processManager'
import { getCwd } from '../../utils/state'

const inputSchema = z.strictObject({
  CommandLine: z.string().describe('The exact command line string to execute.'),
  Cwd: z.string().optional().describe('The current working directory for the command. Defaults to project root.'),
  SafeToAutoRun: z.boolean().describe('Set to true if this command is safe to run WITHOUT user approval. Only set to true for non-destructive commands.'),
  WaitMsBeforeAsync: z.number().optional().describe('Milliseconds to wait before sending to background. Default: 5000. Use 0 for immediate background, 60000 for synchronous.'),
})

type Out = {
  stdout: string
  stderr: string
  status: 'done' | 'running' | 'error'
  exitCode: number | null
  interrupted: boolean
  commandId?: string
  duration: number
}

export const RunCommandTool = {
  name: 'run_command',
  async description() {
    return 'Execute a shell command. User must approve unless SafeToAutoRun is true. Returns command ID for background processes that can be monitored with command_status.'
  },
  async prompt() {
    return `# run_command Tool

Execute shell commands on the user's system.

**Safety:**
- User must approve commands (unless SafeToAutoRun=true)
- SafeToAutoRun should ONLY be true for read-only, non-destructive commands
- NEVER set SafeToAutoRun=true for commands that modify state

**Execution:**
- Commands run with PAGER=cat (no paging)
- WaitMsBeforeAsync controls sync/async execution:
  - 0: Run in background immediately (returns commandId)
  - 5000: Wait 5 seconds, background if still running
  - 60000: Wait full minute for completion

**Background Commands:**
- Use command_status to check progress
- Use send_command_input to interact or terminate

**IMPORTANT:** 
- Never use cd commands (use Cwd parameter instead)
- Long-running commands automatically go to background`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'Run Command'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return true
  },
  renderToolUseMessage({ CommandLine }) {
    // Truncate long commands
    const display = CommandLine.length > 60 
      ? CommandLine.slice(0, 57) + '...' 
      : CommandLine
    return `⚡ ${display}`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(content: Out, { verbose }) {
    const statusColors: Record<string, string> = {
      running: 'yellow',
      done: 'green',
      error: 'red',
    }
    const statusIcons: Record<string, string> = {
      running: '⏳',
      done: '✅',
      error: '❌',
    }

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={statusColors[content.status]}>
            {statusIcons[content.status]} {content.status.toUpperCase()}
          </Text>
          {content.exitCode !== null && content.exitCode !== 0 && (
            <Text color="red"> (exit: {content.exitCode})</Text>
          )}
          <Text color="dim"> [{(content.duration / 1000).toFixed(1)}s]</Text>
        </Text>
        
        {content.commandId && (
          <Text color="cyan">Command ID: {content.commandId}</Text>
        )}
        
        {content.stdout && verbose && (
          <Box marginTop={1} flexDirection="column">
            <Text>{content.stdout.slice(-500)}</Text>
          </Box>
        )}
        
        {content.stderr && (
          <Box marginTop={1}>
            <Text color="red">{content.stderr.slice(-200)}</Text>
          </Box>
        )}
      </Box>
    )
  },
  async validateInput({ CommandLine }) {
    if (CommandLine.trim().startsWith('cd ')) {
      return {
        result: false,
        message: 'cd commands are not allowed. Use the Cwd parameter instead.',
      }
    }

    return { result: true, message: 'Valid command' }
  },
  async *call(
    { CommandLine, Cwd, SafeToAutoRun, WaitMsBeforeAsync = 5000 },
    { abortController },
  ) {
    const workingDir = Cwd || getCwd()
    const isBackground = WaitMsBeforeAsync < 1000

    // Execute command using ProcessManager
    const processInfo = await processManager.exec(CommandLine, workingDir, {
      timeout: WaitMsBeforeAsync,
      background: isBackground,
      onStdout: (data) => {
        // Could emit progress here for live streaming
      },
      onStderr: (data) => {
        // Could emit progress here for live streaming  
      },
    })

    // Calculate duration
    const duration = processInfo.endTime
      ? processInfo.endTime.getTime() - processInfo.startTime.getTime()
      : Date.now() - processInfo.startTime.getTime()

    // Truncate output for result
    const maxOutput = 4000
    const stdout = processInfo.stdout.slice(-maxOutput)
    const stderr = processInfo.stderr.slice(-maxOutput / 4)

    const data: Out = {
      stdout,
      stderr,
      status: processInfo.status,
      exitCode: processInfo.exitCode,
      interrupted: false,
      commandId: isBackground || processInfo.status === 'running' ? processInfo.id : undefined,
      duration,
    }

    yield {
      type: 'result',
      resultForAssistant: this.renderResultForAssistant(data),
      data,
    }
    return data
  },
  renderResultForAssistant({ interrupted, stdout, stderr, commandId, status, exitCode, duration }) {
    let result = ''
    
    if (commandId) {
      result += `Command ID: ${commandId}\nStatus: ${status}\n\n`
    }
    
    if (stdout.trim()) {
      result += `Output:\n${stdout.trim()}\n`
    }
    
    if (stderr.trim()) {
      result += `\nStderr:\n${stderr.trim()}\n`
    }
    
    if (exitCode !== null && exitCode !== 0) {
      result += `\nExit code: ${exitCode}`
    }
    
    if (interrupted) {
      result += '\n<error>Command was aborted before completion</error>'
    }
    
    return result || 'Command completed with no output'
  },
} satisfies Tool
