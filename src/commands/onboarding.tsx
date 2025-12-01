import * as React from 'react'
import type { Command } from '../commands'
import { Onboarding } from '../components/Onboarding'
import { clearTerminal } from '../utils/terminal'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config'
import { clearConversation } from './clear'

/**
 * Alternative implementation of onboarding flow functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerOnboardingFlowConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  commandType: 'local-jsx'
  clearTerminalOnStart: boolean
  setDefaultTheme: boolean
  defaultThemeName: string
  clearConversationOnComplete: boolean
  enableProgressTracking: boolean
}

export interface CynerOnboardingFlowContext {
  currentStep?: number
  totalSteps?: number
  userConfiguration?: any
  completionCallback?: () => void
  commandContext?: any
  onboardingStartTime: number
  userPreferences?: {
    theme?: string
    language?: string
    provider?: string
  }
}

export interface CynerOnboardingFlowResult {
  wasOnboardingCompleted: boolean
  onboardingDuration: number
  userConfigurationUpdated: boolean
  conversationCleared: boolean
  errorDetails?: string
  completionTimestamp: number
}

/**
 * Enhanced onboarding flow configuration manager
 */
export class CynerOnboardingFlowConfigurationManager {
  private configuration: CynerOnboardingFlowConfiguration

  constructor(customConfiguration?: Partial<CynerOnboardingFlowConfiguration>) {
    this.configuration = {
      commandIdentifier: 'onboarding',
      commandDescription: 'Run through the onboarding flow',
      isCommandEnabled: true,
      isCommandHidden: false,
      commandType: 'local-jsx',
      clearTerminalOnStart: true,
      setDefaultTheme: true,
      defaultThemeName: 'dark',
      clearConversationOnComplete: true,
      enableProgressTracking: false,
      ...customConfiguration
    }
  }

  public getFlowConfiguration(): CynerOnboardingFlowConfiguration {
    return { ...this.configuration }
  }

  public updateFlowConfiguration(updates: Partial<CynerOnboardingFlowConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public getCommandIdentifier(): string {
    return this.configuration.commandIdentifier
  }

  public getCommandDescription(): string {
    return this.configuration.commandDescription
  }

  public isCommandEnabled(): boolean {
    return this.configuration.isCommandEnabled
  }

  public isCommandHidden(): boolean {
    return this.configuration.isCommandHidden
  }

  public getCommandType(): 'local-jsx' {
    return this.configuration.commandType
  }

  public shouldClearTerminalOnStart(): boolean {
    return this.configuration.clearTerminalOnStart
  }

  public shouldSetDefaultTheme(): boolean {
    return this.configuration.setDefaultTheme
  }

  public getDefaultThemeName(): string {
    return this.configuration.defaultThemeName
  }

  public shouldClearConversationOnComplete(): boolean {
    return this.configuration.clearConversationOnComplete
  }

  public isProgressTrackingEnabled(): boolean {
    return this.configuration.enableProgressTracking
  }

  public validateFlowConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.commandType === 'local-jsx' &&
      config.defaultThemeName &&
      typeof config.defaultThemeName === 'string'
    )
  }
}

/**
 * Enhanced onboarding environment setup processor
 */
export class CynerOnboardingEnvironmentSetupProcessor {
  private configurationManager: CynerOnboardingFlowConfigurationManager

