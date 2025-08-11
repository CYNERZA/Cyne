import { z } from 'zod'
import * as React from 'react'
import { Tool, ValidationResult } from '../../Tool'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { fetch } from 'undici'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'

// VS Code API configuration
const VSCODE_HTTP_URL = "http://localhost:8090"
const HEADERS = {
  'User-Agent': 'Cyne-Agent/1.0',
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

export class VSCodeAvailabilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VSCodeAvailabilityError'
  }
}

/**
 * Check if 'code' command is available in the system
 */
export async function checkCodeCommand(): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      const child = spawn('code', ['--version'], { stdio: 'ignore' })
      
      const timer = setTimeout(() => {
        child.kill()
        resolve(false)
      }, 5000) // 5 second timeout
      
      child.on('exit', (code) => {
        clearTimeout(timer)
        resolve(code === 0)
      })
      
      child.on('error', () => {
        clearTimeout(timer)
        resolve(false)
      })
    })
  } catch {
    return false
  }
}

/**
 * Check if VS Code extension API is running on localhost:8090
 */
export async function checkVSCodeAPI(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    try {
      const response = await fetch(`${VSCODE_HTTP_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      })
      clearTimeout(timeout)
      return response.ok
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    // Fallback: try to connect to the port
    try {
      const net = await import('net')
      return new Promise((resolve) => {
        const socket = new net.Socket()
        
        socket.setTimeout(2000)
        
        socket.on('connect', () => {
          socket.destroy()
          resolve(true)
        })
        
        socket.on('timeout', () => {
          socket.destroy()
          resolve(false)
        })
        
        socket.on('error', () => {
          resolve(false)
        })
        
        socket.connect(8090, 'localhost')
      })
    } catch {
      return false
    }
  }
}

/**
 * Check if VS Code and its extension API are available
 */
export async function checkVSCodeAvailability(): Promise<{ isAvailable: boolean; message: string }> {
  const codeAvailable = await checkCodeCommand()
  const apiAvailable = await checkVSCodeAPI()
  
  if (!codeAvailable && !apiAvailable) {
    return {
      isAvailable: false,
      message: "❌ VS Code command not found and API not accessible on localhost:8090"
    }
  } else if (!codeAvailable) {
    return {
      isAvailable: false,
      message: "❌ VS Code command not found (install VS Code and ensure 'code' is in PATH)"
    }
  } else if (!apiAvailable) {
    return {
      isAvailable: false,
      message: "❌ VS Code extension API not accessible on localhost:8090"
    }
  } else {
    return {
      isAvailable: true,
      message: "✅ VS Code is available and connected"
    }
  }
}

/**
 * Ensure VS Code is available, throw exception if not
 */
export async function ensureVSCodeAvailable(): Promise<void> {
  const { isAvailable, message } = await checkVSCodeAvailability()
  if (!isAvailable) {
    throw new VSCodeAvailabilityError(message)
  }
}

/**
 * Make authenticated request to VS Code API
 */
export async function makeVSCodeRequest(endpoint: string, options: any = {}): Promise<any> {
  await ensureVSCodeAvailable()
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  
  try {
    const url = `${VSCODE_HTTP_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) },
      signal: controller.signal
    })
    
    if (!response.ok) {
      throw new Error(`VS Code API request failed: HTTP ${response.status}`)
    }
    
    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}
