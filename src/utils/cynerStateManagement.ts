/**
 * Alternative Implementation: Cyne State Management Utilities
 * This module demonstrates alternative patterns for state management
 * while preserving the same functionality as the original implementations
 */

/**
 * Alternative Implementation: Application State Manager
 * Different approach to managing application-wide state
 */
export class CynerApplicationStateManager {
  private static instance: CynerApplicationStateManager
  private applicationState: Map<string, any> = new Map()
  private stateSubscribers: Map<string, ((value: any) => void)[]> = new Map()

  private constructor() {}

  static getInstance(): CynerApplicationStateManager {
    if (!CynerApplicationStateManager.instance) {
      CynerApplicationStateManager.instance = new CynerApplicationStateManager()
    }
    return CynerApplicationStateManager.instance
  }

  setApplicationState<T>(key: string, value: T): void {
    this.applicationState.set(key, value)
    this.notifySubscribers(key, value)
  }

  getApplicationState<T>(key: string): T | undefined {
    return this.applicationState.get(key)
  }

  subscribeToState<T>(key: string, callback: (value: T) => void): () => void {
    if (!this.stateSubscribers.has(key)) {
      this.stateSubscribers.set(key, [])
    }
    this.stateSubscribers.get(key)!.push(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = this.stateSubscribers.get(key)
      if (subscribers) {
        const index = subscribers.indexOf(callback)
        if (index > -1) {
          subscribers.splice(index, 1)
        }
      }
    }
  }

  private notifySubscribers(key: string, value: any): void {
    const subscribers = this.stateSubscribers.get(key)
    if (subscribers) {
      subscribers.forEach(callback => callback(value))
    }
  }

  clearApplicationState(): void {
    this.applicationState.clear()
    this.stateSubscribers.clear()
  }
}

/**
 * Alternative Implementation: Session Data Manager
 * Different approach to managing session-specific data
 */
export class CynerSessionDataManager {
  private sessionData: Map<string, any> = new Map()
  private sessionId: string
  private startTime: Date

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId()
    this.startTime = new Date()
  }

  private generateSessionId(): string {
    return `cyner_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setSessionData<T>(key: string, value: T): void {
    this.sessionData.set(key, value)
  }

  getSessionData<T>(key: string): T | undefined {
    return this.sessionData.get(key)
  }

  getSessionId(): string {
    return this.sessionId
  }

  getSessionDuration(): number {
    return Date.now() - this.startTime.getTime()
  }

  getSessionStartTime(): Date {
    return this.startTime
  }

  clearSessionData(): void {
    this.sessionData.clear()
  }

  exportSessionData(): Record<string, any> {
    return Object.fromEntries(this.sessionData)
  }
}

/**
 * Alternative Implementation: Message State Tracker
 * Different approach to tracking message states and interactions
 */
export class CynerMessageStateTracker {
  private messageStates: Map<string, CynerMessageState> = new Map()
  private toolUseStates: Map<string, CynerToolUseState> = new Map()

  setMessageState(messageId: string, state: CynerMessageState): void {
    this.messageStates.set(messageId, state)
  }

  getMessageState(messageId: string): CynerMessageState | undefined {
    return this.messageStates.get(messageId)
  }

  setToolUseState(toolUseId: string, state: CynerToolUseState): void {
    this.toolUseStates.set(toolUseId, state)
  }

  getToolUseState(toolUseId: string): CynerToolUseState | undefined {
    return this.toolUseStates.get(toolUseId)
  }

  getMessagesInState(state: CynerMessageState): string[] {
    return Array.from(this.messageStates.entries())
      .filter(([_, messageState]) => messageState === state)
      .map(([messageId, _]) => messageId)
  }

  getToolUsesInState(state: CynerToolUseState): string[] {
    return Array.from(this.toolUseStates.entries())
      .filter(([_, toolUseState]) => toolUseState === state)
      .map(([toolUseId, _]) => toolUseId)
  }

  clearStates(): void {
    this.messageStates.clear()
    this.toolUseStates.clear()
  }
}

/**
 * Alternative Implementation: State Enums
 * Enhanced state definitions with clear naming
 */
export enum CynerMessageState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export enum CynerToolUseState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error',
  REJECTED = 'rejected',
  UNRESOLVED = 'unresolved'
}

/**
 * Alternative Implementation: Configuration Manager
 * Different approach to configuration management
 */
export class CynerConfigurationManager {
  private static instance: CynerConfigurationManager
  private configCache: Map<string, any> = new Map()
  private configDefaults: Map<string, any> = new Map()

  private constructor() {
    this.initializeDefaults()
  }

  static getInstance(): CynerConfigurationManager {
    if (!CynerConfigurationManager.instance) {
      CynerConfigurationManager.instance = new CynerConfigurationManager()
    }
    return CynerConfigurationManager.instance
  }

  private initializeDefaults(): void {
    this.configDefaults.set('theme', 'dark')
    this.configDefaults.set('verbose', false)
    this.configDefaults.set('debug', false)
    this.configDefaults.set('autoUpdate', true)
  }

  setConfiguration<T>(key: string, value: T): void {
    this.configCache.set(key, value)
  }

  getConfiguration<T>(key: string): T {
    return this.configCache.get(key) ?? this.configDefaults.get(key)
  }

  hasConfiguration(key: string): boolean {
    return this.configCache.has(key) || this.configDefaults.has(key)
  }

  removeConfiguration(key: string): void {
    this.configCache.delete(key)
  }

  getAllConfigurations(): Record<string, any> {
    const result: Record<string, any> = {}
    
    // Add defaults first
    for (const [key, value] of this.configDefaults) {
      result[key] = value
    }
    
    // Override with cached values
    for (const [key, value] of this.configCache) {
      result[key] = value
    }
    
    return result
  }

  resetToDefaults(): void {
    this.configCache.clear()
  }
}

/**
 * Alternative Implementation: Event Manager
 * Different approach to event handling and notification
 */
export class CynerEventManager {
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map()
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = []

  addEventListener(event: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  emitEvent(event: string, data?: any): void {
    // Record event in history
    this.eventHistory.push({ event, data, timestamp: new Date() })

    // Notify listeners
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event)
    } else {
      this.eventListeners.clear()
    }
  }

  getEventHistory(): Array<{ event: string; data: any; timestamp: Date }> {
    return [...this.eventHistory]
  }

  clearEventHistory(): void {
    this.eventHistory = []
  }
}
