import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  action: z.enum(['definition', 'references', 'rename']).describe('Symbol action to perform'),
  file_path: z.string().describe('File containing the symbol'),
  line: z.number().describe('Line number of the symbol (1-indexed)'),
  column: z.number().describe('Column position of the symbol (1-indexed)'),
  new_name: z.string().optional().describe('New name (required for rename action)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  action: string
  success: boolean
  locations?: Array<{
    file: string
    line: number
    column: number
    preview?: string
  }>
  changedFiles?: number
  message: string
}

export const VSCodeSymbolTool = {
  name: 'VSCodeSymbol',
  async description() {
    return 'Perform symbol operations: go to definition, find references, or rename'
  },
  inputSchema,
  isReadOnly: () => false,  // rename modifies files
  userFacingName: (input?: In) => input ? `Symbol: ${input.action}` : 'Symbol Operation',
  
  async isEnabled() {
    try {
      await ensureVSCodeAvailable()
      return true
    } catch {
      return false
    }
  },
  
  needsPermissions(input: In) {
    return input.action === 'rename'  // Only rename modifies files
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.file_path) {
      return { result: false, message: 'file_path is required' }
    }
    if (!input.line || input.line < 1) {
      return { result: false, message: 'line must be a positive number' }
    }
    if (!input.column || input.column < 1) {
      return { result: false, message: 'column must be a positive number' }
    }
    if (input.action === 'rename' && !input.new_name) {
      return { result: false, message: 'new_name is required for rename action' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Perform symbol operations in VS Code.

Parameters:
- action: "definition" | "references" | "rename" (required)
- file_path: File containing the symbol (required)
- line: Line number of the symbol (required, 1-indexed)
- column: Column position of the symbol (required, 1-indexed)
- new_name: New name for rename action (required if action is "rename")

Actions:
- definition: Go to the definition of a symbol
- references: Find all references to a symbol
- rename: Rename a symbol across the project

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `🔄 ${input.action}: ${input.file_path}:${input.line}:${input.column}`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Symbol operation was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color={result.success ? "green" : "red"} bold>
          {result.success ? "✅" : "❌"} {result.message}
        </Text>
        {result.locations && verbose && result.locations.slice(0, 5).map((loc, i) => (
          <Text key={i} color="dim">  {loc.file}:{loc.line}</Text>
        ))}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    let result = `Symbol ${data.action} Result:
- Success: ${data.success}
- Message: ${data.message}`

    if (data.locations?.length) {
      result += `\n- Locations (${data.locations.length}):\n`
      result += data.locations.slice(0, 20).map(
        loc => `  ${loc.file}:${loc.line}:${loc.column}${loc.preview ? ` - ${loc.preview}` : ''}`
      ).join('\n')
    }

    if (data.changedFiles !== undefined) {
      result += `\n- Changed files: ${data.changedFiles}`
    }

    return result
  },
  
  async *call(input: In, context: any) {
    try {
      let response: any
      
      switch (input.action) {
        case 'definition':
          response = await makeVSCodeRequest('symbols/definition', {
            path: input.file_path,
            line: input.line,
            column: input.column
          })
          break
        case 'references':
          response = await makeVSCodeRequest('symbols/references', {
            path: input.file_path,
            line: input.line,
            column: input.column
          })
          break
        case 'rename':
          response = await makeVSCodeRequest('symbols/rename', {
            path: input.file_path,
            line: input.line,
            column: input.column,
            newName: input.new_name
          })
          break
      }
      
      const result: Out = {
        action: input.action,
        success: true,
        locations: response.locations,
        changedFiles: response.changedFiles,
        message: input.action === 'rename' 
          ? `Renamed symbol to "${input.new_name}" in ${response.changedFiles} files`
          : `Found ${response.locations?.length || 0} ${input.action === 'definition' ? 'definitions' : 'references'}`
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const result: Out = {
        action: input.action,
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
