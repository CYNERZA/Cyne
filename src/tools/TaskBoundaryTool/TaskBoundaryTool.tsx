import { Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'

const inputSchema = z.strictObject({
  TaskName: z.string().describe('Name of the task boundary. Should be human readable.'),
  Mode: z.enum(['PLANNING', 'EXECUTION', 'VERIFICATION']).describe('The agent focus mode.'),
  TaskSummary: z.string().describe('Concise summary of what has been accomplished throughout the entire task so far.'),
  TaskStatus: z.string().describe('Active status of the current action in the task.'),
  PredictedTaskSize: z.number().describe('Estimation of how many tool calls are needed to fulfill this task.'),
})

export const TaskBoundaryTool = {
  name: 'task_boundary',
  async description() {
    return 'Indicate the start of a task or make an update to the current task. Use this to track progress and give users visibility into your work.'
  },
  async prompt() {
    return `# task_boundary Tool

Use this tool to communicate progress through a structured task UI.

**Modes:**
- PLANNING: Research, understand requirements, design approach
- EXECUTION: Write code, make changes, implement design
- VERIFICATION: Test changes, run verification, validate correctness

**Parameters:**
- TaskName: Header of the UI block (e.g., "Planning Authentication")
- TaskSummary: Description of task progress
- TaskStatus: Current activity (what you WILL do next)
- Mode: Current work mode
- PredictedTaskSize: Estimated tool calls remaining

**IMPORTANT:**
- Call at start of each new task phase
- Update regularly to show progress
- Same TaskName = updates accumulate
- Different TaskName = new UI block`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'Task Boundary'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return false
  },
  renderToolUseMessage({ TaskName, Mode }) {
    return `${Mode}: ${TaskName}`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output) {
    return <Text>&nbsp;&nbsp;⎿ Task: {output.taskName} ({output.mode})</Text>
  },
  async validateInput() {
    return { result: true, message: 'Valid input' }
  },
  async *call({ TaskName, Mode, TaskSummary, TaskStatus, PredictedTaskSize }) {
    const data = {
      taskName: TaskName,
      mode: Mode,
      taskSummary: TaskSummary,
      taskStatus: TaskStatus,
      predictedTaskSize: PredictedTaskSize,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `Task: ${data.taskName}\nMode: ${data.mode}\nStatus: ${data.taskStatus}`
  },
} satisfies Tool