  constructor(configurationManager: CynerOnboardingFlowConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process onboarding environment initialization with enhanced setup
   */
  public async processOnboardingEnvironmentInitialization(): Promise<void> {
    try {
      // Clear terminal if configured
      if (this.configurationManager.shouldClearTerminalOnStart()) {
        await clearTerminal()
      }

      // Configure default theme if enabled
      if (this.configurationManager.shouldSetDefaultTheme()) {
        await this.configureDefaultThemeSettings()
      }
    } catch (error) {
      console.error('Onboarding environment setup failed:', error)
      throw new Error(`Failed to initialize onboarding environment: ${error}`)
    }
  }

  private async configureDefaultThemeSettings(): Promise<void> {
    try {
      const currentConfiguration = getGlobalConfig()
      const themeName = this.configurationManager.getDefaultThemeName() as any // Theme configuration
      const updatedConfiguration = {
        ...currentConfiguration,
        theme: themeName,
      }
      
      saveGlobalConfig(updatedConfiguration)
    } catch (error) {
      console.error('Theme configuration failed:', error)
      throw new Error(`Failed to configure default theme: ${error}`)
    }
  }

  /**
   * Prepare onboarding flow context with enhanced data
   */
  public prepareOnboardingFlowContext(
    onDone: () => void,
    commandContext: any
  ): CynerOnboardingFlowContext {
    return {
      currentStep: 1,
      totalSteps: 5, // Would be determined dynamically
      completionCallback: onDone,
      commandContext,
      onboardingStartTime: Date.now(),
      userPreferences: {
        theme: this.configurationManager.getDefaultThemeName()
      }
    }
  }

  /**
   * Generate onboarding completion handler with enhanced processing
   */
  public generateOnboardingCompletionHandler(context: CynerOnboardingFlowContext): () => Promise<void> {
    return async () => {
      try {
        // Clear conversation if configured
        if (this.configurationManager.shouldClearConversationOnComplete() && context.commandContext) {
          clearConversation(context.commandContext)
        }

        // Execute completion callback
        context.completionCallback?.()
      } catch (error) {
        console.error('Onboarding completion processing failed:', error)
        // Still call completion callback even if cleanup fails
        context.completionCallback?.()
      }
    }
  }

  public getEnvironmentStatistics(): {
    terminalClearingEnabled: boolean
    defaultThemeConfigured: boolean
    conversationClearingEnabled: boolean
    progressTrackingEnabled: boolean
  } {
    return {
      terminalClearingEnabled: this.configurationManager.shouldClearTerminalOnStart(),
      defaultThemeConfigured: this.configurationManager.shouldSetDefaultTheme(),
      conversationClearingEnabled: this.configurationManager.shouldClearConversationOnComplete(),
      progressTrackingEnabled: this.configurationManager.isProgressTrackingEnabled()
    }
  }
}

/**
 * Enhanced onboarding flow orchestration service
 */
export class CynerOnboardingFlowOrchestrationService {
  private configurationManager: CynerOnboardingFlowConfigurationManager
  private environmentProcessor: CynerOnboardingEnvironmentSetupProcessor

  constructor(
    configurationManager?: CynerOnboardingFlowConfigurationManager,
    environmentProcessor?: CynerOnboardingEnvironmentSetupProcessor
  ) {
    this.configurationManager = configurationManager || new CynerOnboardingFlowConfigurationManager()
    this.environmentProcessor = environmentProcessor || new CynerOnboardingEnvironmentSetupProcessor(this.configurationManager)
  }

  /**
   * Execute comprehensive onboarding flow orchestration
   */
  public async executeOnboardingFlowOrchestration(
    onDone: () => void,
    commandContext: any
  ): Promise<React.ReactNode> {
    try {
      // Initialize onboarding environment
      await this.environmentProcessor.processOnboardingEnvironmentInitialization()

      // Prepare flow context
      const flowContext = this.environmentProcessor.prepareOnboardingFlowContext(onDone, commandContext)

      // Generate completion handler
      const completionHandler = this.environmentProcessor.generateOnboardingCompletionHandler(flowContext)

      // Return onboarding component with enhanced context
      return (
        <Onboarding
          onDone={completionHandler}
        />
      )
    } catch (error) {
      console.error('Onboarding flow orchestration failed:', error)
      // Return error component in case of failure
      return <div>Error: Failed to start onboarding flow ({String(error)})</div>
    }
  }

  public getOrchestrationStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    environmentSetupEnabled: boolean
    flowTrackingEnabled: boolean
  } {
    const config = this.configurationManager.getFlowConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      environmentSetupEnabled: config.clearTerminalOnStart || config.setDefaultTheme,
      flowTrackingEnabled: config.enableProgressTracking
    }
  }

  public getConfigurationManager(): CynerOnboardingFlowConfigurationManager {
    return this.configurationManager
  }

  public getEnvironmentProcessor(): CynerOnboardingEnvironmentSetupProcessor {
    return this.environmentProcessor
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerOnboardingFlowConfigurationManager()
const defaultEnvironmentProcessor = new CynerOnboardingEnvironmentSetupProcessor(defaultConfigurationManager)
const defaultOnboardingOrchestrationService = new CynerOnboardingFlowOrchestrationService(
  defaultConfigurationManager,
  defaultEnvironmentProcessor
)

/**
 * Enhanced onboarding command with restructured implementation
 */
const cynerOnboardingFlowCommand = {
  type: defaultConfigurationManager.getCommandType(),
  name: defaultConfigurationManager.getCommandIdentifier(),
  description: defaultConfigurationManager.getCommandDescription(),
  isEnabled: defaultConfigurationManager.isCommandEnabled(),
  isHidden: defaultConfigurationManager.isCommandHidden(),
  
  async call(onDone: () => void, context: any): Promise<React.ReactNode> {
    return await defaultOnboardingOrchestrationService.executeOnboardingFlowOrchestration(onDone, context)
  },
  
  userFacingName(): string {
    return defaultConfigurationManager.getCommandIdentifier()
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerOnboardingFlowCommand
