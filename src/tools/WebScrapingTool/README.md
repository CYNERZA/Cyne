# WebScrapingTool

A web scraping tool that uses the Cynerza crawler API to extract content from web pages in various formats.

## Files Structure

- **`WebScrapingTool.ts`** - Main tool implementation with the Tool interface
- **`prompt.ts`** - Tool prompts, constants, and configuration for AI handling
- **`utils.ts`** - Helper functions for API calls, content formatting, and validation
- **`index.ts`** - Export barrel file for clean imports
- **`README.md`** - Documentation explaining the structure and usage

## Features

- High-quality web page content extraction
- Multiple output formats (markdown, HTML, text, structured)
- Metadata extraction (title, description, author, keywords, etc.)
- OpenGraph and Twitter card data extraction
- Support for modern web applications with JavaScript rendering
- URL validation and sanitization
- Enhanced terminal output with colors
- Comprehensive error handling

## Usage

The tool accepts a URL and optional format specifications:
- `url` (required): The URL of the webpage to scrape
- `formats` (optional): Array of output formats - 'markdown', 'html', 'text', 'structured' (default: ['markdown'])

## API Integration

Uses the Cynerza crawler API at `https://crawler.cynerza.com/v1/scrape` with proper error handling and response formatting. The tool handles:
- HTTP errors and status codes
- Content type detection
- Proxy usage tracking
- Credit consumption monitoring

## Output Formats

- **Markdown**: Clean, formatted text ideal for reading and analysis
- **HTML**: Raw HTML content with all tags and structure preserved  
- **Text**: Plain text content with formatting removed
- **Structured**: JSON structure with content organized by sections

## Extracted Metadata

- Page title, description, author
- Keywords and language information
- OpenGraph and Twitter card data
- Favicon and image URLs
- Technical details (status code, content type, scrape ID)
- Credit usage and proxy information

## AI Prompt Handling

The `prompt.ts` file contains detailed prompts that help AI models understand:
- When web scraping is appropriate vs web search
- How to structure scraping requests
- What types of content can be extracted
- Expected output formats and metadata

This makes it easier for AI models to choose between web scraping for detailed content extraction vs web search for finding relevant pages.
