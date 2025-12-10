/**
 * VS Code Tool Utilities
 * Provides common functions for VS Code tools using socket-based communication
 */

import * as React from 'react'
import { 
  sendRequest, 
  checkVSCodeHealth, 
  ensureVSCodeConnected,
  isVSCodeConnected,
  VSCodeNotConnectedError,
  VSCodeRequestError,
  getConnectedWorkspace,
  connectToVSCode
} from '../../services/vscodeSocket'
import { 
  findSocketForCwd, 
  cleanupStaleEntries,
  getAllWorkspaces 
} from '../../services/vscodeRegistry'
import { getCwd } from '../../utils/state'

// Re-export error types for tool usage
export { VSCodeNotConnectedError, VSCodeRequestError }

/**
 * Check if VS Code is available for the current workspace
 */
export async function checkVSCodeAvailability(): Promise<{
  isAvailable: boolean
  message: string
  workspace?: string
}> {
  // First check if we have a registered workspace
  const workspaceEntry = findSocketForCwd(getCwd())
  
  if (!workspaceEntry) {
    return {
      isAvailable: false,
      message: '❌ No VS Code instance found for this workspace. Open VS Code with the Cyne extension installed.'
    }
  }
  
  // Try to connect and ping
  const health = await checkVSCodeHealth()
  
  if (health.connected) {
    return {
      isAvailable: true,
      message: '✅ VS Code is connected',
      workspace: health.workspace
    }
  } else {
    return {
      isAvailable: false,
      message: `❌ VS Code connection failed: ${health.error || 'Unknown error'}`
    }
  }
}

/**
 * Ensure VS Code is available, throw if not
 */
export async function ensureVSCodeAvailable(): Promise<void> {
  await ensureVSCodeConnected()
}

/**
 * Make a request to VS Code
 * This is the main API for tools to communicate with VS Code
 */
export async function makeVSCodeRequest<T = any>(
  method: string, 
  params?: any
): Promise<T> {
  return sendRequest<T>(method, params)
}

/**
 * Check if VS Code connection is active
 */
export function isVSCodeActive(): boolean {
  return isVSCodeConnected()
}

/**
 * Get info about the connected VS Code workspace
 */
export function getActiveVSCodeWorkspace() {
  return getConnectedWorkspace()
}

/**
 * List all registered VS Code workspaces
 */
export function listVSCodeWorkspaces() {
  cleanupStaleEntries()
  return getAllWorkspaces()
}

/**
 * Try to connect to VS Code for a specific directory
 */
export async function tryConnectVSCode(cwd?: string): Promise<boolean> {
  return connectToVSCode(cwd)
}

// Legacy compatibility: Keep the old class name for backward compatibility
export class VSCodeAvailabilityError extends VSCodeNotConnectedError {
  constructor(message: string) {
    super(message)
    this.name = 'VSCodeAvailabilityError'
  }
}

/**
 * Notification types for VS Code
 */
export type NotificationType = 'info' | 'warning' | 'error' | 'success'
export type TaskStatus = 'completed' | 'failed' | 'cancelled'

/**
 * Send a task completion notification to VS Code
 * This will show a notification popup in VS Code when a task finishes
 */
export async function notifyTaskCompletion(params: {
  taskName: string
  status: TaskStatus
  summary?: string
  duration?: number
  openFile?: string
}): Promise<void> {
  if (!isVSCodeConnected()) {
    return // Silently ignore if not connected
  }
  
  try {
    await sendRequest('notification/taskComplete', params)
  } catch {
    // Ignore notification errors
  }
}

/**
 * Send a general notification to VS Code
 */
export async function notifyVSCode(params: {
  message: string
  type?: NotificationType
  title?: string
  actions?: string[]
}): Promise<string | undefined> {
  if (!isVSCodeConnected()) {
    return undefined // Silently ignore if not connected
  }
  
  try {
    const result = await sendRequest<{ success: boolean; action?: string }>('notification/notify', params)
    return result.action
  } catch {
    return undefined
  }
}

/**
 * Show a progress notification in VS Code
 */
export async function showProgress(id: string, title: string, message?: string): Promise<void> {
  if (!isVSCodeConnected()) return
  
  try {
    await sendRequest('notification/progress', { id, title, message })
  } catch {
    // Ignore
  }
}

/**
 * Update progress notification
 */
export async function updateProgress(id: string, message?: string, increment?: number): Promise<void> {
  if (!isVSCodeConnected()) return
  
  try {
    await sendRequest('notification/progress', { id, title: '', message, increment })
  } catch {
    // Ignore
  }
}

/**
 * Complete a progress notification
 */
export async function completeProgress(id: string): Promise<void> {
  if (!isVSCodeConnected()) return
  
  try {
    await sendRequest('notification/progress', { id, title: '', done: true })
  } catch {
    // Ignore
  }
}
