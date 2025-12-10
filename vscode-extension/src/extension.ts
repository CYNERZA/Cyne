/**
 * Cyne VS Code Extension
 * Provides socket-based communication with Cyne CLI for AI-powered coding
 */

import * as vscode from 'vscode'
import { SocketServer } from './socketServer'
import { registerWorkspace, unregisterWorkspace, updatePing } from './registry'

// Handler imports
import { handleFileRead, handleFileCreate, handleFileEdit, handleFileOpen } from './handlers/file'
import { handleEditorContext, handleEditorGoto, handleEditorFormat } from './handlers/editor'
import { handleWorkspaceFiles, handleWorkspaceSearch } from './handlers/workspace'
import { handleTerminalExecute, handleTerminalList } from './handlers/terminal'
import { handleDiagnosticsGet } from './handlers/diagnostics'
import { handleSymbolDefinition, handleSymbolReferences, handleSymbolRename } from './handlers/symbols'
import { handleNotification, handleTaskCompletion, handleProgressNotification } from './handlers/notification'
import * as diffManager from './diffManager'
import * as brainPanel from './brainPanel'

let socketServer: SocketServer | null = null
let statusBarItem: vscode.StatusBarItem | null = null
let outputChannel: vscode.OutputChannel

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('Cyne')
  outputChannel.appendLine('Cyne extension activating...')

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  statusBarItem.command = 'cyne.showStatus'
  context.subscriptions.push(statusBarItem)

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cyne.showStatus', showStatus),
    vscode.commands.registerCommand('cyne.reconnect', reconnect),
    vscode.commands.registerCommand('cyne.acceptAllEdits', diffManager.acceptAllEdits),
    vscode.commands.registerCommand('cyne.rejectAllEdits', diffManager.rejectAllEdits),
    vscode.commands.registerCommand('cyne.openBrain', () => brainPanel.openBrainPanel(context))
  )

  // Start socket server if auto-start is enabled
  const config = vscode.workspace.getConfiguration('cyne')
  if (config.get<boolean>('autoStart', true)) {
    await startServer()
  }

  // Handle workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await restartServer()
    })
  )

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: async () => {
      await stopServer()
    },
  })

  outputChannel.appendLine('Cyne extension activated')
}

/**
 * Extension deactivation
 */
export async function deactivate(): Promise<void> {
  await stopServer()
  outputChannel?.appendLine('Cyne extension deactivated')
}

/**
 * Start the socket server
 */
async function startServer(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders?.length) {
    updateStatusBar('$(warning) Cyne: No workspace', 'No workspace folder open')
    return
  }

  const workspacePath = workspaceFolders[0].uri.fsPath

  try {
    // Create and start socket server
    socketServer = new SocketServer(workspacePath, outputChannel)

    // Register all RPC handlers
    registerHandlers(socketServer)

    await socketServer.start()

    // Register workspace in the registry
    registerWorkspace(workspacePath)

    // Update status bar
    const showStatusBar = vscode.workspace
      .getConfiguration('cyne')
      .get<boolean>('showStatusBarItem', true)

    if (showStatusBar) {
      updateStatusBar('$(plug) Cyne', 'Connected to Cyne CLI')
      statusBarItem?.show()
    }

    outputChannel.appendLine(`Socket server started for workspace: ${workspacePath}`)
  } catch (error) {
    outputChannel.appendLine(`Failed to start socket server: ${error}`)
    updateStatusBar('$(error) Cyne: Error', 'Failed to start socket server')
    vscode.window.showErrorMessage(`Cyne: Failed to start socket server: ${error}`)
  }
}

/**
 * Stop the socket server
 */
async function stopServer(): Promise<void> {
  if (socketServer) {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders?.length) {
      unregisterWorkspace(workspaceFolders[0].uri.fsPath)
    }

    await socketServer.stop()
    socketServer = null

    updateStatusBar('$(circle-slash) Cyne: Stopped', 'Socket server stopped')
  }
}

/**
 * Restart the socket server
 */
async function restartServer(): Promise<void> {
  await stopServer()
  await startServer()
}

/**
 * Register all RPC handlers
 */
function registerHandlers(server: SocketServer): void {
  // Health
  server.registerHandler('health/ping', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders?.length) {
      updatePing(workspaceFolders[0].uri.fsPath)
    }
    return {
      status: 'ok',
      workspace: workspaceFolders?.[0]?.uri.fsPath || '',
      version: '0.1.0',
    }
  })

  // File operations
  server.registerHandler('file/read', handleFileRead)
  server.registerHandler('file/create', handleFileCreate)
  server.registerHandler('file/edit', handleFileEdit)
  server.registerHandler('file/open', handleFileOpen)

  // Editor operations
  server.registerHandler('editor/context', handleEditorContext)
  server.registerHandler('editor/goto', handleEditorGoto)
  server.registerHandler('editor/format', handleEditorFormat)

  // Workspace operations
  server.registerHandler('workspace/files', handleWorkspaceFiles)
  server.registerHandler('workspace/search', handleWorkspaceSearch)

  // Terminal operations
  server.registerHandler('terminal/execute', handleTerminalExecute)
  server.registerHandler('terminal/list', handleTerminalList)

  // Diagnostics
  server.registerHandler('diagnostics/get', handleDiagnosticsGet)

  // Symbol operations
  server.registerHandler('symbols/definition', handleSymbolDefinition)
  server.registerHandler('symbols/references', handleSymbolReferences)
  server.registerHandler('symbols/rename', handleSymbolRename)

  // Brain operations (planning artifacts)
  server.registerHandler('brain/open', async (params: { docType?: 'task' | 'plan' | 'walkthrough' }) => {
    // Need to pass context from activation - use a stored reference
    await vscode.commands.executeCommand('cyne.openBrain')
    return { success: true }
  })

  server.registerHandler('brain/write', async (params: { type: 'task' | 'plan' | 'walkthrough'; content: string }) => {
    const filePath = brainPanel.writeBrainDoc(params.type, params.content)
    // Auto-open brain panel when writing
    await vscode.commands.executeCommand('cyne.openBrain')
    return { success: true, path: filePath }
  })

  server.registerHandler('brain/getDir', async () => {
    return { path: brainPanel.getBrainDir() }
  })

  // Notification operations
  server.registerHandler('notification/notify', handleNotification)
  server.registerHandler('notification/taskComplete', handleTaskCompletion)
  server.registerHandler('notification/progress', handleProgressNotification)
}

/**
 * Update status bar item
 */
function updateStatusBar(text: string, tooltip: string): void {
  if (statusBarItem) {
    statusBarItem.text = text
    statusBarItem.tooltip = tooltip
  }
}

/**
 * Show status command handler
 */
async function showStatus(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  const isRunning = socketServer !== null

  const message = isRunning
    ? `Cyne socket server is running for workspace: ${workspaceFolders?.[0]?.uri.fsPath || 'Unknown'}`
    : 'Cyne socket server is not running'

  const action = isRunning ? 'Stop Server' : 'Start Server'
  const result = await vscode.window.showInformationMessage(message, action, 'Show Logs')

  if (result === 'Stop Server') {
    await stopServer()
  } else if (result === 'Start Server') {
    await startServer()
  } else if (result === 'Show Logs') {
    outputChannel.show()
  }
}

/**
 * Reconnect command handler
 */
async function reconnect(): Promise<void> {
  await restartServer()
  vscode.window.showInformationMessage('Cyne socket server reconnected')
}
