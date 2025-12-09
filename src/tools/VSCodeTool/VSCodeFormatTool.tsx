import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  file_path: z.string().optional().describe('Path to file to format (optional, uses active file if omitted)'),
  start_line: z.number().optional().describe('Start line for range formatting'),
  end_line: z.number().optional().describe('End line for range formatting')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  success: boolean
  message: string
  file?: string
}

export const VSCodeFormatTool = {
  name: 'VSCodeFormat',
  async description() {
    return 'Format a document or selection using VS Code formatters'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: (input?: In) => input?.file_path ? `Format ${input.file_path}` : 'Format Document',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions() {
    return true  // Modifies files
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (input.start_line && input.end_line && input.start_line > input.end_line) {
      return { result: false, message: 'start_line cannot be greater than end_line' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Format a document or selection using VS Code formatters.

Parameters:
- file_path: Path to file to format (optional, uses active file if omitted)
- start_line: Start line for range formatting (optional)
- end_line: End line for range formatting (optional)

Uses the configured formatter (Prettier, ESLint, etc.) for the file type.

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return input.file_path 
      ? `📐 Formatting: ${input.file_path}`
      : '📐 Formatting active document'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Format was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color={result.success ? "green" : "red"} bold>
          {result.success ? "✅" : "❌"} {result.message}
        </Text>
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `Format Result:
- Success: ${data.success}
- Message: ${data.message}${data.file ? `\n- File: ${data.file}` : ''}`
  },
  
  async *call(input: In, context: any) {
    try {
      await makeVSCodeRequest('editor/format', {
        path: input.file_path,
        range: (input.start_line && input.end_line) ? {
          startLine: input.start_line,
          endLine: input.end_line
        } : undefined
      })
      
      const result: Out = {
        success: true,
        message: 'Document formatted successfully',
        file: input.file_path
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const result: Out = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        file: input.file_path
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    }
  }
} satisfies Tool<In, Out>
