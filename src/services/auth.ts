import { fetch } from 'undici'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { logError } from '../utils/log'

// Default backend URL - can be overridden via env var
const BACKEND_URL = "https://cyne-api.cynerza.com"

interface AuthToken {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    email: string
    id: string
  }
  expires_at?: number
}

interface DeviceAuthResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface DevicePollResponse {
  status: 'pending' | 'ok' | 'error'
  access_token?: string
  token_type?: string
  expires_in?: number
  user?: {
    email: string
    id: string
  }
  error?: string
}

/**
 * Authentication Service
 * Handles device flow authentication and token management
 */
export class AuthService {
  private static authFilePath = join(homedir(), '.cyne', 'auth.json')
  private static cachedToken: AuthToken | null = null

  /**
   * Ensure .cyne directory exists
   */
  private static ensureAuthDir(): void {
    const cyneDir = join(homedir(), '.cyne')
    if (!existsSync(cyneDir)) {
      mkdirSync(cyneDir, { recursive: true, mode: 0o700 })
    }
  }

  /**
   * Start device flow authentication
   */
  static async startDeviceFlow(): Promise<DeviceAuthResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/device/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      return (await response.json()) as DeviceAuthResponse
    } catch (error) {
      console.error('Failed to start device flow:', error)
      logError(error)
      throw error
    }
  }

  /**
   * Poll for device authorization
   */
  static async pollDeviceAuth(
    deviceCode: string,
  ): Promise<DevicePollResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/device/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_code: deviceCode }),
      })

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.statusText}`)
      }

      return (await response.json()) as DevicePollResponse
    } catch (error) {
      console.error('Failed to poll device auth:', error)
      logError(error)
      throw error
    }
  }

  /**
   * Save authentication token to disk
   */
  static saveToken(token: AuthToken): void {
    try {
      this.ensureAuthDir()

      // Add expiration timestamp
      const tokenWithExpiry = {
        ...token,
        expires_at: Date.now() + token.expires_in * 1000,
      }

      writeFileSync(
        this.authFilePath,
        JSON.stringify(tokenWithExpiry, null, 2),
        { mode: 0o600 },
      )

      this.cachedToken = tokenWithExpiry
    } catch (error) {
      console.error('Failed to save auth token:', error)
      logError(error)
      throw error
    }
  }

  /**
   * Load authentication token from disk
   */
  static loadToken(): AuthToken | null {
    if (this.cachedToken) {
      return this.cachedToken
    }

    try {
      if (!existsSync(this.authFilePath)) {
        return null
      }

      const data = readFileSync(this.authFilePath, 'utf-8')
      
      // Handle empty file (from old clearToken implementation)
      if (!data || data.trim() === '') {
        return null
      }
      
      const token = JSON.parse(data) as AuthToken

      // Check if token is expired
      if (token.expires_at && token.expires_at < Date.now()) {
        this.clearToken()
        return null
      }

      this.cachedToken = token
      return token
    } catch (error) {
      console.error('Failed to load auth token:', error)
      logError(error)
      // Clear corrupted file
      this.clearToken()
      return null
    }
  }

  /**
   * Clear authentication token
   */
  static clearToken(): void {
    try {
      if (existsSync(this.authFilePath)) {
        // Delete the file instead of writing empty string
        const { unlinkSync } = require('fs')
        unlinkSync(this.authFilePath)
      }
      this.cachedToken = null
    } catch (error) {
      console.error('Failed to clear auth token:', error)
      logError(error)
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.loadToken()
    return token !== null
  }

  /**
   * Get access token for API requests
   */
  static getAccessToken(): string | null {
    const token = this.loadToken()
    return token?.access_token || null
  }

  /**
   * Get user info from token
   */
  static getUserInfo(): { email: string; id: string } | null {
    const token = this.loadToken()
    return token?.user || null
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken()
    if (!token) {
      return {}
    }
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  /**
   * Get backend URL
   */
  static getBackendUrl(): string {
    return BACKEND_URL
  }
}
