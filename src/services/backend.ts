import { fetch } from 'undici'
import { AuthService } from './auth'
import { logError } from '../utils/log'

const BACKEND_URL = AuthService.getBackendUrl()
const REQUEST_TIMEOUT = 5000

interface FullConfig {
  provider: string
  model: string
  api_key: string
  base_url: string
  source: 'user' | 'default'
  has_quota: boolean
  daily_remaining: number
  monthly_remaining: number
  using_default_model: boolean
}

interface Provider {
  id: string
  provider: string
  model: string
  display_name: string
  is_default: boolean
  created_at: string
  api_key?: string
  base_url?: string
}

interface DefaultModel {
  model: string
  provider: string
  display_name: string
  description: string
  is_enabled: boolean
}

interface TelemetrySettings {
  enabled: boolean
  share_command_text?: boolean
  share_error_details?: boolean
}

interface TelemetryEvent {
  id: string
  user_id: string
  event_type: string
  event_data: Record<string, any>
  timestamp: string
  cli_version: string
  os_type: string
  session_id: string
}

interface QuotaCheck {
  can_send: boolean
  message: string
  daily_remaining?: number
  monthly_remaining?: number
}

interface UsageIncrement {
  message: string
  daily_count: number
  monthly_count: number
}

/**
 * Backend API Client
 * Handles all communication with the backend server
 */
export class BackendClient {
  /**
   * Make authenticated API request
   */
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const authHeader = AuthService.getAuthHeader()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      return (await response.json()) as T
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout')
      }
      console.error(`Backend request failed for ${endpoint}:`, error)
      logError(error)
      throw error
    }
  }

  // ==================== CONFIGURATION APIs ====================

  /**
   * Get full configuration from backend
   */
  static async getFullConfig(): Promise<FullConfig> {
    return this.makeRequest<FullConfig>('/api/config/full')
  }

  /**
   * Get user's personal providers
   */
  static async getProviders(): Promise<Provider[]> {
    return this.makeRequest<Provider[]>('/api/providers')
  }

  /**
   * Update provider (set as default)
   */
  static async updateProvider(
    providerId: string,
    isDefault: boolean,
    model?: string,
    displayName?: string,
  ): Promise<{ message: string; provider: { id: string; is_default: boolean } }> {
    const body: Record<string, any> = { is_default: isDefault }
    if (model) body.model = model
    if (displayName) body.display_name = displayName
    
    return this.makeRequest(`/api/providers/${providerId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * Get available default models (admin-provided)
   */
  static async getDefaultModels(): Promise<{ models: DefaultModel[] }> {
    return this.makeRequest<{ models: DefaultModel[] }>(
      '/api/default-models/available',
    )
  }

  /**
   * Update user settings (preferred default model)
   */
  static async updateUserSettings(
    preferredDefaultModel: string,
  ): Promise<{ message: string }> {
    return this.makeRequest('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ preferred_default_model: preferredDefaultModel }),
    })
  }

  // ==================== TELEMETRY APIs ====================

  /**
   * Get telemetry settings
   */
  static async getTelemetrySettings(): Promise<TelemetrySettings> {
    return this.makeRequest<TelemetrySettings>('/api/telemetry/settings')
  }

  /**
   * Update telemetry settings
   */
  static async updateTelemetrySettings(
    enabled: boolean,
  ): Promise<{ message: string }> {
    return this.makeRequest('/api/telemetry/settings', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  }

  /**
   * Complete opt-out from telemetry
   */
  static async optOutTelemetry(): Promise<{ message: string }> {
    return this.makeRequest('/api/telemetry/opt-out', {
      method: 'POST',
    })
  }

  /**
   * Send telemetry events (batch)
   */
  static async sendTelemetryEvents(
    events: TelemetryEvent[],
  ): Promise<{ message: string; count: number }> {
    try {
      return await this.makeRequest('/api/telemetry/events', {
        method: 'POST',
        body: JSON.stringify({ events }),
      })
    } catch (error) {
      // Fail silently for telemetry - don't block user
      console.error('Failed to send telemetry:', error)
      logError(error)
      return { message: 'Failed to send telemetry', count: 0 }
    }
  }

  // ==================== QUOTA APIs ====================

  /**
   * Check message quota
   */
  static async checkQuota(): Promise<QuotaCheck> {
    try {
      return await this.makeRequest<QuotaCheck>('/api/usage/check', {
        method: 'POST',
      })
    } catch (error) {
      // Fail open for quota - allow request if backend is down
      console.error('Failed to check quota:', error)
      logError(error)
      return {
        can_send: true,
        message: 'Quota check failed, allowing request',
      }
    }
  }

  /**
   * Increment usage counter
   */
  static async incrementUsage(): Promise<UsageIncrement> {
    try {
      return await this.makeRequest<UsageIncrement>('/api/usage/increment', {
        method: 'POST',
      })
    } catch (error) {
      // Fail silently for usage tracking
      console.error('Failed to increment usage:', error)
      logError(error)
      return {
        message: 'Failed to increment usage',
        daily_count: 0,
        monthly_count: 0,
      }
    }
  }
}
