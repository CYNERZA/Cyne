/**
 * Process Manager - Tracks background commands with live output streaming
 * Similar to Antigravity's command execution system
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'

export interface ProcessInfo {
  id: string
  command: string
  cwd: string
  status: 'running' | 'done' | 'error'
  exitCode: number | null
  stdout: string
  stderr: string
  startTime: Date
  endTime: Date | null
  process: ChildProcess | null
}

class ProcessManager extends EventEmitter {
  private processes: Map<string, ProcessInfo> = new Map()
  private static instance: ProcessManager | null = null

  private constructor() {
    super()
  }

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager()
    }
    return ProcessManager.instance
  }

  /**
   * Execute a command and track it
   */
  async exec(
    command: string,
    cwd: string,
    options: {
      timeout?: number
      background?: boolean
      onStdout?: (data: string) => void
      onStderr?: (data: string) => void
    } = {}
  ): Promise<ProcessInfo> {
    const id = randomUUID().slice(0, 8)
    const { timeout = 300000, background = false, onStdout, onStderr } = options

    const processInfo: ProcessInfo = {
      id,
      command,
      cwd,
      status: 'running',
      exitCode: null,
      stdout: '',
      stderr: '',
      startTime: new Date(),
      endTime: null,
      process: null,
    }

    this.processes.set(id, processInfo)

    // Spawn the process
    const child = spawn('bash', ['-c', command], {
      cwd,
      env: {
        ...process.env,
        PAGER: 'cat',
        GIT_PAGER: 'cat',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    processInfo.process = child

    // Handle stdout
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      processInfo.stdout += text
      this.emit('stdout', id, text)
      onStdout?.(text)
    })

    // Handle stderr
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      processInfo.stderr += text
      this.emit('stderr', id, text)
      onStderr?.(text)
    })

    // Handle close
    child.on('close', (code: number | null) => {
      processInfo.status = code === 0 ? 'done' : 'error'
      processInfo.exitCode = code
      processInfo.endTime = new Date()
      processInfo.process = null
      this.emit('close', id, code)
    })

    // Handle error
    child.on('error', (err: Error) => {
      processInfo.status = 'error'
      processInfo.stderr += `\nError: ${err.message}`
      processInfo.endTime = new Date()
      processInfo.process = null
      this.emit('error', id, err)
    })

    // If not background, wait for completion
    if (!background) {
      await this.waitForCompletion(id, timeout)
    }

    return processInfo
  }

  /**
   * Wait for a process to complete
   */
  async waitForCompletion(id: string, timeout: number = 60000): Promise<ProcessInfo | null> {
    const info = this.processes.get(id)
    if (!info) return null

    if (info.status !== 'running') {
      return info
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        info.process?.kill('SIGTERM')
        info.status = 'error'
        info.stderr += '\nCommand timed out'
        info.endTime = new Date()
        resolve(info)
      }, timeout)

      const checkComplete = () => {
        if (info.status !== 'running') {
          clearTimeout(timeoutId)
          resolve(info)
        } else {
          setTimeout(checkComplete, 100)
        }
      }
      checkComplete()
    })
  }

  /**
   * Get process info by ID
   */
  getProcess(id: string): ProcessInfo | null {
    return this.processes.get(id) || null
  }

  /**
   * Get all running processes
   */
  getRunningProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values()).filter(p => p.status === 'running')
  }

  /**
   * Get all processes
   */
  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values())
  }

  /**
   * Send input to a running process
   */
  sendInput(id: string, input: string): boolean {
    const info = this.processes.get(id)
    if (!info || !info.process || info.status !== 'running') {
      return false
    }

    try {
      info.process.stdin?.write(input)
      return true
    } catch {
      return false
    }
  }

  /**
   * Terminate a running process
   */
  terminate(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const info = this.processes.get(id)
    if (!info || !info.process || info.status !== 'running') {
      return false
    }

    try {
      info.process.kill(signal)
      return true
    } catch {
      return false
    }
  }

  /**
   * Clean up old completed processes
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now()
    let cleaned = 0

    for (const [id, info] of this.processes) {
      if (info.status !== 'running' && info.endTime) {
        if (now - info.endTime.getTime() > maxAge) {
          this.processes.delete(id)
          cleaned++
        }
      }
    }

    return cleaned
  }
}

export const processManager = ProcessManager.getInstance()
export default ProcessManager
