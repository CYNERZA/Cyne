/**
 * File operation handlers
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { ErrorCodes } from '../protocol'

/**
 * Read file content
 */
export async function handleFileRead(params: {
  path: string
  startLine?: number
  endLine?: number
}): Promise<{
  content: string
  language: string
  totalLines: number
}> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)

  try {
    const document = await vscode.workspace.openTextDocument(uri)
    const totalLines = document.lineCount

    let content: string
    if (params.startLine !== undefined || params.endLine !== undefined) {
      const startLine = Math.max(0, (params.startLine || 1) - 1)
      const endLine = Math.min(totalLines, params.endLine || totalLines)
      const range = new vscode.Range(startLine, 0, endLine, 0)
      content = document.getText(range)
    } else {
      content = document.getText()
    }

    return {
      content,
      language: document.languageId,
      totalLines,
    }
  } catch (error) {
    throw {
      code: ErrorCodes.FileNotFound,
      message: `File not found: ${params.path}`,
    }
  }
}

/**
 * Create a new file
 */
export async function handleFileCreate(params: {
  path: string
  content: string
}): Promise<{ success: boolean }> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)
  const content = Buffer.from(params.content, 'utf8')

  await vscode.workspace.fs.writeFile(uri, content)

  // Open the file in editor
  const document = await vscode.workspace.openTextDocument(uri)
  await vscode.window.showTextDocument(document)

  return { success: true }
}

/**
 * Edit an existing file with diff preview
 */
export async function handleFileEdit(params: {
  path: string
  oldContent: string
  newContent: string
}): Promise<{ success: boolean; editId?: string }> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)

  try {
    const document = await vscode.workspace.openTextDocument(uri)
    const text = document.getText()

    const index = text.indexOf(params.oldContent)
    if (index === -1) {
      throw {
        code: ErrorCodes.InvalidParams,
        message: 'Old content not found in file',
      }
    }

    const startPos = document.positionAt(index)
    const endPos = document.positionAt(index + params.oldContent.length)
    const range = new vscode.Range(startPos, endPos)

    // Apply the edit
    const edit = new vscode.WorkspaceEdit()
    edit.replace(uri, range, params.newContent)
    await vscode.workspace.applyEdit(edit)

    // Save the file
    await document.save()

    // Show the file in editor with diff decoration
    await vscode.window.showTextDocument(document)

    // Import and use diff manager to show preview
    const { showDiffPreview } = await import('../diffManager')
    const editId = await showDiffPreview(uri, range, params.oldContent, params.newContent)

    return { success: true, editId }
  } catch (error: any) {
    if (error.code) {
      throw error
    }
    throw {
      code: ErrorCodes.FileNotFound,
      message: `Failed to edit file: ${error.message || error}`,
    }
  }
}

/**
 * Open a file in editor
 */
export async function handleFileOpen(params: {
  path: string
  line?: number
  column?: number
  preview?: boolean
}): Promise<{ success: boolean }> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    throw { code: ErrorCodes.FileNotFound, message: 'No workspace folder open' }
  }

  const filePath = path.isAbsolute(params.path)
    ? params.path
    : path.join(workspaceFolders[0].uri.fsPath, params.path)

  const uri = vscode.Uri.file(filePath)

  try {
    const document = await vscode.workspace.openTextDocument(uri)

    const options: vscode.TextDocumentShowOptions = {
      preview: params.preview ?? false,
    }

    if (params.line !== undefined) {
      const line = Math.max(0, params.line - 1)
      const column = Math.max(0, (params.column || 1) - 1)
      options.selection = new vscode.Range(line, column, line, column)
    }

    await vscode.window.showTextDocument(document, options)

    return { success: true }
  } catch (error: any) {
    throw {
      code: ErrorCodes.FileNotFound,
      message: `Failed to open file: ${error.message || error}`,
    }
  }
}
