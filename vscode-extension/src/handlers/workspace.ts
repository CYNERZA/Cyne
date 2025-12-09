/**
 * Workspace operation handlers
 */

import * as vscode from 'vscode'

/**
 * List files matching a glob pattern
 */
export async function handleWorkspaceFiles(params: {
  pattern: string
  maxResults?: number
}): Promise<{ files: string[] }> {
  const maxResults = params.maxResults || 1000
  const uris = await vscode.workspace.findFiles(params.pattern, '**/node_modules/**', maxResults)
  
  const files = uris.map((uri) => {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders?.length) {
      const relativePath = vscode.workspace.asRelativePath(uri)
      return relativePath
    }
    return uri.fsPath
  })

  return { files }
}

/**
 * Search in workspace
 * Uses findFiles + document text matching since findTextInFiles is not available in all VS Code versions
 */
export async function handleWorkspaceSearch(params: {
  query: string
  pattern?: string
  isRegex?: boolean
  caseSensitive?: boolean
  maxResults?: number
}): Promise<{
  results: Array<{
    file: string
    line: number
    column: number
    text: string
  }>
}> {
  const results: Array<{
    file: string
    line: number
    column: number
    text: string
  }> = []

  const maxResults = params.maxResults || 100
  const includePattern = params.pattern || '**/*'

  // Find files matching the pattern
  const files = await vscode.workspace.findFiles(
    includePattern,
    '**/node_modules/**',
    500 // Limit files to search
  )

  // Create search regex
  let searchPattern: RegExp
  try {
    if (params.isRegex) {
      searchPattern = new RegExp(
        params.query,
        params.caseSensitive ? 'g' : 'gi'
      )
    } else {
      // Escape special regex characters for literal search
      const escaped = params.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      searchPattern = new RegExp(
        escaped,
        params.caseSensitive ? 'g' : 'gi'
      )
    }
  } catch {
    // Invalid regex, fall back to literal search
    const escaped = params.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    searchPattern = new RegExp(escaped, 'gi')
  }

  // Search in each file
  for (const uri of files) {
    if (results.length >= maxResults) break

    try {
      const document = await vscode.workspace.openTextDocument(uri)
      const text = document.getText()
      
      // Find all matches
      let match: RegExpExecArray | null
      // Reset lastIndex for global regex
      searchPattern.lastIndex = 0
      
      while ((match = searchPattern.exec(text)) !== null && results.length < maxResults) {
        const pos = document.positionAt(match.index)
        const lineText = document.lineAt(pos.line).text
        
        results.push({
          file: vscode.workspace.asRelativePath(uri),
          line: pos.line + 1,
          column: pos.character + 1,
          text: lineText.trim().slice(0, 200), // Limit line preview length
        })
        
        // Prevent infinite loop on zero-width matches
        if (match.index === searchPattern.lastIndex) {
          searchPattern.lastIndex++
        }
      }
    } catch {
      // Skip files that can't be opened (binary files, etc.)
      continue
    }
  }

  return { results }
}
