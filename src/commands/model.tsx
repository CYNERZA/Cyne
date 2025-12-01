import React from 'react'
import { render } from 'ink'
import { ModelSelector } from '../components/ModelSelector'
import { enableConfigs } from '../utils/config'

/**
 * Alternative implementation of model configuration functionality  
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerModelConfigurationCommandSettings {
  commandIdentifier: string
  commandDescription: string
  helpText: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  commandType: 'local-jsx'
  enableConfigurationFeatures: boolean
  abortOnStart: boolean
  showDetailedModelInfo: boolean
}

export interface CynerModelSelectionContext {
  currentModelProvider?: string
  currentModelName?: string
  availableModels?: string[]
  configurationMode: 'interactive' | 'programmatic'
  abortController?: AbortController
  selectionCallback?: (result?: string) => void
}

export interface CynerModelConfigurationResult {
  wasConfigurationSuccessful: boolean
  selectedModelProvider?: string
  selectedModelName?: string
  userCancelledConfiguration: boolean
  configurationErrorDetails?: string
  configurationTimestamp: number
}

/**
 * Enhanced model configuration settings manager
 */
export class CynerModelConfigurationSettingsManager {
  private settings: CynerModelConfigurationCommandSettings

  constructor(customSettings?: Partial<CynerModelConfigurationCommandSettings>) {
    this.settings = {
      commandIdentifier: 'model',
      commandDescription: 'Change your AI provider and model settings',
      helpText: 'Change your AI provider and model settings',
      isCommandEnabled: true,
      isCommandHidden: false,
      commandType: 'local-jsx',
      enableConfigurationFeatures: true,
      abortOnStart: true,
      showDetailedModelInfo: false,
      ...customSettings
    }
  }

  public getConfigurationSettings(): CynerModelConfigurationCommandSettings {
    return { ...this.settings }
  }

  public updateConfigurationSettings(updates: Partial<CynerModelConfigurationCommandSettings>): void {
    this.settings = { ...this.settings, ...updates }
  }

  public getCommandIdentifier(): string {
    return this.settings.commandIdentifier
  }

  public getCommandDescription(): string {
    return this.settings.commandDescription
  }

  public getHelpText(): string {
    return this.settings.helpText
  }

  public isCommandEnabled(): boolean {
    return this.settings.isCommandEnabled
  }

  public isCommandHidden(): boolean {
    return this.settings.isCommandHidden
  }

  public getCommandType(): 'local-jsx' {
    return this.settings.commandType
  }

  public shouldAbortOnStart(): boolean {
    return this.settings.abortOnStart
  }

  public areConfigurationFeaturesEnabled(): boolean {
    return this.settings.enableConfigurationFeatures
  }

  public validateSettingsConfiguration(): boolean {
    const settings = this.settings
    return !!(
      settings.commandIdentifier &&
      typeof settings.commandIdentifier === 'string' &&
      settings.commandDescription &&
      typeof settings.commandDescription === 'string' &&
      settings.helpText &&
      typeof settings.helpText === 'string' &&
      settings.commandType === 'local-jsx'
    )
  }
}

/**
 * Enhanced model selection context processor
 */
export class CynerModelSelectionContextProcessor {
  private settingsManager: CynerModelConfigurationSettingsManager

  constructor(settingsManager: CynerModelConfigurationSettingsManager) {
    this.settingsManager = settingsManager
  }

  /**
   * Prepare model selection context with enhanced configuration
   */
  public prepareModelSelectionContext(
    onDone: (result?: string) => void,
    options: { abortController?: AbortController }
  ): CynerModelSelectionContext {
    return {
      configurationMode: 'interactive',
      abortController: options.abortController,
      selectionCallback: onDone,
      // Additional context would be populated from actual model state
      currentModelProvider: undefined,
      currentModelName: undefined,
      availableModels: []
    }
  }

