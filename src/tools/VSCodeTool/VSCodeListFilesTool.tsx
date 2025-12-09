import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.py", "src/**")')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  pattern: string
  files: string[]
  count: number
}

export const VSCodeListFilesTool = {
  name: 'VSCodeListFiles',
  async description() {
    return 'List files in the VS Code workspace matching a glob pattern'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input ? `List files: ${input.pattern}` : 'List VS Code Files',
  
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
    if (!input.pattern) {
      return { result: false, message: 'pattern is required' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `List files in the VS Code workspace matching a glob pattern.

Parameters:
- pattern: Glob pattern to match files (e.g., "**/*.py" for all Python files)

Returns a list of relative file paths matching the pattern.

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `📁 Listing files: ${input.pattern}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file listing was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Files matching "{result.pattern}":</Text>
        <Text color="dim">{result.count} files found</Text>
        {verbose && result.files.slice(0, 20).map((file, i) => (
          <Text key={i}>  {file}</Text>
        ))}
        {verbose && result.count > 20 && (
          <Text color="dim">  ... and {result.count - 20} more</Text>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    const fileList = data.files.slice(0, 50).join('\n')
    return `Files matching "${data.pattern}":
Count: ${data.count}
${fileList}${data.count > 50 ? `\n... and ${data.count - 50} more files` : ''}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ files: string[] }>('workspace/files', {
        pattern: input.pattern
      })
      
      const files = response.files || []
      
      const result: Out = {
        pattern: input.pattern,
        files,
        count: files.length
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeNotConnectedError 
        ? error.message 
        : `Error listing files: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      throw new Error(errorMessage)
    }
  }
} satisfies Tool<In, Out>
