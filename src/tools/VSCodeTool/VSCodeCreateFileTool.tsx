import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  filename: z.string().describe('Name/path of the file to create (e.g., "test.py" or "folder/test.py")'),
  content: z.string().describe('Content to write to the file')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  filename: string
  success: boolean
  message: string
  created: boolean
}

export const VSCodeCreateFileTool = {
  name: 'VSCodeCreateFile',
  async description() {
    return 'Create a new file with content in the VS Code workspace'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: (input?: In) => input ? `Create ${input.filename}` : 'Create VS Code File',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions(input: In) {
    return true  // File creation requires permission
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.filename) {
      return { result: false, message: 'filename is required' }
    }
    
    if (input.filename.includes('..')) {
      return { result: false, message: 'filename cannot contain ".."' }
    }
    
    if (!input.content && input.content !== '') {
      return { result: false, message: 'content is required (can be empty string)' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Create a new file with content in the VS Code workspace.

Parameters:
- filename: Name or path of the file to create (required)
- content: Content to write to the file (required, can be empty)

The file will be created in the current workspace and opened in VS Code.

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `📝 Creating file: ${input.filename}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file creation was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color={result.success ? "green" : "red"} bold>
          {result.success ? "✅" : "❌"} {result.message}
        </Text>
        {result.success && (
          <Text color="dim">File created: {result.filename}</Text>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `File Creation Result:
- Filename: ${data.filename}
- Success: ${data.success}
- Message: ${data.message}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ success: boolean; error?: string }>('file/create', {
        path: input.filename,
        content: input.content
      })
      
      const result: Out = {
        filename: input.filename,
        success: response.success || false,
        message: response.error 
          ? `Error creating file: ${response.error}`
          : `Successfully created file: ${input.filename}`,
        created: response.success || false
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeNotConnectedError 
        ? error.message 
        : `Error creating file ${input.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      const result: Out = {
        filename: input.filename,
        success: false,
        message: errorMessage,
        created: false
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    }
  }
} satisfies Tool<In, Out>
