import * as React from 'react'
import { z } from 'zod'
import { Tool, ValidationResult } from '../Tool.js'

export const inputSchema = z.strictObject({
  query: z.string().describe('The search query to send to Brave Search'),
  count: z
    .number()
    .optional()
    .default(20)
    .describe('Number of results to return (1-20)'),
  country: z
    .string()
    .optional()
    .default('us')
    .describe('Country code for localized results (e.g., "us", "uk", "ca")')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  success: boolean
  query: string
  count: number
  country: string
  results?: any
  error?: string
}

export const BraveSearchTool: Tool<In, Out> = {
  name: 'brave_search',
  
  async description() {
    return 'Search the web using Brave Search API for real-time information'
  },
  
  inputSchema,
  
  isReadOnly: () => true,
  
  async isEnabled() {
    return true
  },
  
  userFacingName: (input?: In) => {
    return input?.query ? `Search: "${input.query}"` : 'Web Search'
  },
  
  async prompt() {
    return 'Search the web for current information using Brave Search'
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.query || input.query.trim().length === 0) {
      return {
        result: false,
        message: 'Search query cannot be empty'
      }
    }
    
    if (input.count && (input.count < 1 || input.count > 20)) {
      return {
        result: false,
        message: 'Count must be between 1 and 20'
      }
    }
    
    return {
      result: true,
      message: 'Valid search query'
    }
  },
  
  async *call(input: In): AsyncGenerator<any, Out, any> {
    try {
      const { query, count = 20, country = 'us' } = input
      
      // Validate count parameter
      const validCount = Math.min(Math.max(count, 1), 20)
      
      yield { type: 'status', message: `Searching Brave for: "${query}" (${validCount} results)...` }
      
      const results = await performBraveSearch(query, validCount, country)
      
      const output: Out = {
        success: true,
        query,
        count: validCount,
        country,
        results
      }
      
      // Check if we got any results
      const hasResults = results && (
        (results.web_results && results.web_results.length > 0) ||
        (results.faq_results && results.faq_results.length > 0)
      )
      
      if (hasResults) {
        yield { type: 'status', message: `Found ${results.total_results || 'some'} results` }
      } else {
        yield { type: 'status', message: 'No results found' }
      }
      
      yield {
        type: 'result',
        data: output,
        resultForAssistant: BraveSearchTool.renderResultForAssistant(output)
      }
      
      return output
      
    } catch (error: any) {
      const errorOutput: Out = {
        success: false,
        query: input.query,
        count: input.count || 20,
        country: input.country || 'us',
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
  
  renderResultForAssistant(data: Out): string {
    if (!data.success) {
      return `Search failed: ${data.error}`
    }
    
    const { results } = data
    if (!results) {
      return `No results found for "${data.query}"`
    }
    
    const hasWebResults = results.web_results && results.web_results.length > 0
    const hasFaqResults = results.faq_results && results.faq_results.length > 0
    
    if (!hasWebResults && !hasFaqResults) {
      return `No results found for "${data.query}"`
    }
    
    let output = `Search results for "${data.query}":\n\n`
    
    // Add FAQ results first if available
    if (hasFaqResults) {
      output += '## FAQ Results:\n'
      results.faq_results.forEach((faq: any, index: number) => {
        output += `${index + 1}. **${faq.question}**\n`
        output += `   ${faq.answer}\n`
        if (faq.url) {
          output += `   Source: ${faq.url}\n`
        }
        output += '\n'
      })
    }
    
    // Add web results
    if (hasWebResults) {
      output += '## Web Results:\n'
      results.web_results.forEach((result: any, index: number) => {
        output += `${index + 1}. **${result.title}**\n`
        output += `   ${result.description}\n`
        output += `   URL: ${result.url}\n\n`
      })
    }
    
    return output
  },
  
  renderToolUseMessage(input: In, options: { verbose: boolean }): string {
    const count = input.count || 20
    return `Searching web for: "${input.query}"${count !== 20 ? ` (${count} results)` : ''}`
  },
  
  renderToolUseRejectedMessage(input?: In): React.ReactNode {
    return React.createElement('div', {}, `Web search rejected for query: "${input?.query || 'unknown'}"`)
  }
}

async function performBraveSearch(query: string, count: number, country: string) {
  const BRAVE_API_TOKEN = process.env.BRAVE_API_TOKEN || 'BSAzFTVZtJfGuFmmhHgxrM67UZgoOHS'
  
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&country=${country}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_TOKEN
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Parse and format the response
    return formatBraveSearchResults(data)
  } catch (error: any) {
    throw new Error(`Failed to fetch from Brave Search: ${error.message}`)
  }
}

function formatBraveSearchResults(data: any) {
  const results = {
    query_info: {
      original: data.query?.original || '',
      country: data.query?.country || 'us',
      is_navigational: data.query?.is_navigational || false,
      more_results_available: data.query?.more_results_available || false
    },
    web_results: [],
    faq_results: [],
    total_results: 0
  }
  
  // Process web results
  if (data.web?.results) {
    results.web_results = data.web.results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      description: result.description || '',
      thumbnail: result.thumbnail?.src || null,
      favicon: result.meta_url?.favicon || null,
      language: result.language || 'en',
      family_friendly: result.family_friendly || true,
      page_age: result.page_age || null,
      profile: {
        name: result.profile?.name || '',
        long_name: result.profile?.long_name || ''
      }
    }))
    results.total_results += results.web_results.length
  }
  
  // Process FAQ results
  if (data.faq?.results) {
    results.faq_results = data.faq.results.map((faq: any) => ({
      question: faq.question || '',
      answer: faq.answer?.replace(/<[^>]*>/g, '') || '', // Strip HTML tags
      title: faq.title || '',
      url: faq.url || ''
    }))
    results.total_results += results.faq_results.length
  }
  
  return results
}
