/**
 * VS Code Socket Client
 * Handles communication with VS Code via Unix domain sockets using JSON-RPC 2.0
 */

import { Socket } from 'net'
import { join } from 'path'
import { existsSync } from 'fs'
import {
  VSCODE_SOCKETS_DIR,
  findSocketForCwd,
  cleanupStaleEntries,
  WorkspaceEntry,
  isWindows
} from './vscodeRegistry'
import { getCwd } from '../utils/state'
import { logError } from '../utils/log'

// JSON-RPC 2.0 types
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: any
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

// Connection state
let activeConnection: Socket | null = null
let activeWorkspace: WorkspaceEntry | null = null
let requestId = 0
let pendingRequests = new Map<number | string, {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}>()

// Configuration
const REQUEST_TIMEOUT = 10000  // 10 seconds
const CONNECTION_TIMEOUT = 5000  // 5 seconds

/**
 * Error thrown when VS Code is not available
 */
export class VSCodeNotConnectedError extends Error {
  constructor(message: string = 'VS Code is not connected') {
    super(message)
    this.name = 'VSCodeNotConnectedError'
  }
}

/**
 * Error thrown when a VS Code request fails
 */
export class VSCodeRequestError extends Error {
  code: number
  data?: any

  constructor(code: number, message: string, data?: any) {
    super(message)
    this.name = 'VSCodeRequestError'
    this.code = code
    this.data = data
  }
}

/**
 * Check if VS Code is connected and available
 */
export function isVSCodeConnected(): boolean {
  return activeConnection !== null && !activeConnection.destroyed
}

/**
 * Get the currently connected workspace info
 */
export function getConnectedWorkspace(): WorkspaceEntry | null {
  if (isVSCodeConnected()) {
    return activeWorkspace
  }
  return null
}

/**
 * Discover and connect to VS Code for the current working directory
 */
export async function connectToVSCode(cwd?: string): Promise<boolean> {
  const targetCwd = cwd || getCwd()

  // Cleanup stale entries first
  cleanupStaleEntries()

  // Find the socket for this workspace
  const workspaceEntry = findSocketForCwd(targetCwd)

  if (!workspaceEntry) {
    return false
  }

  const socketPath = join(VSCODE_SOCKETS_DIR, workspaceEntry.socket)

  // Check if socket file exists (skip for Windows named pipes as they don't appear as files)
  if (!isWindows() && !existsSync(socketPath)) {
    return false
  }

  // If already connected to this workspace, reuse connection
  if (activeWorkspace?.socket === workspaceEntry.socket && isVSCodeConnected()) {
    return true
  }

  // Close existing connection if any
  await disconnectFromVSCode()

  // Connect to the socket
  return new Promise((resolve) => {
    const socket = new Socket()
    let dataBuffer = ''

    const connectionTimeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, CONNECTION_TIMEOUT)

    socket.on('connect', () => {
      clearTimeout(connectionTimeout)
      activeConnection = socket
      activeWorkspace = workspaceEntry
      resolve(true)
    })

    socket.on('data', (data) => {
      dataBuffer += data.toString()

      // Process complete JSON messages (delimited by newlines)
      const lines = dataBuffer.split('\n')
      dataBuffer = lines.pop() || ''  // Keep incomplete last line

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as JsonRpcResponse
            handleResponse(response)
          } catch (error) {
            logError(`Failed to parse VS Code response: ${error}`)
          }
        }
      }
    })

    socket.on('error', (error) => {
      clearTimeout(connectionTimeout)
      logError(`VS Code socket error: ${error}`)
      cleanup()
      resolve(false)
    })

    socket.on('close', () => {
      cleanup()
    })

    socket.connect(socketPath)
  })
}

/**
 * Handle incoming JSON-RPC response
 */
function handleResponse(response: JsonRpcResponse): void {
  const pending = pendingRequests.get(response.id)

  if (!pending) {
    return  // Response for unknown request, ignore
  }

  clearTimeout(pending.timeout)
  pendingRequests.delete(response.id)

  if (response.error) {
    pending.reject(new VSCodeRequestError(
      response.error.code,
      response.error.message,
      response.error.data
    ))
  } else {
    pending.resolve(response.result)
  }
}

/**
 * Cleanup connection state
 */
function cleanup(): void {
  if (activeConnection) {
    activeConnection.destroy()
    activeConnection = null
  }
  activeWorkspace = null

  // Reject all pending requests
  for (const [id, pending] of pendingRequests) {
    clearTimeout(pending.timeout)
    pending.reject(new VSCodeNotConnectedError('Connection closed'))
  }
  pendingRequests.clear()
}

/**
 * Disconnect from VS Code
 */
export async function disconnectFromVSCode(): Promise<void> {
  cleanup()
}

/**
 * Send a JSON-RPC request to VS Code
 */
export async function sendRequest<T = any>(
  method: string,
  params?: any,
  timeout: number = REQUEST_TIMEOUT
): Promise<T> {
  // Try to connect if not connected
  if (!isVSCodeConnected()) {
    const connected = await connectToVSCode()
    if (!connected) {
      throw new VSCodeNotConnectedError(
        'Could not connect to VS Code. Make sure VS Code is open with the Cyne extension installed.'
      )
    }
  }

  const id = ++requestId

  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params
  }

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new VSCodeRequestError(-32000, `Request timeout: ${method}`))
    }, timeout)

    pendingRequests.set(id, {
      resolve,
      reject,
      timeout: timeoutHandle
    })

    try {
      // Send request as JSON followed by newline (message delimiter)
      activeConnection!.write(JSON.stringify(request) + '\n')
    } catch (error) {
      clearTimeout(timeoutHandle)
      pendingRequests.delete(id)
      cleanup()
      reject(new VSCodeNotConnectedError(`Failed to send request: ${error}`))
    }
  })
}

/**
 * Send a notification to VS Code (no response expected)
 */
export function sendNotification(method: string, params?: any): void {
  if (!isVSCodeConnected()) {
    return  // Silently ignore if not connected
  }

  const notification: JsonRpcNotification = {
    jsonrpc: '2.0',
    method,
    params
  }

  try {
    activeConnection!.write(JSON.stringify(notification) + '\n')
  } catch {
    // Ignore send errors for notifications
  }
}

/**
 * Check VS Code health/availability
 */
export async function checkVSCodeHealth(): Promise<{
  connected: boolean
  workspace?: string
  error?: string
}> {
  try {
    // Try to connect first
    if (!isVSCodeConnected()) {
      const connected = await connectToVSCode()
      if (!connected) {
        return {
          connected: false,
          error: 'No VS Code instance found for current workspace'
        }
      }
    }

    // Ping VS Code
    const result = await sendRequest<{ status: string; workspace: string }>('health/ping')

    return {
      connected: true,
      workspace: result.workspace
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Ensure VS Code is connected, throw if not
 */
export async function ensureVSCodeConnected(): Promise<void> {
  if (!isVSCodeConnected()) {
    const connected = await connectToVSCode()
    if (!connected) {
      throw new VSCodeNotConnectedError(
        'VS Code is not connected. Make sure VS Code is open with the Cyne extension installed for this workspace.'
      )
    }
  }
}

// Export types for consumers
export type { WorkspaceEntry }
