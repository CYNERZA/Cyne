import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeAvailabilityError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  pattern: z.string().optional().describe('Glob pattern to match files (e.g., "**/*.py" for Python files)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  files: string[]
  total: number
  pattern: string
}

export const VSCodeListFilesTool = {
  name: 'VSCodeListFiles',
  async description() {
    return 'List files in the VS Code workspace matching a glob pattern'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input?.pattern ? `List files: ${input.pattern}` : 'List VS Code Files',
  
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
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `List files in the VS Code workspace matching a glob pattern.

Parameters:
- pattern: Glob pattern to match files (default: "**/*")
  - "**/*.py" for Python files
  - "**/*.ts" for TypeScript files  
  - "src/**" for files in src directory
  - etc.

Note: Only works when VS Code is installed and the extension API is running on localhost:8090.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    const pattern = input.pattern || '**/*'
    return `📁 Listing files: ${pattern}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file listing was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    const displayFiles = result.total > 50 ? result.files.slice(0, 50) : result.files
    const truncatedMsg = result.total > 50 ? `... and ${result.total - 50} more files` : ''
    
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>📁 Workspace Files</Text>
        <Text><Text bold>Pattern:</Text> {result.pattern}</Text>
        <Text><Text bold>Total Found:</Text> {result.total}</Text>
        <Text></Text>
        {displayFiles.map((file, i) => (
          <Text key={i} color="dim">{`${(i + 1).toString().padStart(2)} `}. {file}</Text>
        ))}
        {truncatedMsg && <Text color="dim">{truncatedMsg}</Text>}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    const displayFiles = data.total > 50 ? data.files.slice(0, 50) : data.files
    const truncatedMsg = data.total > 50 ? `\n... and ${data.total - 50} more files` : ''
    
    return `VS Code Workspace Files:
Pattern: ${data.pattern}
Total Found: ${data.total}

Files:
${displayFiles.map((file, i) => `${i + 1}. ${file}`).join('\n')}${truncatedMsg}`
  },
  
  async *call(input: In, context: any) {
    try {
      const pattern = input.pattern || '**/*'
      const queryParams = new URLSearchParams({ pattern })
      
      const response = await makeVSCodeRequest(`/workspace/files?${queryParams.toString()}`)
      
      const result: Out = {
        files: response.files || [],
        total: response.total || 0,
        pattern
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeAvailabilityError 
        ? error.message 
        : `Error listing workspace files: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      throw new Error(errorMessage)
    }
  }
} satisfies Tool<In, Out>
