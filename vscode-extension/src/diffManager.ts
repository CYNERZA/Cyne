/**
 * Diff Manager - Shows inline diff decorations with Accept/Reject buttons
 * Similar to GitHub Copilot's inline edit preview
 */

import * as vscode from 'vscode'

interface PendingEdit {
  uri: vscode.Uri
  originalContent: string
  newContent: string
  range: vscode.Range
  decorationType: vscode.TextEditorDecorationType
  editId: string
}

// Store pending edits that can be accepted/rejected
const pendingEdits: Map<string, PendingEdit> = new Map()
let editIdCounter = 0

// Decoration types for added/removed lines
const addedLineDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
  isWholeLine: true,
  overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.addedForeground'),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
})

/**
 * Show a diff preview for an edit with Accept/Reject options
 */
export async function showDiffPreview(
  uri: vscode.Uri,
  range: vscode.Range,
  originalContent: string,
  newContent: string
): Promise<string> {
  const editId = `cyne-edit-${++editIdCounter}`
  
  // Store the pending edit for potential rejection
  pendingEdits.set(editId, {
    uri,
    originalContent,
    newContent,
    range,
    decorationType: addedLineDecoration,
    editId,
  })

  // Get the editor and add decorations
  const editor = vscode.window.visibleTextEditors.find(
    e => e.document.uri.toString() === uri.toString()
  )

  if (editor) {
    // Calculate the range of new content
    const document = editor.document
    const startPos = range.start
    const newLines = newContent.split('\n').length
    const endPos = new vscode.Position(startPos.line + newLines - 1, 
      newContent.split('\n').pop()?.length || 0)
    const newRange = new vscode.Range(startPos, endPos)

    // Apply decoration to highlight the new content
    editor.setDecorations(addedLineDecoration, [newRange])

    // Show accept/reject notification
    showAcceptRejectNotification(editId, uri.fsPath)
  }

  return editId
}

/**
 * Show notification with Accept/Reject buttons
 */
async function showAcceptRejectNotification(editId: string, filePath: string): Promise<void> {
  const fileName = filePath.split('/').pop() || filePath

  const result = await vscode.window.showInformationMessage(
    `Cyne edited: ${fileName}`,
    { modal: false },
    'Accept',
    'Reject'
  )

  if (result === 'Accept') {
    await acceptEdit(editId)
  } else if (result === 'Reject') {
    await rejectEdit(editId)
  } else {
    // Dismissed without action - auto-accept after timeout
    // For now, just accept
    await acceptEdit(editId)
  }
}

/**
 * Accept an edit - just clear the decoration
 */
export async function acceptEdit(editId: string): Promise<boolean> {
  const pending = pendingEdits.get(editId)
  if (!pending) {
    return false
  }

  // Clear decorations
  clearDecorations(pending.uri)
  
  // Remove from pending
  pendingEdits.delete(editId)

  vscode.window.setStatusBarMessage('✓ Edit accepted', 2000)
  return true
}

/**
 * Reject an edit - restore original content
 */
export async function rejectEdit(editId: string): Promise<boolean> {
  const pending = pendingEdits.get(editId)
  if (!pending) {
    return false
  }

  try {
    // Open the document
    const document = await vscode.workspace.openTextDocument(pending.uri)
    const text = document.getText()

    // Find where the new content is and replace with original
    const newContentIndex = text.indexOf(pending.newContent)
    if (newContentIndex !== -1) {
      const startPos = document.positionAt(newContentIndex)
      const endPos = document.positionAt(newContentIndex + pending.newContent.length)
      const range = new vscode.Range(startPos, endPos)

      const edit = new vscode.WorkspaceEdit()
      edit.replace(pending.uri, range, pending.originalContent)
      await vscode.workspace.applyEdit(edit)
      await document.save()
    }

    // Clear decorations
    clearDecorations(pending.uri)
    
    // Remove from pending
    pendingEdits.delete(editId)

    vscode.window.setStatusBarMessage('✗ Edit rejected', 2000)
    return true
  } catch (error) {
    console.error('Failed to reject edit:', error)
    return false
  }
}

/**
 * Clear all decorations for a URI
 */
function clearDecorations(uri: vscode.Uri): void {
  const editor = vscode.window.visibleTextEditors.find(
    e => e.document.uri.toString() === uri.toString()
  )
  if (editor) {
    editor.setDecorations(addedLineDecoration, [])
  }
}

/**
 * Accept all pending edits
 */
export async function acceptAllEdits(): Promise<void> {
  for (const editId of pendingEdits.keys()) {
    await acceptEdit(editId)
  }
}

/**
 * Reject all pending edits
 */
export async function rejectAllEdits(): Promise<void> {
  for (const editId of pendingEdits.keys()) {
    await rejectEdit(editId)
  }
}

/**
 * Get pending edit count
 */
export function getPendingEditCount(): number {
  return pendingEdits.size
}

/**
 * Dispose all decorations
 */
export function dispose(): void {
  addedLineDecoration.dispose()
  pendingEdits.clear()
}
