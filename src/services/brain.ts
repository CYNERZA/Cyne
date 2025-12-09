/**
 * Brain Service - Manages task planning artifacts for CYNE
 * Works in CLI without VS Code dependency
 * Integrates with VS Code brain panel when available
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { CYNERZA_BASE_DIR } from '../utils/env'

// Brain directory for planning artifacts
export const BRAIN_DIR = join(CYNERZA_BASE_DIR, 'brain')

// Current task state
interface TaskState {
  name: string
  mode: 'PLANNING' | 'EXECUTION' | 'VERIFICATION'
  status: string
  summary: string
  startedAt: string
  lastUpdate: string
}

let currentTask: TaskState | null = null

/**
 * Ensure brain directory exists
 */
export function ensureBrainDir(): void {
  if (!existsSync(BRAIN_DIR)) {
    mkdirSync(BRAIN_DIR, { recursive: true })
  }
}

/**
 * Get brain directory path
 */
export function getBrainDir(): string {
  ensureBrainDir()
  return BRAIN_DIR
}

/**
 * Write a brain document
 */
export function writeBrainDoc(
  type: 'task' | 'plan' | 'walkthrough',
  content: string
): string {
  ensureBrainDir()
  
  const filenames: Record<string, string> = {
    task: 'task.md',
    plan: 'implementation_plan.md',
    walkthrough: 'walkthrough.md',
  }
  
  const filePath = join(BRAIN_DIR, filenames[type])
  writeFileSync(filePath, content, 'utf8')
  
  return filePath
}

/**
 * Read a brain document
 */
export function readBrainDoc(type: 'task' | 'plan' | 'walkthrough'): string | null {
  ensureBrainDir()
  
  const filenames: Record<string, string> = {
    task: 'task.md',
    plan: 'implementation_plan.md',
    walkthrough: 'walkthrough.md',
  }
  
  const filePath = join(BRAIN_DIR, filenames[type])
  
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf8')
  }
  
  return null
}

/**
 * Get current task state
 */
export function getCurrentTask(): TaskState | null {
  return currentTask
}

/**
 * Set task boundary - start or update a task
 */
export function setTaskBoundary(params: {
  name: string
  mode: 'PLANNING' | 'EXECUTION' | 'VERIFICATION'
  status: string
  summary: string
}): TaskState {
  const now = new Date().toISOString()
  
  if (currentTask && currentTask.name === params.name) {
    // Update existing task
    currentTask = {
      ...currentTask,
      mode: params.mode,
      status: params.status,
      summary: params.summary,
      lastUpdate: now,
    }
  } else {
    // Start new task
    currentTask = {
      name: params.name,
      mode: params.mode,
      status: params.status,
      summary: params.summary,
      startedAt: now,
      lastUpdate: now,
    }
  }
  
  // Update task.md file
  updateTaskFile()
  
  return currentTask
}

/**
 * Clear current task
 */
export function clearTask(): void {
  currentTask = null
}

/**
 * Update task.md file with current state
 */
function updateTaskFile(): void {
  if (!currentTask) return
  
  const content = `# ${currentTask.name}

**Mode:** ${currentTask.mode}  
**Status:** ${currentTask.status}  
**Started:** ${formatTime(currentTask.startedAt)}  
**Updated:** ${formatTime(currentTask.lastUpdate)}

## Summary

${currentTask.summary || 'No summary yet.'}
`
  
  writeBrainDoc('task', content)
}

/**
 * Format ISO time to readable format
 */
function formatTime(isoTime: string): string {
  try {
    return new Date(isoTime).toLocaleString()
  } catch {
    return isoTime
  }
}

/**
 * Check if we have active planning documents
 */
export function hasActivePlanningDocs(): boolean {
  ensureBrainDir()
  
  const taskPath = join(BRAIN_DIR, 'task.md')
  const planPath = join(BRAIN_DIR, 'implementation_plan.md')
  
  return existsSync(taskPath) || existsSync(planPath)
}

/**
 * Get all brain documents
 */
export function getAllBrainDocs(): {
  task: string | null
  plan: string | null
  walkthrough: string | null
} {
  return {
    task: readBrainDoc('task'),
    plan: readBrainDoc('plan'),
    walkthrough: readBrainDoc('walkthrough'),
  }
}
