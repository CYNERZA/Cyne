/**
 * Unix Socket Server for Cyne CLI communication
 */

import * as net from 'net'
import * as fs from 'fs'
import * as vscode from 'vscode'
import {
  JsonRpcRequest,
  JsonRpcResponse,
  parseRequest,
  createResponse,
  createErrorResponse,
  ErrorCodes,
  RpcHandler,
} from './protocol'
import { getSocketPath, ensureSocketsDir, isWindows } from './registry'

export class SocketServer {
  private server: net.Server | null = null
  private socketPath: string
  private handlers: Map<string, RpcHandler> = new Map()
  private outputChannel: vscode.OutputChannel

  constructor(
    private workspacePath: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.socketPath = getSocketPath(workspacePath)
    this.outputChannel = outputChannel
  }

  /**
   * Register an RPC handler
   */
  registerHandler(method: string, handler: RpcHandler): void {
    this.handlers.set(method, handler)
  }

  /**
   * Start the socket server
   */
  async start(): Promise<void> {
    // Sockets dir only needed on Unix (Windows uses named pipes)
    if (!isWindows()) {
      ensureSocketsDir()
    }

    // Remove stale socket file if exists (not applicable for Windows named pipes)
    if (!isWindows() && fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath)
      } catch {
        // Ignore
      }
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket)
      })

      this.server.on('error', (err) => {
        this.log(`Socket server error: ${err.message}`)
        reject(err)
      })

      this.server.listen(this.socketPath, () => {
        // Set socket permissions to be accessible by the user (Unix only)
        if (!isWindows()) {
          try {
            fs.chmodSync(this.socketPath, 0o600)
          } catch {
            // Ignore permission errors
          }
        }
        this.log(`Socket server listening on ${this.socketPath}`)
        resolve()
      })
    })
  }

  /**
   * Stop the socket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.log('Socket server stopped')

          // Clean up socket file (Unix only)
          if (!isWindows() && fs.existsSync(this.socketPath)) {
            try {
              fs.unlinkSync(this.socketPath)
            } catch {
              // Ignore
            }
          }

          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(socket: net.Socket): void {
    this.log('Client connected')
    let buffer = ''

    socket.on('data', async (data) => {
      buffer += data.toString()

      // Process complete JSON messages (newline-delimited)
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete last line

      for (const line of lines) {
        if (line.trim()) {
          await this.handleMessage(socket, line.trim())
        }
      }
    })

    socket.on('close', () => {
      this.log('Client disconnected')
    })

    socket.on('error', (err) => {
      this.log(`Socket error: ${err.message}`)
    })
  }

  /**
   * Handle a single JSON-RPC message
   */
  private async handleMessage(socket: net.Socket, message: string): Promise<void> {
    const request = parseRequest(message)

    if (!request) {
      const response = createErrorResponse(
        0,
        ErrorCodes.ParseError,
        'Invalid JSON-RPC request'
      )
      this.sendResponse(socket, response)
      return
    }

    this.log(`Request: ${request.method}`)

    const handler = this.handlers.get(request.method)

    if (!handler) {
      const response = createErrorResponse(
        request.id,
        ErrorCodes.MethodNotFound,
        `Method not found: ${request.method}`
      )
      this.sendResponse(socket, response)
      return
    }

    try {
      const result = await handler(request.params)
      const response = createResponse(request.id, result)
      this.sendResponse(socket, response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const response = createErrorResponse(
        request.id,
        ErrorCodes.InternalError,
        errorMessage
      )
      this.sendResponse(socket, response)
    }
  }

  /**
   * Send a response to the client
   */
  private sendResponse(socket: net.Socket, response: JsonRpcResponse): void {
    try {
      socket.write(JSON.stringify(response) + '\n')
    } catch (error) {
      this.log(`Failed to send response: ${error}`)
    }
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString()
    this.outputChannel.appendLine(`[${timestamp}] ${message}`)
  }
}
