export const TOOL_NAME = 'web_scraping'
export const TOOL_NAME_FOR_PROMPT = 'WebScraping'

export const CYNERZA_CRAWLER_API_URL = 'https://crawler.cynerza.com/v1/scrape'
export const DEFAULT_FORMATS = ['markdown'] as const
export const SUPPORTED_FORMATS = ['markdown', 'html', 'text', 'structured'] as const

export const PROMPT = `Extract and scrape content from web pages using the Cynerza crawler API for detailed content analysis and information extraction.

This tool provides:
- High-quality web page content extraction in multiple formats
- Markdown conversion for clean, readable text
- Metadata extraction including titles, descriptions, and OpenGraph data
- Support for modern web applications with JavaScript rendering
- Structured data extraction from complex web pages
- Image and media URL extraction
- SEO and social media metadata collection

Key features:
- Returns clean, formatted content optimized for AI analysis
- Extracts both visible content and important metadata
- Handles dynamic content and single-page applications
- Provides structured data including titles, descriptions, keywords
- Supports multiple output formats (markdown, HTML, text, structured)
- Reliable scraping with proxy support and error handling

Use this tool when you need to:
- Extract content from specific web pages for analysis
- Get clean, readable text from articles, blogs, or documentation
- Analyze website content, structure, and metadata
- Research information from specific URLs
- Extract data from web pages that aren't indexed in search results
- Get detailed content that goes beyond search result snippets
- Access content from pages that require JavaScript rendering

The tool returns structured data including:
- Clean markdown or HTML content
- Page metadata (title, description, author, keywords)
- OpenGraph and Twitter card data
- Images and media URLs
- Language and encoding information
- HTTP status and technical details

This is particularly useful for in-depth content analysis, research, and when you need the full content of a specific page rather than just search results.`

export const SCRAPING_EXAMPLES = [
  'https://example.com/article - Extract article content',
  'https://docs.example.com/api - Get documentation content',
  'https://blog.example.com/post - Scrape blog post content',
  'https://news.example.com/story - Extract news article',
  'https://company.com/about - Get company information',
  'https://product.com/features - Extract product details'
]

export const OUTPUT_FORMAT_DESCRIPTIONS = {
  markdown: 'Clean, formatted markdown text ideal for reading and analysis',
  html: 'Raw HTML content with all tags and structure preserved',
  text: 'Plain text content with formatting removed',
  structured: 'JSON structure with content organized by sections and elements'
}
