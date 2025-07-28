import { Command } from '../commands'
import { getMessagesSetter } from '../messages'
import { getContext } from '../context'
import { getCodeStyle } from '../utils/style'
import { clearTerminal } from '../utils/terminal'
import { getOriginalCwd, setCwd } from '../utils/state'
import { Message } from '../query'

/**
 * Alternative implementation of conversation clearing functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerConversationClearingContext {
  setForkConvoWithMessagesOnTheNextRender: (forkConvoWithMessages: Message[]) => void
  additionalMetadata?: {
    clearingTimestamp?: number
    sessionId?: string
    clearingReason?: string
  }
}

export interface CynerConversationClearingConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  shouldClearTerminal: boolean
  shouldResetWorkingDirectory: boolean
  shouldClearCaches: boolean
}

/**
 * Enhanced conversation clearing service with comprehensive cleanup
 */
export class CynerConversationClearingService {
  private configuration: CynerConversationClearingConfiguration

  constructor(customConfiguration?: Partial<CynerConversationClearingConfiguration>) {
    this.configuration = {
      commandIdentifier: 'clear',
      commandDescription: 'Clear conversation history and free up context',
      isCommandEnabled: true,
      isCommandHidden: false,
      shouldClearTerminal: true,
      shouldResetWorkingDirectory: true,
      shouldClearCaches: true,
      ...customConfiguration
    }
  }

  public getServiceConfiguration(): CynerConversationClearingConfiguration {
    return { ...this.configuration }
  }

  public updateServiceConfiguration(updates: Partial<CynerConversationClearingConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  /**
   * Enhanced conversation clearing with comprehensive cleanup and logging
   */
  public async executeConversationClearingProcess(context: CynerConversationClearingContext): Promise<void> {
    const clearingMetadata = {
      ...context.additionalMetadata,
      clearingTimestamp: Date.now(),
      operationId: `clear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    try {
      // Step 1: Clear terminal if configured
      if (this.configuration.shouldClearTerminal) {
        await clearTerminal()
      }

      // Step 2: Clear message history
      const messagesSetter = getMessagesSetter()
      messagesSetter([])

      // Step 3: Clear fork conversation context
      context.setForkConvoWithMessagesOnTheNextRender([])

      // Step 4: Clear caches if configured
      if (this.configuration.shouldClearCaches) {
        this.executeCacheClearing()
      }

      // Step 5: Reset working directory if configured
      if (this.configuration.shouldResetWorkingDirectory) {
        await this.executeWorkingDirectoryReset()
      }

      // Log successful completion
      console.debug('Conversation clearing completed successfully', clearingMetadata)
    } catch (error) {
      console.error('Conversation clearing failed:', error, clearingMetadata)
      throw new Error(`Failed to clear conversation: ${error}`)
    }
  }

  private executeCacheClearing(): void {
    try {
      const contextCache = getContext.cache
      const codeStyleCache = getCodeStyle.cache

      if (contextCache?.clear) {
        contextCache.clear()
      }

      if (codeStyleCache?.clear) {
        codeStyleCache.clear()
      }
    } catch (error) {
      console.warn('Cache clearing encountered issues:', error)
    }
  }

  private async executeWorkingDirectoryReset(): Promise<void> {
    try {
      const originalCwd = getOriginalCwd()
      await setCwd(originalCwd)
    } catch (error) {
      console.warn('Working directory reset encountered issues:', error)
    }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validateServiceConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string'
    )
  }

  /**
   * Get clearing operation statistics
   */
  public getClearingStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    clearingCapabilities: {
      terminal: boolean
      caches: boolean
      workingDirectory: boolean
    }
  } {
    return {
      commandEnabled: this.configuration.isCommandEnabled,
      commandVisible: !this.configuration.isCommandHidden,
      clearingCapabilities: {
        terminal: this.configuration.shouldClearTerminal,
        caches: this.configuration.shouldClearCaches,
        workingDirectory: this.configuration.shouldResetWorkingDirectory
      }
    }
  }
}

// Create default service instance
const defaultConversationClearingService = new CynerConversationClearingService()

/**
 * Legacy compatibility function - maintains exact same behavior
 */
export async function clearConversation(context: {
  setForkConvoWithMessagesOnTheNextRender: (forkConvoWithMessages: Message[]) => void
}): Promise<void> {
  const clearingContext: CynerConversationClearingContext = {
    setForkConvoWithMessagesOnTheNextRender: context.setForkConvoWithMessagesOnTheNextRender,
    additionalMetadata: {
      clearingTimestamp: Date.now(),
      clearingReason: 'legacy_api_call'
    }
  }

  await defaultConversationClearingService.executeConversationClearingProcess(clearingContext)
}

/**
 * Enhanced clear command with restructured implementation
 */
const cynerConversationClearingCommand = {
  type: 'local' as const,
  name: defaultConversationClearingService.getServiceConfiguration().commandIdentifier,
  description: defaultConversationClearingService.getServiceConfiguration().commandDescription,
  isEnabled: defaultConversationClearingService.getServiceConfiguration().isCommandEnabled,
  isHidden: defaultConversationClearingService.getServiceConfiguration().isCommandHidden,
  
  async call(_: string, context: { setForkConvoWithMessagesOnTheNextRender: (forkConvoWithMessages: Message[]) => void }): Promise<string> {
    const clearingContext: CynerConversationClearingContext = {
      setForkConvoWithMessagesOnTheNextRender: context.setForkConvoWithMessagesOnTheNextRender,
      additionalMetadata: {
        clearingTimestamp: Date.now(),
        clearingReason: 'command_execution'
      }
    }

    await defaultConversationClearingService.executeConversationClearingProcess(clearingContext)
    return ''
  },
  
  userFacingName(): string {
    return defaultConversationClearingService.generateUserFacingCommandName()
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerConversationClearingCommand
