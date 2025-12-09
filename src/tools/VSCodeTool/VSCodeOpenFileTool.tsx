import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  file_path: z.string().describe('Path to the file to open'),
  line: z.number().optional().describe('Line number to jump to (1-indexed)'),
  column: z.number().optional().describe('Column position (1-indexed)'),
  preview: z.boolean().optional().describe('Open in preview mode (default: false)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  filePath: string
  success: boolean
  message: string
}

export const VSCodeOpenFileTool = {
  name: 'VSCodeOpenFile',
  async description() {
    return 'Open a file in VS Code editor at a specific line and column'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input ? `Open ${input.file_path}` : 'Open VS Code File',
  
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
    if (!input.file_path) {
      return { result: false, message: 'file_path is required' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Open a file in VS Code editor at a specific line and column.

Parameters:
- file_path: Path to the file to open (required)
- line: Line number to jump to, 1-indexed (optional)
- column: Column position, 1-indexed (optional)
- preview: Open in preview mode (optional, default: false)

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    let msg = `📂 Opening: ${input.file_path}`
    if (input.line) {
      msg += ` at line ${input.line}`
    }
    return msg
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code open file was cancelled</Text>
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
    return `Open File Result:
- File: ${data.filePath}
- Success: ${data.success}
- Message: ${data.message}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ success: boolean }>('file/open', {
        path: input.file_path,
        line: input.line,
        column: input.column,
        preview: input.preview
      })
      
      const result: Out = {
        filePath: input.file_path,
        success: response.success || false,
        message: response.success 
          ? `Opened ${input.file_path}${input.line ? ` at line ${input.line}` : ''}`
          : 'Failed to open file'
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const result: Out = {
        filePath: input.file_path,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    }
  }
} satisfies Tool<In, Out>
