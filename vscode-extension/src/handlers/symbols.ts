/**
 * Symbol operation handlers
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { ErrorCodes } from '../protocol'

/**
 * Go to definition
 */
export async function handleSymbolDefinition(params: {
  path: string
  line: number
  column: number
}): Promise<{
  locations: Array<{
    file: string
    line: number
    column: number
  }>
}> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)
  const position = new vscode.Position(params.line - 1, params.column - 1)

  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeDefinitionProvider',
    uri,
    position
  )

  return {
    locations: (locations || []).map((loc) => ({
      file: vscode.workspace.asRelativePath(loc.uri),
      line: loc.range.start.line + 1,
      column: loc.range.start.character + 1,
    })),
  }
}

/**
 * Find references
 */
export async function handleSymbolReferences(params: {
  path: string
  line: number
  column: number
}): Promise<{
  locations: Array<{
    file: string
    line: number
    column: number
    preview?: string
  }>
}> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)
  const position = new vscode.Position(params.line - 1, params.column - 1)

  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    uri,
    position
  )

  const results: Array<{
    file: string
    line: number
    column: number
    preview?: string
  }> = []

  for (const loc of locations || []) {
    let preview: string | undefined
    try {
      const doc = await vscode.workspace.openTextDocument(loc.uri)
      preview = doc.lineAt(loc.range.start.line).text.trim()
    } catch {
      // Ignore preview errors
    }

    results.push({
      file: vscode.workspace.asRelativePath(loc.uri),
      line: loc.range.start.line + 1,
      column: loc.range.start.character + 1,
      preview,
    })
  }

  return { locations: results }
}

/**
 * Rename symbol
 */
export async function handleSymbolRename(params: {
  path: string
  line: number
  column: number
  newName: string
}): Promise<{ success: boolean; changedFiles: number }> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)
  const position = new vscode.Position(params.line - 1, params.column - 1)

  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    uri,
    position,
    params.newName
  )

  if (!edit) {
    throw {
      code: ErrorCodes.InvalidParams,
      message: 'Could not rename symbol at this position',
    }
  }

  const changedFiles = edit.entries().length
  await vscode.workspace.applyEdit(edit)

  return { success: true, changedFiles }
}
