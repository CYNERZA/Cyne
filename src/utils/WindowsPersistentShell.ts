import * as fs from 'fs'
import { spawn, execSync, type ChildProcess } from 'child_process'
import { isAbsolute, resolve, join } from 'path'
import { logError } from './log'
import * as os from 'os'
import { logEvent } from '../services/statsig'
import { PRODUCT_COMMAND } from '../constants/product'

type ExecResult = {
  stdout: string
  stderr: string
  code: number
  interrupted: boolean
}

const TEMPFILE_PREFIX = os.tmpdir() + `\\${PRODUCT_COMMAND}-`
const DEFAULT_TIMEOUT = 30 * 60 * 1000
const SIGTERM_CODE = 143

export class WindowsPersistentShell {
  private commandQueue: QueuedCommand[] = []
  private isExecuting: boolean = false
  private shell: ChildProcess
  private isAlive: boolean = true
  private commandInterrupted: boolean = false
  private statusFile: string
  private stdoutFile: string
  private stderrFile: string
  private cwdFile: string
  private cwd: string
  private binShell: string

  constructor(cwd: string) {
    // Use PowerShell on Windows
    this.binShell = 'powershell.exe'
    
    this.shell = spawn(this.binShell, ['-NoProfile', '-Command', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
      env: {
        ...process.env,
        GIT_EDITOR: 'true',
      },
      shell: false
    })

    this.cwd = cwd

    this.shell.on('exit', (code, signal) => {
      if (code) {
        logError(`Shell exited with code ${code} and signal ${signal}`)
        logEvent('persistent_shell_exit', {
          code: code?.toString() || 'null',
          signal: signal || 'null',
        })
      }
      for (const file of [
        this.statusFile,
        this.stdoutFile,
        this.stderrFile,
        this.cwdFile,
      ]) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
        }
      }
      this.isAlive = false
    })

    const id = Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0')

    this.statusFile = TEMPFILE_PREFIX + id + '-status'
    this.stdoutFile = TEMPFILE_PREFIX + id + '-stdout'
    this.stderrFile = TEMPFILE_PREFIX + id + '-stderr'
    this.cwdFile = TEMPFILE_PREFIX + id + '-cwd'
    
    for (const file of [this.statusFile, this.stdoutFile, this.stderrFile]) {
      fs.writeFileSync(file, '')
    }
    // Initialize CWD file with initial directory
    fs.writeFileSync(this.cwdFile, cwd)
  }

  private async exec_(command: string, timeout?: number): Promise<ExecResult> {
    const commandTimeout = timeout || DEFAULT_TIMEOUT
    this.commandInterrupted = false
    
    return new Promise<ExecResult>(resolve => {
      // Truncate output files
      fs.writeFileSync(this.stdoutFile, '')
      fs.writeFileSync(this.stderrFile, '')
      fs.writeFileSync(this.statusFile, '')

      // Build PowerShell command that works on Windows
      const escapedCommand = command.replace(/"/g, '""') // Escape quotes for PowerShell
      
      const powershellScript = `
        try {
          $ErrorActionPreference = "Continue"
          $output = & cmd /c "${escapedCommand}" 2>&1
          $exitCode = $LASTEXITCODE
          $output | Out-File -FilePath "${this.stdoutFile}" -Encoding UTF8
          Set-Location | Out-File -FilePath "${this.cwdFile}" -Encoding UTF8
          $exitCode | Out-File -FilePath "${this.statusFile}" -Encoding UTF8
        } catch {
          $_.Exception.Message | Out-File -FilePath "${this.stderrFile}" -Encoding UTF8
          "1" | Out-File -FilePath "${this.statusFile}" -Encoding UTF8
        }
      `

      this.sendToShell(powershellScript)

      // Check for command completion or timeout
      const start = Date.now()
      const checkCompletion = setInterval(() => {
        try {
          let statusFileSize = 0
          if (fs.existsSync(this.statusFile)) {
            statusFileSize = fs.statSync(this.statusFile).size
          }

          if (
            statusFileSize > 0 ||
            Date.now() - start > commandTimeout ||
            this.commandInterrupted
          ) {
            clearInterval(checkCompletion)
            const stdout = fs.existsSync(this.stdoutFile)
              ? fs.readFileSync(this.stdoutFile, 'utf8')
              : ''
            let stderr = fs.existsSync(this.stderrFile)
              ? fs.readFileSync(this.stderrFile, 'utf8')
              : ''
            let code: number
            if (statusFileSize) {
              code = Number(fs.readFileSync(this.statusFile, 'utf8'))
            } else {
              code = SIGTERM_CODE
              stderr += (stderr ? '\n' : '') + 'Command execution timed out'
              logEvent('persistent_shell_command_timeout', {
                command: command.substring(0, 10),
                timeout: commandTimeout.toString(),
              })
            }
            resolve({
              stdout,
              stderr,
              code,
              interrupted: this.commandInterrupted,
            })
          }
        } catch {
          // Ignore file system errors during polling
        }
      }, 10)
    })
  }

  private sendToShell(command: string) {
    try {
      this.shell!.stdin!.write(command + '\r\n')
    } catch (error) {
      const errorString =
        error instanceof Error
          ? error.message
          : String(error || 'Unknown error')
      logError(`Error in sendToShell: ${errorString}`)
      logEvent('persistent_shell_write_error', {
        error: errorString.substring(0, 100),
        command: command.substring(0, 30),
      })
      throw error
    }
  }

  pwd(): string {
    try {
      const newCwd = fs.readFileSync(this.cwdFile, 'utf8').trim()
      if (newCwd) {
        this.cwd = newCwd
      }
    } catch (error) {
      logError(`Shell pwd error ${error}`)
    }
    return this.cwd
  }

  async exec(
    command: string,
    abortSignal?: AbortSignal,
    timeout?: number,
  ): Promise<ExecResult> {
    return new Promise<ExecResult>((resolve, reject) => {
      this.commandQueue.push({
        command,
        abortSignal,
        timeout,
        resolve,
        reject,
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isExecuting || this.commandQueue.length === 0) return

    this.isExecuting = true
    const { command, abortSignal, timeout, resolve, reject } =
      this.commandQueue.shift()!

    const killChildren = () => this.killChildren()
    if (abortSignal) {
      abortSignal.addEventListener('abort', killChildren)
    }

    try {
      const result = await this.exec_(command, timeout)
      resolve(result)
    } catch (error) {
      logEvent('persistent_shell_command_error', {
        error: (error as Error).message.substring(0, 10),
      })
      reject(error as Error)
    } finally {
      this.isExecuting = false
      if (abortSignal) {
        abortSignal.removeEventListener('abort', killChildren)
      }
      this.processQueue()
    }
  }

  killChildren() {
    if (this.shell && !this.shell.killed) {
      this.shell.kill('SIGTERM')
    }
    this.commandInterrupted = true
  }

  async setCwd(cwd: string) {
    const resolved = isAbsolute(cwd) ? cwd : resolve(process.cwd(), cwd)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Path "${resolved}" does not exist`)
    }
    await this.exec(`cd /d "${resolved}"`)
  }

  close(): void {
    this.shell!.stdin!.end()
    this.shell.kill()
  }
}

type QueuedCommand = {
  command: string
  abortSignal?: AbortSignal
  timeout?: number
  resolve: (result: ExecResult) => void
  reject: (error: Error) => void
}
