/**
 * Registry management for workspace <-> socket mapping
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

// ~/.cyne/sockets directory (must match CLI's CONFIG_BASE_DIR)
const CYNERZA_BASE_DIR = process.env.CYNE_CONFIG_DIR || path.join(os.homedir(), '.cyne')
export const SOCKETS_DIR = path.join(CYNERZA_BASE_DIR, 'sockets')
const REGISTRY_FILE = path.join(SOCKETS_DIR, 'registry.json')

export interface WorkspaceEntry {
  socket: string
  workspacePath: string
  pid: number
  connectedAt: string
  lastPing?: string
}

export interface SocketRegistry {
  version: number
  workspaces: Record<string, WorkspaceEntry>
}

/**
 * Ensure sockets directory exists
 */
export function ensureSocketsDir(): void {
  if (!fs.existsSync(SOCKETS_DIR)) {
    fs.mkdirSync(SOCKETS_DIR, { recursive: true })
  }
}

/**
 * Check if we're on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Generate socket filename for a workspace
 */
export function generateSocketName(workspacePath: string): string {
  const hash = crypto.createHash('sha256').update(workspacePath).digest('hex').slice(0, 12)
  return `vscode-${hash}.sock`
}

/**
 * Get full socket path
 * Uses named pipes on Windows, Unix sockets on other platforms
 */
export function getSocketPath(workspacePath: string): string {
  const socketName = generateSocketName(workspacePath)

  if (isWindows()) {
    // Use named pipes on Windows (no admin privileges required)
    return `\\\\.\\pipe\\cyne-${socketName.replace('.sock', '')}`
  }

  ensureSocketsDir()
  return path.join(SOCKETS_DIR, socketName)
}

/**
 * Read the registry file
 */
function readRegistry(): SocketRegistry {
  ensureSocketsDir()

  if (!fs.existsSync(REGISTRY_FILE)) {
    return { version: 1, workspaces: {} }
  }

  try {
    const content = fs.readFileSync(REGISTRY_FILE, 'utf8')
    return JSON.parse(content) as SocketRegistry
  } catch {
    return { version: 1, workspaces: {} }
  }
}

/**
 * Write the registry file
 */
function writeRegistry(registry: SocketRegistry): void {
  ensureSocketsDir()
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8')
}

/**
 * Register this VS Code workspace
 */
export function registerWorkspace(workspacePath: string): WorkspaceEntry {
  const normalizedPath = path.resolve(workspacePath)
  const socketName = generateSocketName(normalizedPath)

  const entry: WorkspaceEntry = {
    socket: socketName,
    workspacePath: normalizedPath,
    pid: process.pid,
    connectedAt: new Date().toISOString(),
  }

  const registry = readRegistry()
  registry.workspaces[normalizedPath] = entry
  writeRegistry(registry)

  return entry
}

/**
 * Unregister this VS Code workspace
 */
export function unregisterWorkspace(workspacePath: string): void {
  const normalizedPath = path.resolve(workspacePath)
  const registry = readRegistry()

  const entry = registry.workspaces[normalizedPath]
  if (entry) {
    // Clean up socket file
    const socketPath = path.join(SOCKETS_DIR, entry.socket)
    if (fs.existsSync(socketPath)) {
      try {
        fs.unlinkSync(socketPath)
      } catch {
        // Ignore
      }
    }

    delete registry.workspaces[normalizedPath]
    writeRegistry(registry)
  }
}

/**
 * Update last ping time
 */
export function updatePing(workspacePath: string): void {
  const normalizedPath = path.resolve(workspacePath)
  const registry = readRegistry()

  if (registry.workspaces[normalizedPath]) {
    registry.workspaces[normalizedPath].lastPing = new Date().toISOString()
    writeRegistry(registry)
  }
}
