import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  file_path: z.string().optional().describe('Specific file path (optional, if omitted returns all diagnostics)'),
  severity: z.enum(['error', 'warning', 'info', 'hint']).optional().describe('Filter by severity')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  diagnostics: Array<{
    file: string
    line: number
    column: number
    endLine: number
    endColumn: number
    severity: string
    message: string
    source?: string
    code?: string
  }>
  count: number
  errorCount: number
  warningCount: number
}

export const VSCodeDiagnosticsTool = {
  name: 'VSCodeDiagnostics',
  async description() {
    return 'Get diagnostics (errors, warnings, hints) from VS Code'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: () => 'Get Diagnostics',
  
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
    return `Get diagnostics (errors, warnings, hints) from VS Code.

Parameters:
- file_path: Specific file path (optional, if omitted returns all diagnostics)
- severity: Filter by severity - "error", "warning", "info", "hint" (optional)

Returns lint errors, TypeScript/ESLint issues, and other diagnostic information.

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return input.file_path 
      ? `🔎 Getting diagnostics for ${input.file_path}`
      : '🔎 Getting workspace diagnostics'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Diagnostics request was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Diagnostics Summary:</Text>
        <Text color="red">Errors: {result.errorCount}</Text>
        <Text color="yellow">Warnings: {result.warningCount}</Text>
        <Text color="dim">Total: {result.count} issues</Text>
        {verbose && result.diagnostics.slice(0, 10).map((d, i) => (
          <Text key={i} color={d.severity === 'error' ? 'red' : 'yellow'}>
            {d.file}:{d.line} [{d.severity}] {d.message.slice(0, 80)}
          </Text>
        ))}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    if (data.count === 0) {
      return 'No diagnostics found. All clear!'
    }
    
    const diagList = data.diagnostics.slice(0, 50).map(
      d => `${d.file}:${d.line}:${d.column} [${d.severity}] ${d.message}${d.source ? ` (${d.source})` : ''}`
    ).join('\n')
    
    return `Diagnostics:
- Errors: ${data.errorCount}
- Warnings: ${data.warningCount}
- Total: ${data.count}

${diagList}${data.count > 50 ? `\n... and ${data.count - 50} more` : ''}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ diagnostics: Out['diagnostics'] }>('diagnostics/get', {
        path: input.file_path,
        severity: input.severity
      })
      
      const diagnostics = response.diagnostics || []
      const errorCount = diagnostics.filter(d => d.severity === 'error').length
      const warningCount = diagnostics.filter(d => d.severity === 'warning').length
      
      const result: Out = {
        diagnostics,
        count: diagnostics.length,
        errorCount,
        warningCount
      }
      
      yield {
        type: 'result',
        data: result,
        resultForAssistant: this.renderResultForAssistant(result)
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error')
    }
  }
} satisfies Tool<In, Out>
