import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  line: z.number().describe('Line number to go to (1-indexed)'),
  column: z.number().optional().describe('Column position (1-indexed)'),
  reveal: z.enum(['center', 'top', 'bottom']).optional().describe('How to reveal the line')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  success: boolean
  line: number
  column?: number
}

export const VSCodeGoToLineTool = {
  name: 'VSCodeGoToLine',
  async description() {
    return 'Navigate to a specific line and column in the active VS Code editor'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input ? `Go to line ${input.line}` : 'Go to Line',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions() {
    return false
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.line || input.line < 1) {
      return { result: false, message: 'line must be a positive number' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Navigate to a specific line and column in the active VS Code editor.

Parameters:
- line: Line number to go to (required, 1-indexed)
- column: Column position (optional, 1-indexed)
- reveal: How to reveal the line - "center", "top", or "bottom" (optional)

Note: Only works when VS Code is open with an active editor.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `🔍 Going to line ${input.line}${input.column ? `:${input.column}` : ''}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code goto was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>
          ✅ Navigated to line {result.line}{result.column ? `:${result.column}` : ''}
        </Text>
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `Navigation Result:
- Success: ${data.success}
- Line: ${data.line}
- Column: ${data.column || 1}`
  },
  
  async *call(input: In, context: any) {
    try {
      await makeVSCodeRequest('editor/goto', {
        line: input.line,
        column: input.column,
        reveal: input.reveal
      })
      
      const result: Out = {
        success: true,
        line: input.line,
        column: input.column
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
