/**
 * Editor operation handlers
 */

import * as vscode from 'vscode'
import { ErrorCodes } from '../protocol'

/**
 * Get current editor context
 */
export async function handleEditorContext(): Promise<{
  activeFile: string
  language: string
  workspace: string
  selection?: {
    text: string
    startLine: number
    endLine: number
    startColumn: number
    endColumn: number
  }
  openTabs: string[]
  hasActiveEditor: boolean
}> {
  const editor = vscode.window.activeTextEditor
  const workspaceFolders = vscode.workspace.workspaceFolders

  const openTabs = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter((tab) => tab.input instanceof vscode.TabInputText)
    .map((tab) => (tab.input as vscode.TabInputText).uri.fsPath)

  if (!editor) {
    return {
      activeFile: '',
      language: '',
      workspace: workspaceFolders?.[0]?.uri.fsPath || '',
      openTabs,
      hasActiveEditor: false,
    }
  }

  const selection = editor.selection
  let selectionData: any = undefined

  if (!selection.isEmpty) {
    selectionData = {
      text: editor.document.getText(selection),
      startLine: selection.start.line + 1,
      endLine: selection.end.line + 1,
      startColumn: selection.start.character + 1,
      endColumn: selection.end.character + 1,
    }
  }

  return {
    activeFile: editor.document.uri.fsPath,
    language: editor.document.languageId,
    workspace: workspaceFolders?.[0]?.uri.fsPath || '',
    selection: selectionData,
    openTabs,
    hasActiveEditor: true,
  }
}

/**
 * Go to a specific line/column
 */
export async function handleEditorGoto(params: {
  line: number
  column?: number
  reveal?: 'center' | 'top' | 'bottom'
}): Promise<{ success: boolean }> {
  const editor = vscode.window.activeTextEditor

  if (!editor) {
    throw { code: ErrorCodes.EditorNotOpen, message: 'No active editor' }
  }

  const line = Math.max(0, params.line - 1)
  const column = Math.max(0, (params.column || 1) - 1)
  const position = new vscode.Position(line, column)

  editor.selection = new vscode.Selection(position, position)

  let revealType = vscode.TextEditorRevealType.InCenter
  if (params.reveal === 'top') {
    revealType = vscode.TextEditorRevealType.AtTop
  } else if (params.reveal === 'bottom') {
    revealType = vscode.TextEditorRevealType.InCenter // VS Code doesn't have AtBottom
  }

  editor.revealRange(new vscode.Range(position, position), revealType)

  return { success: true }
}

/**
 * Format document
 */
export async function handleEditorFormat(params: {
  path?: string
  range?: { startLine: number; endLine: number }
}): Promise<{ success: boolean }> {
  let document: vscode.TextDocument

  if (params.path) {
    const uri = vscode.Uri.file(params.path)
    document = await vscode.workspace.openTextDocument(uri)
    await vscode.window.showTextDocument(document)
  } else {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      throw { code: ErrorCodes.EditorNotOpen, message: 'No active editor' }
    }
    document = editor.document
  }

  if (params.range) {
    const range = new vscode.Range(
      params.range.startLine - 1,
      0,
      params.range.endLine,
      0
    )
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      'vscode.executeFormatRangeProvider',
      document.uri,
      range
    )
    if (edits) {
      const workspaceEdit = new vscode.WorkspaceEdit()
      workspaceEdit.set(document.uri, edits)
      await vscode.workspace.applyEdit(workspaceEdit)
    }
  } else {
    await vscode.commands.executeCommand('editor.action.formatDocument')
  }

  await document.save()

  return { success: true }
}
