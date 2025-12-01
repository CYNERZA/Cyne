import * as React from 'react'
import { z } from 'zod'
import { Text } from 'ink'
import { Tool, ValidationResult } from '../../Tool.js'
import { applyMarkdown } from '../../utils/markdown'
import { 
  TOOL_NAME, 
  MAX_SEARCH_RESULTS, 
  DEFAULT_SEARCH_COUNT, 
  DEFAULT_COUNTRY,
  PROMPT 
} from './prompt'
import { 
  performBraveSearch, 
  createSearchResultOutput, 
  renderMarkdownToTerminal 
} from './utils'

export const inputSchema = z.strictObject({
  query: z.string().describe('The search query to send to Brave Search'),
  count: z
    .number()
    .optional()
    .default(DEFAULT_SEARCH_COUNT)
    .describe(`Number of results to return (1-${MAX_SEARCH_RESULTS})`),
  country: z
    .string()
    .optional()
    .default(DEFAULT_COUNTRY)
    .describe('Country code for localized results (e.g., "us", "uk", "ca")')
})

type BraveSearchInput = z.infer<typeof inputSchema>

export interface BraveSearchOutput {
  success: boolean
  query: string
  count: number
  country: string
  results?: any
  error?: string
}

export const BraveSearchTool: Tool<BraveSearchInput, BraveSearchOutput> = {
  name: TOOL_NAME,
  
  async description() {
    return 'Search the web using Brave Search API for real-time information'
  },
  
  inputSchema,
  
  isReadOnly: () => true,
  
  async isEnabled() {
    return true
  },
  
  needsPermissions: () => false,
  
  userFacingName: (input?: BraveSearchInput) => {
    return input?.query ? `Search: "${input.query}"` : 'Web Search'
  },
  
  async prompt() {
    return PROMPT
  },
  
  async validateInput(input: BraveSearchInput): Promise<ValidationResult> {
    if (!input.query || input.query.trim().length === 0) {
      return {
        result: false,
        message: 'Search query cannot be empty'
      }
    }
    
    if (input.count && (input.count < 1 || input.count > MAX_SEARCH_RESULTS)) {
      return {
        result: false,
        message: `Count must be between 1 and ${MAX_SEARCH_RESULTS}`
      }
    }
    
    return {
      result: true,
      message: 'Valid search query'
    }
  },
  
  async *call(input: BraveSearchInput): AsyncGenerator<any, BraveSearchOutput, any> {
    try {
      const { query, count = DEFAULT_SEARCH_COUNT, country = DEFAULT_COUNTRY } = input
      
      // Validate count parameter
      const validatedCount = Math.min(Math.max(count, 1), MAX_SEARCH_RESULTS)
      
      yield { 
        type: 'status', 
        message: `Searching Brave for: "${query}" (${validatedCount} results)...` 
      }
      
      const searchResults = await performBraveSearch(query, validatedCount, country)
      
      const searchOutput: BraveSearchOutput = {
        success: true,
        query,
        count: validatedCount,
        country,
        results: searchResults
      }
      
      // Check if we got any results
      const hasResults = searchResults && (
        (searchResults.web_results && searchResults.web_results.length > 0) ||
        (searchResults.faq_results && searchResults.faq_results.length > 0)
      )
      
      if (hasResults) {
        yield { 
          type: 'status', 
          message: `Found ${searchResults.total_results || 'some'} results` 
        }
      } else {
        yield { type: 'status', message: 'No results found' }
      }
      
      const formattedResults = BraveSearchTool.renderResultForAssistant(searchOutput)
      
      yield {
        type: 'result',
        data: searchOutput,
        resultForAssistant: formattedResults
      }
      return searchOutput
      
    } catch (error: any) {
      const errorOutput: BraveSearchOutput = {
        success: false,
        query: input.query,
        count: input.count || DEFAULT_SEARCH_COUNT,
        country: input.country || DEFAULT_COUNTRY,
        error: `Brave search failed: ${error.message}`
      }
      
      yield { 
        type: 'error', 
        message: errorOutput.error,
        data: errorOutput,
        resultForAssistant: BraveSearchTool.renderResultForAssistant(errorOutput)
      }
      return errorOutput
    }
  },
  
  renderResultForAssistant(data: BraveSearchOutput): string {
    return createSearchResultOutput(data)
  },
  
  renderToolUseMessage(input: BraveSearchInput, options: { verbose: boolean }): string {
    const searchCount = input.count || DEFAULT_SEARCH_COUNT
    return `Searching web for: "${input.query}"${searchCount !== DEFAULT_SEARCH_COUNT ? ` (${searchCount} results)` : ''}`
  },
  
  renderToolUseRejectedMessage(input?: BraveSearchInput): React.ReactNode {
    return React.createElement('div', {}, `Web search rejected for query: "${input?.query || 'unknown'}"`)
  },
  
  renderToolResultMessage(content: BraveSearchOutput, options: { verbose: boolean }): React.ReactNode {
    if (!content.success) {
      return React.createElement(
        Text,
        { color: 'red' },
        `❌ Search failed: ${content.error}`
      )
    }
    
    const hasResults = content.results && (
      (content.results.web_results && content.results.web_results.length > 0) ||
      (content.results.faq_results && content.results.faq_results.length > 0)
    )
    
    if (!hasResults) {
      return React.createElement(
        Text,
        { color: 'yellow' },
        `⚠️ No results found for "${content.query}"`
      )
    }
    
    // Format the search results for display
    const formattedResults = createSearchResultOutput(content)
    
    // If verbose mode is off and content is too long, truncate it
    let displayContent = formattedResults
    if (!options.verbose) {
      const lines = formattedResults.split('\n')
      const maxLines = 20 // Show first 20 lines
      if (lines.length > maxLines) {
        const truncatedLines = lines.slice(0, maxLines)
        const remainingLines = lines.length - maxLines
        displayContent = truncatedLines.join('\n') + `\n.......[${remainingLines}+] lines`
      }
    }
    
    return React.createElement(
      Text,
      {},
      applyMarkdown(displayContent)
    )
  }
}
