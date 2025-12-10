/**
 * Notification handlers for Cyne VS Code Extension
 * Provides task completion notifications and other notification types
 */

import * as vscode from 'vscode'

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

export interface NotificationParams {
  message: string
  type?: NotificationType
  title?: string
  actions?: string[]
  detail?: string
}

export interface NotificationResult {
  success: boolean
  action?: string // The button clicked by user, if any
}

/**
 * Show a notification in VS Code
 */
export async function handleNotification(params: NotificationParams): Promise<NotificationResult> {
  const { message, type = 'info', title, actions = [], detail } = params
  
  // Build the full message
  const fullMessage = title ? `${title}: ${message}` : message
  
  let result: string | undefined

  switch (type) {
    case 'error':
      result = await vscode.window.showErrorMessage(fullMessage, ...actions)
      break
    case 'warning':
      result = await vscode.window.showWarningMessage(fullMessage, ...actions)
      break
    case 'success':
    case 'info':
    default:
      result = await vscode.window.showInformationMessage(fullMessage, ...actions)
      break
  }

  return {
    success: true,
    action: result,
  }
}

export interface TaskCompletionParams {
  taskName: string
  status: 'completed' | 'failed' | 'cancelled'
  summary?: string
  duration?: number // in milliseconds
  openFile?: string // path to file to offer opening
}

/**
 * Show a task completion notification
 * This is the main notification for when Cyne finishes a task
 */
export async function handleTaskCompletion(params: TaskCompletionParams): Promise<NotificationResult> {
  const { taskName, status, summary, duration, openFile } = params
  
  // Format duration if provided
  const durationStr = duration 
    ? ` (${formatDuration(duration)})` 
    : ''
  
  // Build message based on status
  let message: string
  let type: NotificationType
  let icon: string

  switch (status) {
    case 'completed':
      icon = '✅'
      type = 'info'
      message = `${icon} Task completed${durationStr}: ${taskName}`
      break
    case 'failed':
      icon = '❌'
      type = 'error'
      message = `${icon} Task failed${durationStr}: ${taskName}`
      break
    case 'cancelled':
      icon = '⚠️'
      type = 'warning'
      message = `${icon} Task cancelled${durationStr}: ${taskName}`
      break
    default:
      icon = 'ℹ️'
      type = 'info'
      message = `${icon} Task ${status}${durationStr}: ${taskName}`
  }

  // Add summary if provided
  if (summary) {
    message += ` - ${summary}`
  }

  // Build action buttons
  const actions: string[] = []
  if (openFile) {
    actions.push('Open File')
  }
  actions.push('Show Logs')

  // Show the notification
  let result: string | undefined

  switch (type) {
    case 'error':
      result = await vscode.window.showErrorMessage(message, ...actions)
      break
    case 'warning':
      result = await vscode.window.showWarningMessage(message, ...actions)
      break
    default:
      result = await vscode.window.showInformationMessage(message, ...actions)
      break
  }

  // Handle action button clicks
  if (result === 'Open File' && openFile) {
    try {
      const doc = await vscode.workspace.openTextDocument(openFile)
      await vscode.window.showTextDocument(doc)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${openFile}`)
    }
  } else if (result === 'Show Logs') {
    vscode.commands.executeCommand('workbench.action.output.toggleOutput')
  }

  return {
    success: true,
    action: result,
  }
}

export interface ProgressNotificationParams {
  id: string
  title: string
  message?: string
  increment?: number // 0-100
  done?: boolean
}

// Store active progress notifications
const activeProgress = new Map<string, {
  resolve: () => void
  report: vscode.Progress<{ message?: string; increment?: number }>
}>()

/**
 * Show or update a progress notification
 */
export async function handleProgressNotification(params: ProgressNotificationParams): Promise<NotificationResult> {
  const { id, title, message, increment, done } = params

  if (done && activeProgress.has(id)) {
    // Complete the progress notification
    const progress = activeProgress.get(id)!
    progress.resolve()
    activeProgress.delete(id)
    return { success: true }
  }

  if (activeProgress.has(id)) {
    // Update existing progress
    const progress = activeProgress.get(id)!
    progress.report.report({ message, increment })
    return { success: true }
  }

  // Create new progress notification
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async (progress) => {
      return new Promise<void>((resolve) => {
        activeProgress.set(id, { resolve, report: progress })
        if (message) {
          progress.report({ message })
        }
      })
    }
  )

  return { success: true }
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
