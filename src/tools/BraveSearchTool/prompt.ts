export const TOOL_NAME = 'brave_search'
export const TOOL_NAME_FOR_PROMPT = 'BraveSearch'

export const MAX_SEARCH_RESULTS = 20
export const DEFAULT_SEARCH_COUNT = 20
export const DEFAULT_COUNTRY = 'us'
export const MAX_DISPLAY_RESULTS = 4

export const SUPPORTED_COUNTRIES = [
  'us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr', 'in', 'br', 'mx'
]

// API Configuration
export const BRAVE_API_BASE_URL = 'https://api.search.brave.com/res/v1/web/search'
export const DEFAULT_API_TOKEN = 'BSAzFTVZtJfGuFmmhHgxrM67UZgoOHS'

export const PROMPT = `Search the web using Brave Search API for real-time, current information and up-to-date content.

This tool provides:
- Real-time web search results with current information
- FAQ-style results for direct answers to questions
- Localized search results based on country preference
- Clean, formatted results with titles, descriptions, and URLs
- Support for various search queries including factual lookups, current events, and research

Key features:
- Returns both web results and FAQ results when available
- Supports 1-20 results per search (default: 20)
- Country-specific results (default: US)
- Filtered and formatted output optimized for AI analysis
- Handles search failures gracefully with error reporting

Use this tool when you need:
- Current information that may not be in your training data
- Real-time facts, news, or events
- Specific information about products, services, or organizations
- Research on recent developments or trends
- Verification of current status or availability

The tool returns structured data including titles, descriptions, URLs, and when available, direct FAQ-style answers to questions.`

export const SEARCH_EXAMPLES = [
  'latest news about artificial intelligence',
  'current weather in New York',
  'best restaurants in Tokyo 2025',
  'how to install Node.js on Ubuntu',
  'what is the capital of Australia',
  'recent developments in quantum computing'
]
