# BraveSearchTool

A web search tool that uses the Brave Search API to provide real-time information and current web results.

## Files Structure

- **`BraveSearchTool.ts`** - Main tool implementation with the Tool interface
- **`prompt.ts`** - Tool prompts, constants, and configuration for AI handling
- **`utils.ts`** - Helper functions for search API calls and result formatting
- **`index.ts`** - Export barrel file for clean imports

## Features

- Real-time web search using Brave Search API
- FAQ-style results for direct answers
- Localized search results by country
- Formatted terminal output with colors
- Support for 1-20 results per search
- Error handling and validation
- Clean, structured output for AI analysis

## Usage

The tool accepts a search query and optional parameters:
- `query` (required): The search query string
- `count` (optional): Number of results (1-20, default: 20)
- `country` (optional): Country code for localization (default: 'us')

## API Integration

Uses the Brave Search API with proper error handling and response formatting. The tool formats raw API responses into structured data with web results and FAQ results.

## AI Prompt Handling

The `prompt.ts` file contains detailed prompts and examples that help AI models understand:
- When to use the tool
- How to structure search queries
- What types of information the tool provides
- Expected output formats

This structured approach makes it easier for AI models to effectively utilize the search capabilities.
