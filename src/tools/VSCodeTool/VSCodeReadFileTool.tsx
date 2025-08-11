import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeAvailabilityError, ensureVSCodeAvailable } from './utils'
import { HighlightedCode } from '../../components/HighlightedCode'

export const inputSchema = z.strictObject({
  file_path: z.string().describe('Relative path to the file in the workspace'),
  start_line: z.number().optional().describe('Starting line number (1-based)'),
  end_line: z.number().optional().describe('Ending line number (1-based)')
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
    // File reading in VS Code might be considered sensitive
    return true
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.file_path) {
      return { result: false, message: 'file_path is required' }
    }
    
    if (input.start_line && input.start_line < 1) {
      return { result: false, message: 'start_line must be >= 1' }
    }
    
    if (input.end_line && input.end_line < 1) {
      return { result: false, message: 'end_line must be >= 1' }
    }
    
    if (input.start_line && input.end_line && input.start_line > input.end_line) {
      return { result: false, message: 'start_line must be <= end_line' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Read content from a file in the VS Code workspace.

Parameters:
- file_path: Relative path to the file
- start_line: Starting line number (1-based, optional)
- end_line: Ending line number (1-based, optional)

Note: Only works when VS Code is installed and the extension API is running on localhost:8090.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    const rangeInfo = input.start_line || input.end_line 
      ? ` (lines ${input.start_line || 1}-${input.end_line || 'end'})` 
      : ''
    return `📖 Reading file: ${input.file_path}${rangeInfo}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file read was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    const lineInfo = result.startLine || result.endLine 
      ? ` (lines ${result.startLine || 1}-${result.endLine || result.totalLines})` 
      : ''
    
    return (
      <Box flexDirection="column">
        <Text color="green" bold>📖 {result.filePath}{lineInfo}</Text>
        <HighlightedCode 
          code={result.content} 
          language={result.language.toLowerCase()}
        />
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    const rangeInfo = data.startLine || data.endLine 
      ? ` (lines ${data.startLine || 1}-${data.endLine || data.totalLines})` 
      : ''
      
    return `File: ${data.filePath}${rangeInfo}
Language: ${data.language}
Total Lines: ${data.totalLines}

Content:
\`\`\`${data.language.toLowerCase()}
${data.content}
\`\`\``
  },
  
  async *call(input: In, context: any) {
    try {
      const queryParams = new URLSearchParams({ path: input.file_path })
      if (input.start_line) queryParams.set('startLine', input.start_line.toString())
      if (input.end_line) queryParams.set('endLine', input.end_line.toString())
      
      const response = await makeVSCodeRequest(`/file/read?${queryParams.toString()}`)
      
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
      const errorMessage = error instanceof VSCodeAvailabilityError 
        ? error.message 
        : `Error reading file ${input.file_path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      throw new Error(errorMessage)
    }
  }
} satisfies Tool<In, Out>
