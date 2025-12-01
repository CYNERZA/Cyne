import { Command } from '../commands'
import { Bug } from '../components/Bug'
import * as React from 'react'
import { PRODUCT_NAME } from '../constants/product'

/**
 * Alternative implementation of bug reporting command
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerBugReportingConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  productName: string
}

export interface CynerBugReportingContext {
  onCompletionCallback: (result?: string) => void
  reportingMetadata?: {
    sessionId?: string
    timestamp?: number
    userAgent?: string
  }
}

/**
 * Enhanced bug reporting command manager
 */
export class CynerBugReportingCommandManager {
  private configuration: CynerBugReportingConfiguration

  constructor(customConfiguration?: Partial<CynerBugReportingConfiguration>) {
    this.configuration = {
      commandIdentifier: 'bug',
      commandDescription: `Submit feedback about ${PRODUCT_NAME}`,
      isCommandEnabled: true,
      isCommandHidden: false,
      productName: PRODUCT_NAME,
      ...customConfiguration
    }
  }

  public getCommandConfiguration(): CynerBugReportingConfiguration {
    return { ...this.configuration }
  }

  public updateCommandConfiguration(updates: Partial<CynerBugReportingConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public async executeBugReportingFlow(context: CynerBugReportingContext): Promise<React.ReactNode> {
    // Enhanced logging and metadata tracking
    const executionMetadata = {
      ...context.reportingMetadata,
      executionTimestamp: Date.now(),
      commandId: this.configuration.commandIdentifier
    }

    try {
      // Create Bug component with original interface
      return <Bug onDone={context.onCompletionCallback} />
    } catch (error) {
      console.error('Bug reporting flow execution failed:', error)
      throw new Error(`Failed to execute bug reporting flow: ${error}`)
    }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validateCommandConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string'
    )
  }
}

/**
 * Enhanced bug reporting service with additional utilities
 */
export class CynerBugReportingService {
  private commandManager: CynerBugReportingCommandManager

  constructor(commandManager?: CynerBugReportingCommandManager) {
    this.commandManager = commandManager || new CynerBugReportingCommandManager()
  }

  public async initiateBugReportingProcess(
    completionCallback: (result?: string) => void,
    additionalContext?: any
  ): Promise<React.ReactNode> {
    const reportingContext: CynerBugReportingContext = {
      onCompletionCallback: completionCallback,
      reportingMetadata: {
        sessionId: `bug_session_${Date.now()}`,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'CLI'
      }
    }

    return await this.commandManager.executeBugReportingFlow(reportingContext)
  }

  public getBugReportingStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    lastExecutionTime?: number
  } {
    const config = this.commandManager.getCommandConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      lastExecutionTime: Date.now() // Would track real execution time in production
    }
  }
}

// Create default instances for backward compatibility
const defaultBugReportingManager = new CynerBugReportingCommandManager()
const defaultBugReportingService = new CynerBugReportingService(defaultBugReportingManager)

/**
 * Legacy command structure - maintains exact same API and behavior
 */
const cynerBugReportingCommand = {
  type: 'local-jsx' as const,
  name: defaultBugReportingManager.getCommandConfiguration().commandIdentifier,
  description: defaultBugReportingManager.getCommandConfiguration().commandDescription,
  isEnabled: defaultBugReportingManager.getCommandConfiguration().isCommandEnabled,
  isHidden: defaultBugReportingManager.getCommandConfiguration().isCommandHidden,
  
  async call(onDone: (result?: string) => void): Promise<React.ReactNode> {
    return await defaultBugReportingService.initiateBugReportingProcess(onDone)
  },
  
  userFacingName(): string {
    return defaultBugReportingManager.generateUserFacingCommandName()
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerBugReportingCommand
