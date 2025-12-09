import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  file_path: z.string().describe('Relative path to the file in the workspace'),
  start_line: z.number().optional().describe('Optional starting line number (1-indexed)'),
  end_line: z.number().optional().describe('Optional ending line number (1-indexed)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  filePath: string
  content: string
  language: string
  startLine?: number
  endLine?: number
  totalLines: number
}

export const VSCodeReadFileTool = {
  name: 'VSCodeReadFile',
  async description() {
    return 'Read content from a file in the VS Code workspace'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input ? `Read ${input.file_path}` : 'Read VS Code File',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions(input: In) {
    return true  // File reading requires permission
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.file_path) {
      return { result: false, message: 'file_path is required' }
    }
    
    if (input.file_path.includes('..')) {
      return { result: false, message: 'file_path cannot contain ".."' }
    }
    
    if (input.start_line && input.end_line && input.start_line > input.end_line) {
      return { result: false, message: 'start_line cannot be greater than end_line' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Read content from a file in the VS Code workspace.

Parameters:
- file_path: Relative path to the file (required)
- start_line: Starting line number, 1-indexed (optional)
- end_line: Ending line number, 1-indexed (optional)

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    let msg = `📖 Reading file: ${input.file_path}`
    if (input.start_line || input.end_line) {
      msg += ` (lines ${input.start_line || 1}-${input.end_line || 'end'})`
    }
    return msg
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file read was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>✅ File read successfully</Text>
        <Text color="dim">File: {result.filePath} ({result.language})</Text>
        <Text color="dim">Lines: {result.totalLines} total</Text>
        {verbose && (
          <Box marginTop={1}>
            <Text>{result.content.slice(0, 500)}{result.content.length > 500 ? '...' : ''}</Text>
          </Box>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `File: ${data.filePath}
Language: ${data.language}
Total Lines: ${data.totalLines}
${data.startLine ? `Lines ${data.startLine}-${data.endLine || data.totalLines}:` : 'Content:'}
\`\`\`${data.language}
${data.content}
\`\`\``
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<Out>('file/read', {
        path: input.file_path,
        startLine: input.start_line,
        endLine: input.end_line
      })
      
      const result: Out = {
        filePath: input.file_path,
        content: response.content || '',
        language: response.language || 'text',
        startLine: input.start_line,
        endLine: input.end_line,
        totalLines: response.totalLines || 0
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeNotConnectedError 
        ? error.message 
        : `Error reading file ${input.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      throw new Error(errorMessage)
    }
  }
} satisfies Tool<In, Out>
