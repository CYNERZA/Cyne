import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { checkVSCodeAvailability, listVSCodeWorkspaces } from './utils'
import { getCwd } from '../../utils/state'

export const inputSchema = z.strictObject({})

type In = z.infer<typeof inputSchema>
export type Out = {
  connected: boolean
  workspace?: string
  registeredWorkspaces: number
  status: string
  message: string
}

export const VSCodeHealthTool = {
  name: 'VSCodeHealth',
  async description() {
    return 'Check VS Code availability and connection status'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: () => 'VS Code Health Check',
  
  async isEnabled() {
    // This tool should always be enabled to check availability
    return true
  },
  
  needsPermissions() {
    return false
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Check VS Code availability and connection status.

This tool verifies:
- Connection to VS Code via socket for current workspace
- Number of registered VS Code workspaces
- Overall readiness for VS Code integration

Use this to troubleshoot VS Code connectivity issues.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return '🔍 Checking VS Code availability...'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code health check was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>VS Code Health Check:</Text>
        <Text>Connection: {result.connected ? '✅ Connected' : '❌ Not connected'}</Text>
        {result.workspace && <Text>Workspace: {result.workspace}</Text>}
        <Text>Registered Workspaces: {result.registeredWorkspaces}</Text>
        <Text>Status: {result.status === 'ready' ? '✅ Ready' : '❌ Not ready'}</Text>
        <Text color="dim">{result.message}</Text>
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `VS Code Health Check:
- Connected: ${data.connected}
- Current Workspace: ${data.workspace || 'None'}
- Registered Workspaces: ${data.registeredWorkspaces}
- Status: ${data.status}
- Message: ${data.message}`
  },
  
  async *call(input: In, context: any) {
    const availability = await checkVSCodeAvailability()
    const workspaces = listVSCodeWorkspaces()
    
    const result: Out = {
      connected: availability.isAvailable,
      workspace: availability.workspace,
      registeredWorkspaces: workspaces.length,
      status: availability.isAvailable ? 'ready' : 'not_ready',
      message: availability.message
    }
    
    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result)
    }
  }
} satisfies Tool<In, Out>
