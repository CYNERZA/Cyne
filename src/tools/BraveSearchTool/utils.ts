import { BRAVE_API_BASE_URL, DEFAULT_API_TOKEN, MAX_DISPLAY_RESULTS } from './prompt'

// Enhanced terminal markdown renderer with better styling
export function renderMarkdownToTerminal(markdown: string): string {
  return markdown
    // Main headers (##)
    .replace(/^## (.+)$/gm, '\n\x1b[1m\x1b[4m\x1b[36m$1\x1b[0m\n')
    // Numbered list items with titles
    .replace(/^(\d+)\. \*\*(.+?)\*\*$/gm, '\x1b[1m\x1b[32m$1.\x1b[0m \x1b[1m\x1b[37m$2\x1b[0m')
    // HTML strong tags to bold
    .replace(/<strong>(.+?)<\/strong>/g, '\x1b[1m\x1b[37m$1\x1b[0m')
    // Bold text (keep existing)
    .replace(/\*\*(.+?)\*\*/g, '\x1b[1m\x1b[37m$1\x1b[0m')
    // URLs
    .replace(/^   URL: (.+)$/gm, '   \x1b[2m\x1b[34m🔗 $1\x1b[0m')
    .replace(/^   Source: (.+)$/gm, '   \x1b[2m\x1b[34m📚 $1\x1b[0m')
    // Descriptions (indented lines that aren't URLs)
    .replace(/^   (?!URL:|Source:)(.+)$/gm, '   \x1b[90m$1\x1b[0m')
    // Code snippets
    .replace(/`(.+?)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')
    // Add some spacing
    .replace(/\n\n/g, '\n\n')
}

export async function performBraveSearch(query: string, count: number, country: string) {
  const BRAVE_API_TOKEN = process.env.BRAVE_API_TOKEN || DEFAULT_API_TOKEN
  
  const searchUrl = `${BRAVE_API_BASE_URL}?q=${encodeURIComponent(query)}&count=${count}&country=${country}`
  
  try {
    const response = await fetch(searchUrl, {
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
    
    const responseData = await response.json()
    
    // Parse and format the response
    return formatBraveSearchResults(responseData)
  } catch (error: any) {
    throw new Error(`Failed to fetch from Brave Search: ${error.message}`)
  }
}

export function formatBraveSearchResults(apiData: any) {
  const formattedResults = {
    query_info: {
      original: apiData.query?.original || '',
      country: apiData.query?.country || 'us',
      is_navigational: apiData.query?.is_navigational || false,
      more_results_available: apiData.query?.more_results_available || false
    },
    web_results: [],
    faq_results: [],
    total_results: 0
  }
  
  // Process web results
  if (apiData.web?.results) {
    formattedResults.web_results = apiData.web.results.map((webResult: any) => ({
      title: webResult.title || '',
      url: webResult.url || '',
      description: webResult.description || '',
      thumbnail: webResult.thumbnail?.src || null,
      favicon: webResult.meta_url?.favicon || null,
      language: webResult.language || 'en',
      family_friendly: webResult.family_friendly || true,
      page_age: webResult.page_age || null,
      profile: {
        name: webResult.profile?.name || '',
        long_name: webResult.profile?.long_name || ''
      }
    }))
    formattedResults.total_results += formattedResults.web_results.length
  }
  
  // Process FAQ results
  if (apiData.faq?.results) {
    formattedResults.faq_results = apiData.faq.results.map((faqResult: any) => ({
      question: faqResult.question || '',
      answer: faqResult.answer?.replace(/<[^>]*>/g, '') || '', // Strip HTML tags
      title: faqResult.title || '',
      url: faqResult.url || ''
    }))
    formattedResults.total_results += formattedResults.faq_results.length
  }
  
  return formattedResults
}

export function createSearchResultOutput(searchData: any): string {
  if (!searchData.success) {
    return `Search failed: ${searchData.error}`
  }
  
  const { results } = searchData
  if (!results) {
    return `No results found for "${searchData.query}"`
  }
  
  const hasWebResults = results.web_results && results.web_results.length > 0
  const hasFaqResults = results.faq_results && results.faq_results.length > 0
  
  if (!hasWebResults && !hasFaqResults) {
    return `No results found for "${searchData.query}"`
  }
  
  let outputText = `Search results for "${searchData.query}":\n\n`
  
  // Add FAQ results first if available
  if (hasFaqResults) {
    outputText += '## FAQ Results:\n'
    results.faq_results.forEach((faqItem: any, index: number) => {
      outputText += `${index + 1}. **${faqItem.question}**\n`
      outputText += `   ${faqItem.answer}\n`
      if (faqItem.url) {
        outputText += `   Source: ${faqItem.url}\n`
      }
      outputText += '\n'
    })
  }
  
  // Add web results (limit to MAX_DISPLAY_RESULTS, show ... if more)
  if (hasWebResults) {
    outputText += '## Web Results:\n'
    const displayResults = results.web_results.slice(0, MAX_DISPLAY_RESULTS)
    displayResults.forEach((webResult: any, index: number) => {
      outputText += `${index + 1}. **${webResult.title}**\n`
      outputText += `   ${webResult.description}\n`
      outputText += `   URL: ${webResult.url}\n\n`
    })
    if (results.web_results.length > MAX_DISPLAY_RESULTS) {
      outputText += '...\n'
    }
  }
  
  return outputText
}
