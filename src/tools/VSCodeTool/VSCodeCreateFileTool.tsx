import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeAvailabilityError, ensureVSCodeAvailable } from './utils'
import { HighlightedCode } from '../../components/HighlightedCode'

export const inputSchema = z.strictObject({
  filename: z.string().describe('Name/path of the file to create (e.g., "test.py" or "folder/test.py")'),
  content: z.string().describe('Content to write to the file')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  filename: string
  created: boolean
  message: string
}

export const VSCodeCreateFileTool = {
  name: 'VSCodeCreateFile',
  async description() {
    return 'Create a new file with the specified content in VS Code workspace'
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
    // File creation is a write operation that needs permission
    return true
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.filename) {
      return { result: false, message: 'filename is required' }
    }
    
    if (!input.content && input.content !== '') {
      return { result: false, message: 'content is required (can be empty string)' }
    }
    
    // Basic filename validation
    if (input.filename.includes('..')) {
      return { result: false, message: 'filename cannot contain ".."' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Create a new file with the specified content in the VS Code workspace.

Parameters:
- filename: Name/path of the file to create (e.g., 'test.py' or 'folder/test.py')
- content: Content to write to the file

The tool will:
1. Show a preview of the file content
2. Create the file in the workspace
3. Optionally display the file in VS Code

Note: Only works when VS Code is installed and the extension API is running on localhost:8090.`
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
        <Text color={result.created ? "green" : "red"} bold>
          {result.created ? "✅" : "❌"} {result.message}
        </Text>
        {result.created && (
          <Text color="dim">File created: {result.filename}</Text>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `File Creation Result:
- Filename: ${data.filename}
- Created: ${data.created}
- Message: ${data.message}`
  },
  
  async *call(input: In, context: any) {
    try {
      // First, show a preview of what will be created
      yield {
        type: 'preview',
        data: {
          filename: input.filename,
          content: input.content
        },
        resultForAssistant: `Creating file "${input.filename}" with content preview:\n\`\`\`\n${input.content}\n\`\`\``
      }
      
      const response = await makeVSCodeRequest('/file/create', {
        method: 'POST',
        body: JSON.stringify({
          path: input.filename,
          content: input.content
        })
      })
      
      const result: Out = {
        filename: input.filename,
        created: response.success || false,
        message: response.error 
          ? `Error creating file: ${response.error}`
          : `Successfully created file: ${input.filename}`
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeAvailabilityError 
        ? error.message 
        : `Error creating file ${input.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      const result: Out = {
        filename: input.filename,
        created: false,
        message: errorMessage
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    }
  }
} satisfies Tool<In, Out>
