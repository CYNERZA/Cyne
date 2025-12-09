import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { setTaskBoundary, getCurrentTask, clearTask, writeBrainDoc } from '../../services/brain'
import { isVSCodeConnected } from '../../services/vscodeSocket'

export const inputSchema = z.strictObject({
  task_name: z.string().describe('Name of the current task'),
  mode: z.enum(['PLANNING', 'EXECUTION', 'VERIFICATION']).describe('Current task mode'),
  status: z.string().describe('What you are about to do next'),
  summary: z.string().describe('Summary of what has been accomplished so far')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  taskName: string
  mode: string
  status: string
  summary: string
  duration?: string
}

export const TaskBoundaryTool = {
  name: 'TaskBoundary',
  async description() {
    return 'Set or update the current task boundary - tracks planning, execution, and verification phases'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: (input?: In) => input ? `Task: ${input.task_name}` : 'Set Task Boundary',
  
  async isEnabled() {
    return true  // Always enabled, works without VS Code
  },
  
  needsPermissions() {
    return false
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.task_name) {
      return { result: false, message: 'task_name is required' }
    }
    if (!input.mode) {
      return { result: false, message: 'mode is required' }
    }
    if (!input.status) {
      return { result: false, message: 'status is required' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Set or update the current task boundary.

Parameters:
- task_name: Name of the current task (required)
- mode: PLANNING | EXECUTION | VERIFICATION (required)
- status: What you are about to do next (required)
- summary: Summary of what has been accomplished (required)

This tool tracks your progress through complex tasks.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    const modeIcons: Record<string, string> = {
      PLANNING: '📋',
      EXECUTION: '⚡',
      VERIFICATION: '✅'
    }
    return `${modeIcons[input.mode] || '📋'} ${input.mode}: ${input.task_name}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Task boundary update cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    const modeColors: Record<string, string> = {
      PLANNING: 'cyan',
      EXECUTION: 'yellow',
      VERIFICATION: 'green'
    }
    const modeIcons: Record<string, string> = {
      PLANNING: '📋',
      EXECUTION: '⚡',
      VERIFICATION: '✅'
    }
    
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={modeColors[result.mode] || 'white'} paddingX={1}>
        <Text bold color={modeColors[result.mode]}>
          {modeIcons[result.mode]} {result.mode}: {result.taskName}
        </Text>
        <Text color="dim">Status: {result.status}</Text>
        {verbose && result.summary && (
          <Box marginTop={1}>
            <Text>{result.summary}</Text>
          </Box>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `Task Boundary Updated:
- Task: ${data.taskName}
- Mode: ${data.mode}
- Status: ${data.status}
- Summary: ${data.summary}`
  },
  
  async *call(input: In, context: any) {
    // Update task state
    const task = setTaskBoundary({
      name: input.task_name,
      mode: input.mode,
      status: input.status,
      summary: input.summary
    })
    
    // If VS Code is connected, try to open brain panel
    if (isVSCodeConnected()) {
      try {
        const { sendRequest } = await import('../../services/vscodeSocket')
        await sendRequest('brain/open', { docType: 'task' })
      } catch {
        // Ignore VS Code errors
      }
    }
    
    const result: Out = {
      taskName: task.name,
      mode: task.mode,
      status: task.status,
      summary: task.summary
    }
    
    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result)
    }
  }
} satisfies Tool<In, Out>
