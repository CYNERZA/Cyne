import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeAvailabilityError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({})

type In = z.infer<typeof inputSchema>
export type Out = {
  activeFile: string
  language: string
  workspace: string
  selection?: {
    text: string
    startLine: number
    endLine: number
    startColumn: number
    endColumn: number
  }
  openTabs: string[]
  hasActiveEditor: boolean
}

export const VSCodeContextTool = {
  name: 'VSCodeContext',
  async description() {
    return 'Get the current VS Code editor context including active file, selection, workspace, and open tabs'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: () => 'VS Code Context',
  
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
    return `Get the current VS Code editor context.

This tool provides:
- Currently active file and language
- Current workspace path
- Active selection (if any)
- List of open tabs

Note: Only works when VS Code is installed and the extension API is running on localhost:8090.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return '🔍 Getting VS Code context...'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code context request was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>VS Code Context:</Text>
        <Text><Text bold>Active File:</Text> {result.activeFile || 'None'}</Text>
        <Text><Text bold>Language:</Text> {result.language || 'Unknown'}</Text>
        <Text><Text bold>Workspace:</Text> {result.workspace || 'None'}</Text>
        {result.selection && (
          <Text><Text bold>Selection:</Text> Lines {result.selection.startLine}-{result.selection.endLine}</Text>
        )}
        <Text><Text bold>Open Tabs:</Text> {result.openTabs.length} tabs</Text>
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    let context = `VS Code Context:
- Active File: ${data.activeFile || 'None'}
- Language: ${data.language || 'Unknown'}
- Workspace: ${data.workspace || 'None'}
- Has Active Editor: ${data.hasActiveEditor}
- Open Tabs: ${data.openTabs.length} tabs`

    if (data.selection) {
      context += `
- Selection: Lines ${data.selection.startLine}-${data.selection.endLine}, Characters ${data.selection.startColumn}-${data.selection.endColumn}
- Selected Text: ${data.selection.text}`
    }

    return context
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest('/context')
      
      const result: Out = {
        activeFile: response.activeFile || '',
        language: response.language || '',
        workspace: response.workspace || '',
        selection: response.selection ? {
          text: response.selection.text || '',
          startLine: response.selection.startLine || 0,
          endLine: response.selection.endLine || 0,
          startColumn: response.selection.startColumn || 0,
          endColumn: response.selection.endColumn || 0
        } : undefined,
        openTabs: response.openTabs || [],
        hasActiveEditor: response.hasActiveEditor || false
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      const errorMessage = error instanceof VSCodeAvailabilityError 
        ? error.message 
        : `Error getting VS Code context: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      throw new Error(errorMessage)
    }
  }
} satisfies Tool<In, Out>
