import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { makeVSCodeRequest, VSCodeNotConnectedError, ensureVSCodeAvailable } from './utils'

export const inputSchema = z.strictObject({
  query: z.string().describe('Search query'),
  pattern: z.string().optional().describe('File glob pattern to search in (default: **/*)')  ,
  is_regex: z.boolean().optional().describe('Treat query as regex'),
  case_sensitive: z.boolean().optional().describe('Case sensitive search'),
  max_results: z.number().optional().describe('Maximum number of results (default: 100)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  query: string
  results: Array<{
    file: string
    line: number
    column: number
    text: string
  }>
  count: number
}

export const VSCodeSearchTool = {
  name: 'VSCodeSearch',
  async description() {
    return 'Search for text across the VS Code workspace'
  },
  inputSchema,
  isReadOnly: () => true,
  userFacingName: (input?: In) => input ? `Search: ${input.query}` : 'Search Workspace',
  
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
    if (!input.query) {
      return { result: false, message: 'query is required' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `Search for text across the VS Code workspace.

Parameters:
- query: Search query (required)
- pattern: File glob pattern to search in (optional, default: **/*)
- is_regex: Treat query as regex (optional)
- case_sensitive: Case sensitive search (optional)
- max_results: Maximum number of results (optional, default: 100)

Note: Only works when VS Code is open with the Cyne extension installed.`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    return `🔍 Searching: "${input.query}"`
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ VS Code search was cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>Search Results for "{result.query}":</Text>
        <Text color="dim">{result.count} matches found</Text>
        {verbose && result.results.slice(0, 10).map((r, i) => (
          <Text key={i} color="dim">  {r.file}:{r.line} - {r.text.slice(0, 60)}</Text>
        ))}
      </Box>
    )
  },
  
  renderResultForAssistant(data: Out): string {
    const resultList = data.results.slice(0, 30).map(
      r => `${r.file}:${r.line}:${r.column} - ${r.text}`
    ).join('\n')
    
    return `Search Results for "${data.query}":
Count: ${data.count}
${resultList}${data.count > 30 ? `\n... and ${data.count - 30} more matches` : ''}`
  },
  
  async *call(input: In, context: any) {
    try {
      const response = await makeVSCodeRequest<{ results: Out['results'] }>('workspace/search', {
        query: input.query,
        pattern: input.pattern,
        isRegex: input.is_regex,
        caseSensitive: input.case_sensitive,
        maxResults: input.max_results
      })
      
      const results = response.results || []
      
      const result: Out = {
        query: input.query,
        results,
        count: results.length
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
