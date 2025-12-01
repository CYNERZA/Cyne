import { Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'

const inputSchema = z.strictObject({
  ProcessID: z.string().describe('Process ID of the terminal to read.'),
  Name: z.string().describe('Name of the terminal to read.'),
})

export const ReadTerminalTool = {
  name: 'read_terminal',
  async description() {
    return 'Reads the contents of a terminal given its process ID.'
  },
  async prompt() {
    return `# read_terminal Tool

Read the contents and state of a terminal by its process ID.

**Use Cases:**
- Monitor terminal output
- Check terminal state
- Retrieve command results

**IMPORTANT:**
- Requires valid ProcessID
- Provide terminal Name for identification`
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
    return `Read terminal ${Name} (PID: ${ProcessID})`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output) {
    return <Text>&nbsp;&nbsp;⎿ Terminal output ({output.lines} lines)</Text>
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
    const data = {
      processId: ProcessID,
      name: Name,
      content: 'Terminal content placeholder',
      lines: 0,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `Terminal ${data.name} (PID ${data.processId}):\n${data.content}`
  },
} satisfies Tool
