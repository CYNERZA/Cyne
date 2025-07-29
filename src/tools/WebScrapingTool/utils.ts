import { CYNERZA_CRAWLER_API_URL } from './prompt'

export interface ScrapedData {
  markdown?: string
  html?: string
  text?: string
  structured?: any
  metadata: {
    title?: string
    description?: string
    author?: string
    keywords?: string
    language?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    ogUrl?: string
    favicon?: string
    scrapeId: string
    sourceURL: string
    url: string
    statusCode: number
    contentType: string
    proxyUsed?: string
    creditsUsed?: number
    [key: string]: any
  }
}

export async function performWebScraping(
  url: string, 
  formats: readonly string[] | string[] = ['markdown']
): Promise<ScrapedData> {
  try {
    const response = await fetch(CYNERZA_CRAWLER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: formats
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()
    
    if (!responseData.success) {
      throw new Error(`Scraping failed: ${responseData.error || 'Unknown error'}`)
    }

    return responseData.data as ScrapedData
  } catch (error: any) {
    throw new Error(`Failed to scrape website: ${error.message}`)
  }
}

export function formatScrapedContent(
  scrapedData: ScrapedData, 
  url: string, 
  formats: readonly string[] | string[]
): string {
  let output = `Web scraping results for: ${url}\n\n`
  
  // Add metadata section
  const { metadata } = scrapedData
  if (metadata) {
    output += '## Page Information\n'
    if (metadata.title) output += `**Title:** ${metadata.title}\n`
    if (metadata.description) output += `**Description:** ${metadata.description}\n`
    if (metadata.author) output += `**Author:** ${metadata.author}\n`
    if (metadata.language) output += `**Language:** ${metadata.language}\n`
    if (metadata.keywords) output += `**Keywords:** ${metadata.keywords}\n`
    if (metadata.statusCode) output += `**Status Code:** ${metadata.statusCode}\n`
    output += '\n'
  }

  // Add content based on requested formats
  formats.forEach(format => {
    const content = scrapedData[format as keyof ScrapedData]
    if (content && typeof content === 'string') {
      output += `## ${format.charAt(0).toUpperCase() + format.slice(1)} Content\n`
      
      if (format === 'markdown') {
        output += content
      } else if (format === 'html') {
        // Truncate HTML if too long for readability
        const truncatedHtml = content.length > 2000 
          ? content.substring(0, 2000) + '\n...\n[Content truncated for readability]'
          : content
        output += `\`\`\`html\n${truncatedHtml}\n\`\`\``
      } else if (format === 'text') {
        output += content
      }
      
      output += '\n\n'
    } else if (content && format === 'structured') {
      output += `## Structured Data\n`
      output += `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``
      output += '\n\n'
    }
  })

  // Add technical details
  if (metadata) {
    output += '## Technical Details\n'
    if (metadata.contentType) output += `**Content Type:** ${metadata.contentType}\n`
    if (metadata.scrapeId) output += `**Scrape ID:** ${metadata.scrapeId}\n`
    if (metadata.creditsUsed) output += `**Credits Used:** ${metadata.creditsUsed}\n`
    if (metadata.proxyUsed) output += `**Proxy Used:** ${metadata.proxyUsed}\n`
  }

  return output
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function sanitizeUrl(url: string): string {
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

export function renderMarkdownContent(content: string): string {
  // Enhanced terminal rendering for scraped content
  return content
    // Headers
    .replace(/^# (.+)$/gm, '\n\x1b[1m\x1b[4m\x1b[35m$1\x1b[0m\n')
    .replace(/^## (.+)$/gm, '\n\x1b[1m\x1b[36m$1\x1b[0m\n')
    .replace(/^### (.+)$/gm, '\n\x1b[1m\x1b[33m$1\x1b[0m')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '\x1b[1m$1\x1b[0m')
    .replace(/\*(.+?)\*/g, '\x1b[3m$1\x1b[0m')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x1b[34m$1\x1b[0m \x1b[2m($2)\x1b[0m')
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => `\x1b[100m\x1b[37m${match}\x1b[0m`)
    .replace(/`(.+?)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')
    // Lists
    .replace(/^- (.+)$/gm, '\x1b[32m•\x1b[0m $1')
    .replace(/^\d+\. (.+)$/gm, (match, p1, offset, string) => {
      const lineStart = string.lastIndexOf('\n', offset) + 1
      const lineContent = string.substring(lineStart, offset)
      const number = match.match(/^(\d+)\./)?.[1] || '1'
      return `\x1b[32m${number}.\x1b[0m ${p1}`
    })
}
