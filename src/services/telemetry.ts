import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir, type, platform } from 'os'
import { BackendClient } from './backend'
import { AuthService } from './auth'
import { logError } from '../utils/log'

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

interface QueuedEvent {
  id: string
  event_type: string
  event_data: Record<string, any>
  timestamp: string
}

/**
 * Telemetry Client
 * Batches and sends events to backend
 */
export class TelemetryClient {
  private static instance: TelemetryClient | null = null
  private static sessionId: string = randomUUID()
  private static userId: string | null = null
  private static cliVersion: string = process.env.npm_package_version || '0.0.14-beta'
  private static queuePath = join(homedir(), '.cyne', 'telemetry_queue.json')
  private static eventQueue: QueuedEvent[] = []
  private static maxBatchSize = 10
  private static isEnabled = true

  /**
   * Initialize telemetry client
   */
  static async init(userId?: string, sessionId?: string, version?: string): Promise<void> {
    if (userId) this.userId = userId
    if (sessionId) this.sessionId = sessionId
    if (version) this.cliVersion = version

    // Load queued events from disk
    this.loadQueue()

    // Check if telemetry is enabled
    try {
      if (AuthService.isAuthenticated()) {
        const settings = await BackendClient.getTelemetrySettings()
        this.isEnabled = settings.enabled
      }
    } catch (error) {
      // Fail silently - default to enabled
    }

    // Flush any pending events
    if (this.eventQueue.length > 0) {
      await this.flushEvents()
    }
  }

  /**
   * Track an event
   */
  static trackEvent(eventType: string, eventData: Record<string, any> = {}): void {
    if (!this.isEnabled) return

    const event: QueuedEvent = {
      id: randomUUID(),
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString(),
    }

    this.eventQueue.push(event)
    this.saveQueue()

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.maxBatchSize) {
      this.flushEvents().catch(err => {
        console.error('Failed to flush telemetry:', err)
        logError(err)
      })
    }
  }

  /**
   * Flush all queued events to backend
   */
  static async flushEvents(): Promise<void> {
    if (!AuthService.isAuthenticated() || this.eventQueue.length === 0) {
      return
    }

    const userInfo = AuthService.getUserInfo()
    const userId = userInfo?.id || this.userId || 'unknown'

    const events: TelemetryEvent[] = this.eventQueue.map(event => ({
      ...event,
      user_id: userId,
      cli_version: this.cliVersion,
      os_type: platform(),
      session_id: this.sessionId,
    }))

    try {
      await BackendClient.sendTelemetryEvents(events)
      // Clear queue on successful send
      this.eventQueue = []
      this.saveQueue()
    } catch (error) {
      // Keep events in queue for retry
      console.error('Failed to send telemetry events:', error)
      logError(error)
    }
  }

  /**
   * Load queue from disk
   */
  private static loadQueue(): void {
    try {
      if (existsSync(this.queuePath)) {
        const data = readFileSync(this.queuePath, 'utf-8')
        this.eventQueue = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load telemetry queue:', error)
      logError(error)
      this.eventQueue = []
    }
  }

  /**
   * Save queue to disk
   */
  private static saveQueue(): void {
    try {
      const cyneDir = join(homedir(), '.cyne')
      if (!existsSync(cyneDir)) {
        mkdirSync(cyneDir, { recursive: true, mode: 0o700 })
      }

      writeFileSync(
        this.queuePath,
        JSON.stringify(this.eventQueue, null, 2),
        { mode: 0o600 },
      )
    } catch (error) {
      console.error('Failed to save telemetry queue:', error)
      logError(error)
    }
  }

  /**
   * Get session ID
   */
  static getSessionId(): string {
    return this.sessionId
  }

  /**
   * Set enabled state
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Check if enabled
   */
  static getEnabled(): boolean {
    return this.isEnabled
  }
}
