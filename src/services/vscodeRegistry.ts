/**
 * VS Code Socket Registry
 * Manages workspace-to-socket mappings for multi-window VS Code support
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { createHash } from 'crypto'
import { CYNERZA_BASE_DIR } from '../utils/env'
import { logError } from '../utils/log'

// Directory for all VS Code sockets (uses same base dir as rest of CLI)
export const VSCODE_SOCKETS_DIR = join(CYNERZA_BASE_DIR, 'sockets')
const REGISTRY_FILE = join(VSCODE_SOCKETS_DIR, 'registry.json')

// Registry entry for a connected VS Code workspace
export interface WorkspaceEntry {
  socket: string           // Socket filename (e.g., "abc123.sock")
  workspacePath: string    // Absolute path to workspace
  pid: number             // VS Code process ID
  connectedAt: string     // ISO timestamp
  lastPing?: string       // Last health check
}

// Full registry structure
export interface SocketRegistry {
  version: number
  workspaces: Record<string, WorkspaceEntry>  // Key is workspace path
}

const DEFAULT_REGISTRY: SocketRegistry = {
  version: 1,
  workspaces: {}
}

/**
 * Ensure sockets directory exists
 */
export function ensureSocketsDir(): void {
  if (!existsSync(VSCODE_SOCKETS_DIR)) {
    mkdirSync(VSCODE_SOCKETS_DIR, { recursive: true })
  }
}

/**
 * Generate a unique socket name for a workspace
 */
export function generateSocketName(workspacePath: string): string {
  const hash = createHash('sha256')
    .update(workspacePath)
    .digest('hex')
    .slice(0, 12)
  return `vscode-${hash}.sock`
}

/**
 * Get the full socket path for a workspace
 */
export function getSocketPath(workspacePath: string): string {
  ensureSocketsDir()
  return join(VSCODE_SOCKETS_DIR, generateSocketName(workspacePath))
}

/**
 * Read the current registry
 */
export function readRegistry(): SocketRegistry {
  ensureSocketsDir()
  
  if (!existsSync(REGISTRY_FILE)) {
    return { ...DEFAULT_REGISTRY }
  }
  
  try {
    const content = readFileSync(REGISTRY_FILE, 'utf8')
    const registry = JSON.parse(content) as SocketRegistry
    return registry
  } catch (error) {
    logError(`Failed to read VS Code registry: ${error}`)
    return { ...DEFAULT_REGISTRY }
  }
}

/**
 * Write the registry to disk
 */
export function writeRegistry(registry: SocketRegistry): void {
  ensureSocketsDir()
  
  try {
    writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8')
  } catch (error) {
    logError(`Failed to write VS Code registry: ${error}`)
  }
}

/**
 * Register a VS Code workspace
 * Called by VS Code extension when it starts
 */
export function registerWorkspace(
  workspacePath: string,
  pid: number
): WorkspaceEntry {
  const normalizedPath = resolve(workspacePath)
  const socketName = generateSocketName(normalizedPath)
  
  const entry: WorkspaceEntry = {
    socket: socketName,
    workspacePath: normalizedPath,
    pid,
    connectedAt: new Date().toISOString()
  }
  
  const registry = readRegistry()
  registry.workspaces[normalizedPath] = entry
  writeRegistry(registry)
  
  return entry
}

/**
 * Unregister a VS Code workspace
 * Called by VS Code extension when it closes
 */
export function unregisterWorkspace(workspacePath: string): void {
  const normalizedPath = resolve(workspacePath)
  const registry = readRegistry()
  
  const entry = registry.workspaces[normalizedPath]
  if (entry) {
    // Clean up socket file if it exists
    const socketPath = join(VSCODE_SOCKETS_DIR, entry.socket)
    if (existsSync(socketPath)) {
      try {
        unlinkSync(socketPath)
      } catch {
        // Ignore cleanup errors
      }
    }
    
    delete registry.workspaces[normalizedPath]
    writeRegistry(registry)
  }
}

/**
 * Find the VS Code socket for a given working directory
 * Searches up the directory tree to find matching workspace
 */
export function findSocketForCwd(cwd: string): WorkspaceEntry | null {
  const normalizedCwd = resolve(cwd)
  const registry = readRegistry()
  
  // First, try exact match
  if (registry.workspaces[normalizedCwd]) {
    return registry.workspaces[normalizedCwd]
  }
  
  // Search for workspaces that contain this directory
  let bestMatch: WorkspaceEntry | null = null
  let bestMatchLength = 0
  
  for (const [workspacePath, entry] of Object.entries(registry.workspaces)) {
    // Check if cwd is inside this workspace
    if (normalizedCwd.startsWith(workspacePath + '/') || normalizedCwd === workspacePath) {
      // Prefer the most specific (longest) workspace path
      if (workspacePath.length > bestMatchLength) {
        bestMatch = entry
        bestMatchLength = workspacePath.length
      }
    }
  }
  
  return bestMatch
}

/**
 * Get all registered workspaces
 */
export function getAllWorkspaces(): WorkspaceEntry[] {
  const registry = readRegistry()
  return Object.values(registry.workspaces)
}

/**
 * Check if a workspace is registered
 */
export function isWorkspaceRegistered(workspacePath: string): boolean {
  const normalizedPath = resolve(workspacePath)
  const registry = readRegistry()
  return normalizedPath in registry.workspaces
}

/**
 * Update last ping time for a workspace
 */
export function updateWorkspacePing(workspacePath: string): void {
  const normalizedPath = resolve(workspacePath)
  const registry = readRegistry()
  
  if (registry.workspaces[normalizedPath]) {
    registry.workspaces[normalizedPath].lastPing = new Date().toISOString()
    writeRegistry(registry)
  }
}

/**
 * Clean up stale entries (sockets that no longer exist)
 */
export function cleanupStaleEntries(): number {
  const registry = readRegistry()
  let cleaned = 0
  
  for (const [workspacePath, entry] of Object.entries(registry.workspaces)) {
    const socketPath = join(VSCODE_SOCKETS_DIR, entry.socket)
    
    if (!existsSync(socketPath)) {
      delete registry.workspaces[workspacePath]
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    writeRegistry(registry)
  }
  
  return cleaned
}

/**
 * Clean up orphaned socket files (sockets without registry entries)
 */
export function cleanupOrphanedSockets(): number {
  ensureSocketsDir()
  
  const registry = readRegistry()
  const registeredSockets = new Set(
    Object.values(registry.workspaces).map(e => e.socket)
  )
  
  let cleaned = 0
  
  try {
    const files = readdirSync(VSCODE_SOCKETS_DIR)
    
    for (const file of files) {
      if (file.endsWith('.sock') && !registeredSockets.has(file)) {
        try {
          unlinkSync(join(VSCODE_SOCKETS_DIR, file))
          cleaned++
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error) {
    logError(`Failed to cleanup orphaned sockets: ${error}`)
  }
  
  return cleaned
}
