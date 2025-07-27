import { z } from 'zod'
import { Text } from 'ink'
import * as React from 'react'

const inputSchema = z.object({
  task_id: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
})

export const UpdateTodoTool = {
  name: 'UpdateTodo',
  userFacingName: () => 'Update Todo',
  description: 'Update task status',
  inputSchema,
  isReadOnly: () => false,
  isEnabled: async () => true,
  prompt: async () => 'Update task status',

  renderToolUseMessage(input) {
    return `${input.task_id}: ${input.status}`
  },

  renderToolResultMessage() {
    return <Text>✓ Updated</Text>
  },

  renderToolUseRejectedMessage() {
    return <Text>Rejected</Text>
  },

  async *call(input) {
    yield {
      type: 'result',
      content: `${input.task_id} → ${input.status}`,
    }
  },
}
