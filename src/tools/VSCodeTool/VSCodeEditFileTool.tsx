import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeAvailabilityError, ensureVSCodeAvailable } from './utils'
import { StructuredDiff } from '../../components/StructuredDiff'

export const inputSchema = z.strictObject({
  filename: z.string().describe('Name/path of the file to edit (e.g., "test.py" or "folder/test.py")'),
  old_text: z.string().describe('Text to replace (must match exactly)'),
  new_text: z.string().describe('New text to replace with')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  filename: string
  success: boolean
  message: string
  oldText: string
  newText: string
}

export const VSCodeEditFileTool = {
  name: 'VSCodeEditFile',
  async description() {
    return 'Edit an existing file by replacing old text with new text in VS Code workspace'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: (input?: In) => input ? `Edit ${input.filename}` : 'Edit VS Code File',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions(input: In) {
    // File editing is a write operation that needs permission
    return true
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.filename) {
      return { result: false, message: 'filename is required' }
    }
    
    if (!input.old_text && input.old_text !== '') {
      return { result: false, message: 'old_text is required (can be empty string)' }
    }
    
    if (!input.new_text && input.new_text !== '') {
      return { result: false, message: 'new_text is required (can be empty string)' }
    }
    
    // Basic filename validation
    if (input.filename.includes('..')) {
      return { result: false, message: 'filename cannot contain ".."' }
    }
    
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Edit an existing file by replacing old text with new text in the VS Code workspace.

Parameters:
- filename: Name/path of the file to edit (e.g., 'test.py' or 'folder/test.py')
- old_text: Text to replace (must match exactly)
- new_text: New text to replace with

The tool will:
1. Show a diff preview of the proposed changes
2. Perform the text replacement in the file
3. Optionally display the diff in VS Code

Note: Only works when VS Code is installed and the extension API is running on localhost:8090.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `✏️ Editing file: ${input.filename}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code file edit was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color={result.success ? "green" : "red"} bold>
          {result.success ? "✅" : "❌"} {result.message}
        </Text>
        {result.success && (
          <Box flexDirection="column">
            <Text color="dim">File edited: {result.filename}</Text>
            {verbose && (
              <Box flexDirection="column" marginTop={1}>
                <Text bold>Changes:</Text>
                <Text color="red">- {result.oldText}</Text>
                <Text color="green">+ {result.newText}</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    let result = `File Edit Result:
- Filename: ${data.filename}
- Success: ${data.success}
- Message: ${data.message}`

    if (data.success) {
      result += `
- Old text: ${data.oldText}
- New text: ${data.newText}`
    }

    return result
  },
  
  async *call(input: In, context: any) {
    try {
      // First, show a preview of what will be changed
      yield {
        type: 'preview',
        data: {
          filename: input.filename,
          oldText: input.old_text,
          newText: input.new_text
        },
        resultForAssistant: `Editing file "${input.filename}":\n\nReplacing:\n${input.old_text}\n\nWith:\n${input.new_text}`
      }
      
      const response = await makeVSCodeRequest('/file/edit', {
        method: 'POST',
        body: JSON.stringify({
          path: input.filename,
          oldContent: input.old_text,
          newContent: input.new_text
        })
      })
      
      const result: Out = {
        filename: input.filename,
        success: response.success || false,
        message: response.error 
          ? `Error editing file: ${response.error}`
          : `Successfully edited file: ${input.filename}`,
        oldText: input.old_text,
        newText: input.new_text
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeAvailabilityError 
        ? error.message 
        : `Error editing file ${input.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      const result: Out = {
        filename: input.filename,
        success: false,
        message: errorMessage,
        oldText: input.old_text,
        newText: input.new_text
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    }
  }
} satisfies Tool<In, Out>
