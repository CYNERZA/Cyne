import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { randomUUID } from 'crypto'

export interface ScrapedData {
  markdown?: string
  html?: string
  text?: string
  structured?: {
    headings: { level: number; text: string }[]
    links: { text: string; href: string }[]
    images: { alt: string; src: string }[]
    lists: string[][]
  }
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
    scrapedAt: string
    [key: string]: any
  }
}

// Selectors for main content detection
const MAIN_CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '.main-content',
  '#content',
  '#main-content',
  '.prose',
  '.markdown-body',
]

// Selectors for noise elements to remove
const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'header:not(article header)',
  'footer',
  'aside',
  '.sidebar',
  '.advertisement',
  '.ads',
  '.ad-container',
  '.cookie-banner',
  '.popup',
  '.modal',
  '.comments',
  '#comments',
  '.share-buttons',
  '.social-share',
  '.related-posts',
  '.newsletter',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
]

// User agents for realistic requests
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export async function performWebScraping(
  url: string,
  formats: readonly string[] | string[] = ['markdown']
): Promise<ScrapedData> {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()
  const contentType = response.headers.get('content-type') || 'text/html'

  // Parse with Cheerio
  const $ = cheerio.load(html)

  // Extract metadata first
  const metadata = extractMetadata($, url, response.status, contentType)

  // Remove noise elements
  NOISE_SELECTORS.forEach(selector => {
    $(selector).remove()
  })

  // Extract content in requested formats
  const result: ScrapedData = { metadata }

  for (const format of formats) {
    switch (format) {
      case 'markdown':
        result.markdown = extractMarkdown($)
        break
      case 'html':
        result.html = extractCleanHtml($)
        break
      case 'text':
        result.text = extractPlainText($)
        break
      case 'structured':
        result.structured = extractStructuredData($)
        break
    }
  }

  return result
}

function extractMetadata(
  $: cheerio.CheerioAPI,
  url: string,
  statusCode: number,
  contentType: string
): ScrapedData['metadata'] {
  const getMeta = (name: string): string | undefined => {
    return $(`meta[name="${name}"]`).attr('content') ||
      $(`meta[property="${name}"]`).attr('content') ||
      undefined
  }

  return {
    title: $('title').text().trim() || undefined,
    description: getMeta('description') || getMeta('og:description'),
    author: getMeta('author'),
    keywords: getMeta('keywords'),
    language: $('html').attr('lang') || undefined,
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description'),
    ogImage: getMeta('og:image'),
    ogUrl: getMeta('og:url'),
    favicon: $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || undefined,
    scrapeId: randomUUID(),
    sourceURL: url,
    url: url,
    statusCode,
    contentType,
    scrapedAt: new Date().toISOString(),
  }
}

function findMainContent($: cheerio.CheerioAPI): cheerio.Cheerio<cheerio.Element> {
  // Try to find the main content area
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const el = $(selector)
    if (el.length > 0 && (el.text().trim().length > 100)) {
      return el.first()
    }
  }
  // Fallback to body
  return $('body')
}

function extractMarkdown($: cheerio.CheerioAPI): string {
  const mainContent = findMainContent($)
  const html = mainContent.html() || ''

  // Convert to markdown using Turndown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  })

  // Add rule to skip empty links
  turndown.addRule('skipEmptyLinks', {
    filter: (node) => {
      return node.nodeName === 'A' && !node.textContent?.trim()
    },
    replacement: () => ''
  })

  // Add rule for better image handling
  turndown.addRule('images', {
    filter: 'img',
    replacement: (content, node) => {
      const alt = (node as HTMLElement).getAttribute('alt') || ''
      const src = (node as HTMLElement).getAttribute('src') || ''
      if (!src) return ''
      return `![${alt}](${src})`
    }
  })

  let markdown = turndown.turndown(html)

  // Clean up the markdown
  markdown = markdown
    // Remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Remove lines that are just whitespace
    .replace(/^\s+$/gm, '')
    // Clean up excessive link text
    .replace(/\[([^\]]{200,})\]/g, (match, text) => `[${text.slice(0, 100)}...]`)
    // Trim
    .trim()

  return markdown
}

function extractCleanHtml($: cheerio.CheerioAPI): string {
  const mainContent = findMainContent($)
  return mainContent.html() || ''
}

function extractPlainText($: cheerio.CheerioAPI): string {
  const mainContent = findMainContent($)
  let text = mainContent.text()

  // Clean up text
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()

  return text
}

function extractStructuredData($: cheerio.CheerioAPI): ScrapedData['structured'] {
  const headings: { level: number; text: string }[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = $(el).prop('tagName')
    if (tagName) {
      headings.push({
        level: parseInt(tagName[1]),
        text: $(el).text().trim()
      })
    }
  })

  const links: { text: string; href: string }[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const text = $(el).text().trim()
    if (href && text && !href.startsWith('javascript:')) {
      links.push({ text: text.slice(0, 200), href })
    }
  })

  const images: { alt: string; src: string }[] = []
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')
    const alt = $(el).attr('alt') || ''
    if (src) {
      images.push({ alt, src })
    }
  })

  const lists: string[][] = []
  $('ul, ol').each((_, list) => {
    const items: string[] = []
    $(list).find('> li').each((_, li) => {
      const text = $(li).text().trim()
      if (text) items.push(text.slice(0, 500))
    })
    if (items.length > 0) lists.push(items)
  })

  return { headings, links, images, lists }
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
    if (metadata.scrapedAt) output += `**Scraped At:** ${metadata.scrapedAt}\n`
  }

  return output
}

export function formatScrapedContentForUI(
  scrapedData: ScrapedData,
  formats: readonly string[] | string[]
): string {
  let output = ''

  // Add only the content without metadata for UI display
  formats.forEach(format => {
    const content = scrapedData[format as keyof ScrapedData]
    if (content && typeof content === 'string') {
      if (format === 'markdown') {
        // Strip markdown formatting for cleaner display
        const plainText = content
          // Remove headers (# ## ###)
          .replace(/^#{1,6}\s+(.+)$/gm, '$1')
          // Remove bold (**text**)
          .replace(/\*\*(.+?)\*\*/g, '$1')
          // Remove italic (*text*)
          .replace(/\*(.+?)\*/g, '$1')
          // Remove links [text](url)
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          // Remove images ![alt](url)
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
          // Remove code blocks ```
          .replace(/```[\s\S]*?```/g, (match) => {
            const lines = match.split('\n')
            return lines.slice(1, -1).join('\n')
          })
          // Remove inline code `text`
          .replace(/`([^`]+)`/g, '$1')
          // Clean up multiple newlines
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        output += plainText
      } else if (format === 'html') {
        // Truncate HTML if too long for readability
        const truncatedHtml = content.length > 2000
          ? content.substring(0, 2000) + '\n...\n[Content truncated for readability]'
          : content
        output += `\`\`\`html\n${truncatedHtml}\n\`\`\``
      } else if (format === 'text') {
        output += content
      }

      if (formats.length > 1) output += '\n\n'
    } else if (content && format === 'structured') {
      output += `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``
      if (formats.length > 1) output += '\n\n'
    }
  })

  return output.trim()
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
