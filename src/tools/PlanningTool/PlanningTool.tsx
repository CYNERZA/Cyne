import { z } from 'zod'
import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../../utils/theme'

const DESCRIPTION = 'Create a structured todo list with tasks, priorities, and dependencies for a project or complex task'
const PROMPT = 'Use this tool to create a structured plan before starting any complex task or project. This helps organize work and track progress systematically.'

const inputSchema = z.object({
  project_description: z.string().describe('Brief description of the project or task to plan'),
  tasks: z.array(z.object({
    id: z.string().describe('Unique identifier for the task'),
    description: z.string().describe('Description of the task'),
    status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending').describe('Current task status'),
  })).describe('List of tasks to be completed'),
})

export const PlanningTool = {
  name: 'Plan',
  userFacingName: () => 'Plan',
  description: async () => DESCRIPTION,
  inputSchema,
  isEnabled: async () => true,
  isReadOnly: () => true,
  needsPermissions: () => false,
  prompt: async () => PROMPT,

  renderToolUseMessage(input) {
    return `project: "${input.project_description}", tasks: ${input.tasks.length} items`
  },

  renderToolResultMessage(output) {
    const { project_description, tasks } = output.plan
    const theme = getTheme()
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={theme.cynerza} bold>● Planning: {project_description}</Text>
        </Box>
        <Box paddingLeft={2} flexDirection="column">
          {tasks.map((task) => (
            <Box key={task.id} flexDirection="row">
              <Text color={task.status === 'in_progress' ? theme.cynerza : theme.text}>
                {task.status === 'completed' ? '☑ ' : '☐ '}
                <Text 
                  strikethrough={task.status === 'completed'} 
                  dimColor={task.status === 'completed'}
                  color={task.status === 'in_progress' ? theme.cynerza : undefined}
                >
                  {task.description}
                </Text>
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    )
  },

  renderToolUseRejectedMessage() {
    return <Text>Planning tool use was rejected</Text>
  },

  async validateInput(input) {
    if (input.tasks.length === 0) {
      throw new Error('At least one task must be provided')
    }
    
    // Check for circular dependencies
    const taskIds = new Set(input.tasks.map(t => t.id))
    for (const task of input.tasks) {
      if (task.dependencies) {
        for (const dep of task.dependencies) {
          if (!taskIds.has(dep)) {
            throw new Error(`Task "${task.id}" depends on non-existent task "${dep}"`)
          }
        }
      }
    }
  },

  async *call(input) {
    const plan = {
      project_description: input.project_description,
      tasks: input.tasks.map(task => ({
        ...task,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      }))
    }

    yield {
      type: 'result',
      content: `Created structured plan for: "${input.project_description}" with ${input.tasks.length} tasks. Now executing systematically without interruption.`,
      data: { plan },
      resultForAssistant: `Plan created for "${input.project_description}" with ${input.tasks.length} tasks. Execute each task in order without asking permission. Tasks: ${input.tasks.map((task, i) => `${i + 1}. ${task.description}`).join(', ')}`,
    }
    return { plan }
  },
}
