import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { checkVSCodeAvailability, checkCodeCommand, checkVSCodeAPI } from './utils'

export const inputSchema = z.strictObject({})

type In = z.infer<typeof inputSchema>
export type Out = {
  codeAvailable: boolean
  apiAvailable: boolean
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
- VS Code command availability ('code' command in PATH)
- Extension API accessibility (localhost:8090)
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
        <Text>Code Command: {result.codeAvailable ? '✅ Available' : '❌ Not found'}</Text>
        <Text>Extension API (localhost:8090): {result.apiAvailable ? '✅ Connected' : '❌ Not accessible'}</Text>
        <Text>Overall Status: {result.codeAvailable && result.apiAvailable ? '✅ Ready' : '❌ Not ready'}</Text>
        <Text color="dim">{result.message}</Text>
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    return `VS Code Health Check:
- Code Command: ${data.codeAvailable ? 'Available' : 'Not found'}
- Extension API (localhost:8090): ${data.apiAvailable ? 'Connected' : 'Not accessible'}
- Overall Status: ${data.status}
- Message: ${data.message}`
  },
  
  async *call(input: In, context: any) {
    const codeAvailable = await checkCodeCommand()
    const apiAvailable = await checkVSCodeAPI()
    const { message } = await checkVSCodeAvailability()
    
    const result: Out = {
      codeAvailable,
      apiAvailable,
      status: codeAvailable && apiAvailable ? 'ready' : 'not_ready',
      message
    }
    
    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result)
    }
  }
} satisfies Tool<In, Out>
