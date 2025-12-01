import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { PersistentShell } from '../../utils/PersistentShell'
import BashToolResultMessage from '../BashTool/BashToolResultMessage'
import { formatOutput } from '../BashTool/utils'
import { randomUUID } from 'crypto'

const inputSchema = z.strictObject({
  CommandLine: z.string().describe('The exact command line string to execute.'),
  Cwd: z.string().describe('The current working directory for the command'),
  SafeToAutoRun: z.boolean().describe('Set to true if this command is safe to run WITHOUT user approval. Only set to true for non-destructive commands.'),
  WaitMsBeforeAsync: z.number().describe('Milliseconds to wait before sending to background. Use large value for sync execution, small value (500ms) for async.'),
})

type Out = {
  stdout: string
  stdoutLines: number
  stderr: string
  stderrLines: number
  interrupted: boolean
  commandId?: string
}

export const RunCommandTool = {
  name: 'run_command',
  async description() {
    return 'PROPOSE a command to run on behalf of the user. Operating System: linux. Shell: bash. Note that the user will have to approve the command before it is executed unless SafeToAutoRun is true. If the step returns a command id, it means that the command was sent to the background.'
  },
  async prompt() {
    return `# run_command Tool

Use this tool to propose commands to run on the user's system.

**Safety:**
- User must approve commands (unless SafeToAutoRun=true)
- SafeToAutoRun should ONLY be true for read-only, non-destructive commands
- NEVER set SafeToAutoRun=true for commands that modify state

**Execution:**
- Commands run with PAGER=cat
- Use WaitMsBeforeAsync to control sync/async execution
- Small values (500ms) for background tasks
- Large values (10000ms) for synchronous completion

**IMPORTANT:** 
- Never use cd commands
- Always specify absolute Cwd
- Check command safety before setting SafeToAutoRun=true`
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
    return CommandLine
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(content, { verbose }) {
    return <BashToolResultMessage content={content} verbose={verbose} />
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
    { CommandLine, WaitMsBeforeAsync = 5000 },
    { abortController },
  ) {
    let stdout = ''
    let stderr = ''
    const commandId = randomUUID()

    const result = await PersistentShell.getInstance().exec(
      CommandLine,
      abortController.signal,
      WaitMsBeforeAsync,
    )
    
    stdout += (result.stdout || '').trim() + '\n'
    stderr += (result.stderr || '').trim() + '\n'
    if (result.code !== 0) {
      stderr += `Exit code ${result.code}`
    }

    const { totalLines: stdoutLines, truncatedContent: stdoutContent } =
      formatOutput(stdout.trim())
    const { totalLines: stderrLines, truncatedContent: stderrContent } =
      formatOutput(stderr.trim())

    const data: Out = {
      stdout: stdoutContent,
      stdoutLines,
      stderr: stderrContent,
      stderrLines,
      interrupted: result.interrupted,
      commandId: WaitMsBeforeAsync < 1000 ? commandId : undefined,
    }

    yield {
      type: 'result',
      resultForAssistant: this.renderResultForAssistant(data),
      data,
    }
    return data
  },
  renderResultForAssistant({ interrupted, stdout, stderr, commandId }) {
    let result = ''
    if (commandId) {
      result += `Command ID: ${commandId}\n`
    }
    let errorMessage = stderr.trim()
    if (interrupted) {
      if (stderr) errorMessage += '\n'
      errorMessage += '<error>Command was aborted before completion</error>'
    }
    const hasBoth = stdout.trim() && errorMessage
    result += `${stdout.trim()}${hasBoth ? '\n' : ''}${errorMessage.trim()}`
    return result
  },
} satisfies Tool
