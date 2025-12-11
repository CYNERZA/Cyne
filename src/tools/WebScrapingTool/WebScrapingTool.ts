import * as React from 'react'
import { z } from 'zod'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool.js'
import { applyMarkdown } from '../../utils/markdown'
import {
  TOOL_NAME,
  PROMPT,
  DEFAULT_FORMATS,
  SUPPORTED_FORMATS
} from './prompt'
import {
  performWebScraping,
  formatScrapedContent,
  formatScrapedContentForUI,
  renderMarkdownContent,
  isValidUrl,
  sanitizeUrl,
  type ScrapedData
} from './utils'

export const inputSchema = z.strictObject({
  url: z.string().describe('The URL of the webpage to scrape'),
  formats: z
    .array(z.enum(['markdown', 'html', 'text', 'structured']))
    .optional()
    .default(['markdown'])
    .describe('Output formats for the scraped content (markdown, html, text, structured)')
})

type WebScrapingInput = z.infer<typeof inputSchema>

export interface WebScrapingOutput {
  success: boolean
  url: string
  formats: readonly string[] | string[]
  data?: ScrapedData
  error?: string
}

export const WebScrapingTool: Tool<WebScrapingInput, WebScrapingOutput> = {
  name: TOOL_NAME,

  async description() {
    return 'Extract and scrape content from web pages using the Cynerza crawler API'
  },

  inputSchema,

  isReadOnly: () => true,

  async isEnabled() {
    return true
  },

  needsPermissions: () => false,

  userFacingName: (input?: WebScrapingInput) => {
    return input?.url ? `Scrape: "${input.url}"` : 'Web Scraping'
  },

  async prompt() {
    return PROMPT
  },

  async validateInput(input: WebScrapingInput): Promise<ValidationResult> {
    if (!input.url || input.url.trim().length === 0) {
      return {
        result: false,
        message: 'URL cannot be empty'
      }
    }

    const sanitizedUrl = sanitizeUrl(input.url.trim())
    if (!isValidUrl(sanitizedUrl)) {
      return {
        result: false,
        message: 'Please provide a valid URL'
      }
    }

    if (input.formats) {
      const invalidFormats = input.formats.filter(format => !SUPPORTED_FORMATS.includes(format))
      if (invalidFormats.length > 0) {
        return {
          result: false,
          message: `Unsupported formats: ${invalidFormats.join(', ')}. Supported: ${SUPPORTED_FORMATS.join(', ')}`
        }
      }
    }

    return {
      result: true,
      message: 'Valid scraping request'
    }
  },

  async *call(input: WebScrapingInput): AsyncGenerator<any, WebScrapingOutput, any> {
    const sanitizedUrl = sanitizeUrl(input.url.trim())
    const requestedFormats = input.formats || ['markdown']

    const scrapedData = await performWebScraping(sanitizedUrl, requestedFormats)

    const output: WebScrapingOutput = {
      success: true,
      url: sanitizedUrl,
      formats: requestedFormats,
      data: scrapedData
    }

    const formattedResults = WebScrapingTool.renderResultForAssistant(output)

    yield {
      type: 'result',
      data: output,
      resultForAssistant: formattedResults
    }
    return output
  },

  renderResultForAssistant(data: WebScrapingOutput): string {
    if (!data.success) {
      return `Scraping failed for ${data.url}: ${data.error}`
    }

    if (!data.data) {
      return `No content found for ${data.url}`
    }

    return formatScrapedContent(data.data, data.url, data.formats)
  },

  renderToolUseMessage(input: WebScrapingInput, options: { verbose: boolean }): string {
    const formats = input.formats || ['markdown']
    const formatStr = formats.length > 1 ? ` (${formats.join(', ')})` : ''
    return `Scraping content from: ${input.url}${formatStr}`
  },

  renderToolUseRejectedMessage(input?: WebScrapingInput): React.ReactNode {
    return React.createElement(
      'div',
      {},
      `Web scraping rejected for URL: "${input?.url || 'unknown'}"`
    )
  },

  renderToolResultMessage(content: WebScrapingOutput, options: { verbose: boolean }): React.ReactNode {
    if (!content.success) {
      return React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(
          Text,
          { color: 'red' },
          `❌ Scraping failed: ${content.error}`
        )
      )
    }

    if (!content.data) {
      return React.createElement(
        Box,
        { flexDirection: 'column' },
        React.createElement(
          Text,
          { color: 'yellow' },
          `⚠️ No content found for ${content.url}`
        )
      )
    }

    // Format the scraped content for UI display (without metadata)
    const uiContent = formatScrapedContentForUI(content.data, content.formats)

    // Always truncate for better UI experience, regardless of verbose setting
    let displayContent = uiContent
    const lines = uiContent.split('\n').filter(line => line.trim() !== '') // Remove empty lines
    const maxLines = 5 // Show first 5 lines
    if (lines.length > maxLines) {
      const truncatedLines = lines.slice(0, maxLines)
      const remainingLines = lines.length - maxLines
      displayContent = truncatedLines.join('\n') + `\n.......[${remainingLines}+] lines`
    } else {
      displayContent = lines.join('\n')
    }

    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(
        Text,
        {},
        applyMarkdown(displayContent)
      )
    )
  }
}