  /**
   * Process configuration initialization with enhanced features
   */
  public processConfigurationInitialization(context: CynerModelSelectionContext): void {
    // Enable configuration features if required
    if (this.settingsManager.areConfigurationFeaturesEnabled()) {
      enableConfigs()
    }

    // Handle abort controller if configured
    if (this.settingsManager.shouldAbortOnStart() && context.abortController) {
      context.abortController.abort?.()
    }
  }

  /**
   * Generate model selection component with enhanced context
   */
  public generateModelSelectionComponent(context: CynerModelSelectionContext): React.ReactNode {
    return (
      <ModelSelector
        onDone={() => {
          context.selectionCallback?.()
        }}
      />
    )
  }

  public getContextStatistics(): {
    configurationEnabled: boolean
    abortOnStartEnabled: boolean
    interactiveMode: boolean
  } {
    return {
      configurationEnabled: this.settingsManager.areConfigurationFeaturesEnabled(),
      abortOnStartEnabled: this.settingsManager.shouldAbortOnStart(),
      interactiveMode: true
    }
  }
}

/**
 * Enhanced model configuration command service
 */
export class CynerModelConfigurationCommandService {
  private settingsManager: CynerModelConfigurationSettingsManager
  private contextProcessor: CynerModelSelectionContextProcessor

  constructor(
    settingsManager?: CynerModelConfigurationSettingsManager,
    contextProcessor?: CynerModelSelectionContextProcessor
  ) {
    this.settingsManager = settingsManager || new CynerModelConfigurationSettingsManager()
    this.contextProcessor = contextProcessor || new CynerModelSelectionContextProcessor(this.settingsManager)
  }

  /**
   * Execute enhanced model configuration command
   */
  public async executeModelConfigurationCommand(
    onDone: (result?: string) => void,
    options: { abortController?: AbortController }
  ): Promise<React.ReactNode> {
    try {
      // Prepare selection context
      const selectionContext = this.contextProcessor.prepareModelSelectionContext(onDone, options)

      // Process configuration initialization
      this.contextProcessor.processConfigurationInitialization(selectionContext)

      // Generate and return model selection component
      return this.contextProcessor.generateModelSelectionComponent(selectionContext)
    } catch (error) {
      console.error('Model configuration command failed:', error)
      // Return error component in case of failure
      return <div>Error: Failed to load model configuration ({String(error)})</div>
    }
  }

  public getConfigurationStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    configurationFeaturesEnabled: boolean
    abortOnStartEnabled: boolean
  } {
    const settings = this.settingsManager.getConfigurationSettings()
    return {
      commandEnabled: settings.isCommandEnabled,
      commandVisible: !settings.isCommandHidden,
      configurationFeaturesEnabled: settings.enableConfigurationFeatures,
      abortOnStartEnabled: settings.abortOnStart
    }
  }

  public getSettingsManager(): CynerModelConfigurationSettingsManager {
    return this.settingsManager
  }

  public getContextProcessor(): CynerModelSelectionContextProcessor {
    return this.contextProcessor
  }
}

// Create default instances for backward compatibility
const defaultSettingsManager = new CynerModelConfigurationSettingsManager()
const defaultContextProcessor = new CynerModelSelectionContextProcessor(defaultSettingsManager)
const defaultModelConfigurationService = new CynerModelConfigurationCommandService(
  defaultSettingsManager,
  defaultContextProcessor
)

// Export enhanced properties maintaining exact same interface
export const help = defaultSettingsManager.getHelpText()
export const description = defaultSettingsManager.getCommandDescription()
export const isEnabled = defaultSettingsManager.isCommandEnabled()
export const isHidden = defaultSettingsManager.isCommandHidden()
export const name = defaultSettingsManager.getCommandIdentifier()
export const type = defaultSettingsManager.getCommandType()

export function userFacingName(): string {
  return defaultSettingsManager.getCommandIdentifier()
}

export async function call(
  onDone: (result?: string) => void,
  { abortController }: { abortController?: AbortController },
): Promise<React.ReactNode> {
  return await defaultModelConfigurationService.executeModelConfigurationCommand(onDone, { abortController })
}
